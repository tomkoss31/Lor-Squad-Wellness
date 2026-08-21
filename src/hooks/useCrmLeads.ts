// =============================================================================
// useCrmLeads — pipeline CRM unifié (VIP-4 2026-06-10, décision Thomas :
// « un pipeline pour tous, juste avoir l'info d'où ça vient »).
//
// Agrège les 4 tables de capture :
//   - online_bilans              (funnel bilan online → kanban Leads existant)
//   - prospect_leads             (welcome / opportunité / simulateur / business /
//                                 page publique Club VIP / recos PWA routées)
//   - client_referrals           (recos clients PWA historiques — legacy)
//   - client_referral_intentions (prénoms saisis dans le sandbox VIP — pas de
//     contact direct, MAIS le parrain est un client connu : l'action CRM est
//     « demander le contact au parrain » via son téléphone. Upgrade V1.1
//     2026-06-10, demande Thomas.)
//
// Statut normalisé : new → contacted → qualified → converted / lost.
// Le write-back traduit vers les valeurs natives de chaque table. RLS fait
// le filtrage par coach (admin voit tout sur prospect_leads/online_bilans/
// intentions, chaque coach voit ses client_referrals et les intentions de
// SES clients).
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PostgrestError } from "@supabase/supabase-js";
import { getSupabaseClient } from "../services/supabaseClient";
import { ecritureFor, type CleReponse, type Reponse } from "../features/crm/qualification";
import { ecrireQualification, estQualifiable, statutPour } from "../features/crm/ecrireQualification";
import { nomPropre } from "../features/crm/nomPropre";
import { ecrireCacheEcran, lireCacheEcran } from "../lib/cacheEcran";
// Le vocabulaire de provenance a UNE source (src/types/domain.ts) : le tunnel,
// les deux bilans et cet écran en dérivent tous. Deux listes recopiées, ce sont
// deux comptages qui ne se recoupent jamais.
import { provenanceDesigneQuelquun, type ProvenanceCanalTunnel } from "../types/domain";

export type CrmStatus = "new" | "contacted" | "qualified" | "converted" | "lost";
export type CrmTable =
  | "online_bilans"
  | "prospect_leads"
  | "client_referrals"
  | "client_referral_intentions";
export type CrmSource =
  | "bilan-online"
  | "vip"
  | "reco-client"
  | "intention"
  | "opportunite"
  | "simulateur"
  | "business"
  | "welcome"
  | "colis"
  /** Tunnel « Réserver au club » (/reserver). 4 leads en base au 2026-08-11,
   *  tous affichés « Site web » faute d'exister ici. */
  | "site-club"
  /** Filet : une source qu'on ne connaît pas s'affiche telle quelle plutôt que
   *  de se déguiser en autre chose. Cf. `sourceRaw`. */
  | "inconnue";

/**
 * Le rendez-vous apparié à un lead (table `rdv_bookings`).
 *
 * Il est apparié par contact ou par prénom, donc c'est un LIEN PROBABLE, pas
 * une clé étrangère : on s'en sert pour dire et pour agir sur un rendez-vous
 * qu'on affiche, jamais pour écrire quelque chose sur le lead lui-même.
 */
export interface RdvLie {
  id: string;
  slotStart: string;
  slotEnd: string | null;
  clubId: string | null;
  coachUserId: string | null;
  /** Le créneau est derrière nous — l'écran ne doit plus proposer d'y aller. */
  passe: boolean;
  label: string;
}

export interface CrmLead {
  key: string;
  table: CrmTable;
  id: string;
  firstName: string;
  /** Téléphone, email ou handle — tel que saisi. */
  contact: string | null;
  contactIsPhone: boolean;
  city: string | null;
  source: CrmSource;
  status: CrmStatus;
  /** « via Marie D. » pour les recos clients. */
  viaName: string | null;
  /** Téléphone du client parrain (intentions : action « demander le contact »). */
  parrainPhone: string | null;
  /** Id client du parrain (recos + intentions) — pour la push de gratification
      à la conversion (wagon 2 chantier 5). */
  parrainClientId: string | null;
  /** Info complémentaire courte (ex. relation famille/travail pour intentions). */
  extra: string | null;
  /** Propriétaire du lead (distributeur/coach) — pour le filtre par ligne.
      online_bilans.coach_user_id · prospect_leads.referrer_user_id ·
      referrals/intentions → distributeur du client parrain. Null = non attribué. */
  ownerUserId: string | null;
  /** Relance échue et pas encore faite — le 🔔 de la liste. */
  relanceDue: boolean;
  /** Quand cette personne doit revenir dans la file. Posé par la feuille
   *  « Et alors ? » (src/features/crm/qualification.ts), jamais saisi à la
   *  main. `null` = aucune suite prévue — ce qui veut dire « à traiter
   *  aujourd'hui », pas « plus tard » (cf. echeances.ts). */
  relanceDueAt: string | null;
  /** Ce qui s'est passé au dernier appel — c'est ce qu'on lit sous son nom,
   *  et ce qui choisit l'angle du message de 2e tentative. */
  derniereReponse: CleReponse | null;
  /** Lead « endormi » (archivé) — sorti du flux actif, zéro relance. */
  dormant?: boolean;
  /** Token de la page premium « Résultat Bilan » (online_bilans uniquement). */
  resultToken: string | null;
  /** Le lead a cliqué « Fais-toi rappeler » sur sa page Résultat Bilan
      (online_bilans.callback_requested_at). Signal fort : il attend un appel.
      Null = pas de demande. Surfacé en badge dans la liste + le détail. */
  callbackRequestedAt: string | null;
  /** Score d'engagement au clic « rappelle-moi » (online_bilans.engagement) :
      { score, tier chaud/tiede/froid, signals[] }. Aide à prioriser la relance.
      Null si pas de demande / lead d'avant la feature (online_bilans only). */
  engagement: { score: number; tier: string; signals: string[] } | null;
  createdAt: string;
  /** Dernier contact confirmé (colonne contacted_at) — null si jamais contacté
   *  OU si la table n'a pas cette colonne (client_referrals, confirmé en DB
   *  2026-07-16). Sert de proxy « dernière activité » pour le badge de
   *  stagnation (Phase 3) : contactedAt ?? createdAt. */
  contactedAt: string | null;
  notes: string | null;
  /** Réponses du questionnaire funnel Opportunité (prospect_leads.metadata.answers)
   *  → affichées dans la carte CRM. Null si le lead n'a pas de funnel. */
  /** La valeur brute de `prospect_leads.source`, pour l'afficher telle quelle
   *  quand on ne la reconnaît pas. */
  sourceRaw?: string | null;
  /** Ce que la personne a écrit dans le tunnel « Réserver au club » et qui
   *  n'était affiché NULLE PART — alors que le mail de réservation, lui, le
   *  contient (audit 2026-08-11). */
  lastName?: string | null;
  objectif?: string | null;
  peopleCount?: number | null;
  partnerName?: string | null;
  partnerObjectif?: string | null;
  coachSlug?: string | null;
  /** `false` = la personne n'a coché aucune case de recontact. À savoir AVANT
   *  de décrocher son téléphone. */
  consentRecontact?: boolean | null;
  /** Un lead du tunnel club qui n'est jamais allé jusqu'au créneau. C'est le
   *  signal le plus fort du CRM : il a laissé son numéro puis il est parti. */
  abandonAvantCreneau?: boolean;
  /** Le créneau réservé, s'il en a un. Libellé prêt à afficher. */
  rdvLabel?: string | null;
  /** Le même rendez-vous, en entier : de quoi le déplacer, l'annuler, ou dire
   *  qu'il est déjà passé. Null quand aucun créneau n'a été apparié. */
  rdv?: RdvLie | null;
  funnelAnswers?: Record<string, string> | null;
  /** Réponses du funnel colis (question → réponse, déjà en libellés). */
  colisAnswers?: Record<string, string> | null;
  funnelScore?: number | null;
  funnelTemperature?: string | null;
  funnelProfile?: string | null;
  /** Résumé du bilan online (affiché inline sur la carte CRM, comme les
   *  réponses funnel). Le détail complet reste dans la modale « Détails ». */
  bilanObjectives?: string[] | null;
  bilanWeightTarget?: number | null;
  bilanMotivation?: number | null;
  bilanAge?: number | null;
  /** Provenance bilan online : slug du coach dont le lien a été utilisé
   *  (null = lien public générique). Affiché « via <coach> » / « lien public ». */
  bilanCoachSlug?: string | null;
  /**
   * Ce que la personne a répondu à « comment tu as connu le club ? », sous les
   * créneaux, juste avant de valider sa réservation (déplacé le 17/08 : posée
   * sur l'écran de confirmation, la question n'atteignait presque personne).
   *
   * ⚠️ C'est une MENTION, pas une attribution : `provenancePar` ne donne aucun
   * droit et ne change pas `ownerUserId`. Le lead reste au club.
   */
  provenanceCanal?: ProvenanceCanalTunnel | null;
  provenancePar?: string | null;
  /**
   * Le prénom TAPÉ À LA MAIN dans le tunnel, par la personne elle-même.
   *
   * Depuis le 17/08 c'est le SEUL endroit où un prénom cité peut atterrir :
   * `/reserver` ne propose plus de liste de coachs et n'envoie plus `p_qui`.
   * Il s'affiche donc exactement comme un prénom d'équipe — c'est la même
   * réponse à la même question, seule la façon de la saisir a changé.
   *
   * Exclusif de `provenancePar` : la base garantit qu'un seul des deux est
   * rempli, et `provenancePar` gagne quand les deux arrivent.
   *
   * ⚠️ Peut manquer sans que ce soit une absence de réponse : la colonne
   * n'existe en base qu'à partir de la migration `20261215100000`, et la
   * lecture se replie sans elle tant qu'elle n'est pas appliquée (cf.
   * `COLONNES_PROSPECTS`).
   */
  provenanceLibre?: string | null;
}

/**
 * Ce qu'on lit à l'écran pour chaque réponse.
 *
 * `Record` sur le type fermé et pas un objet libre : ajouter un canal au
 * vocabulaire sans lui donner de libellé ici devient une ERREUR DE COMPILATION,
 * et non un « undefined » découvert en prod sur la fiche d'un lead.
 */
export const PROVENANCE_META: Record<
  ProvenanceCanalTunnel,
  { emoji: string; label: string }
> = {
  flyer: { emoji: "📬", label: "Flyer" },
  parle: { emoji: "💬", label: "Bouche-à-oreille" },
  reseaux: { emoji: "📱", label: "Réseaux" },
  autre: { emoji: "✨", label: "Autrement" },
};

/** « 📬 Flyer de Mandy », ou `null` quand la personne n'a pas répondu. */
export function provenanceTexte(
  canal: CrmLead["provenanceCanal"],
  parNom: string | null | undefined,
): string | null {
  if (!canal) return null;
  const m = PROVENANCE_META[canal];
  if (!m) return null;
  // « de » n'a de sens que pour un flyer ou du bouche-à-oreille : personne ne
  // distribue Instagram. Règle partagée avec le tunnel et la RPC.
  if (parNom && provenanceDesigneQuelquun(canal)) {
    return `${m.emoji} ${m.label} de ${parNom}`;
  }
  return `${m.emoji} ${m.label}`;
}

/**
 * Le prénom à afficher, quelle que soit la façon dont il a été saisi.
 *
 * L'identifiant d'équipe gagne quand les deux arrivent — la RPC applique déjà
 * la même règle, donc en pratique ils ne coexistent jamais sur une fiche.
 *
 * ⚠️ AUCUNE MARQUE ne distingue les deux à l'écran, et c'est délibéré (retour
 * Thomas + Mélanie, 17/08). Une version du 16/08 affichait « · hors équipe » en
 * rouge sur tout prénom écrit à la main : depuis que le tunnel ne propose plus
 * de liste de coachs, c'est le cas de TOUS les prénoms venus de `/reserver`.
 * La marque ne distinguait donc plus rien, et affirmait une chose que le code
 * n'avait jamais vérifiée — « Flyer de Mélanie · hors équipe » alors que
 * Mélanie est l'une des deux personnes qui distribuent les flyers.
 *
 * Rapprocher le prénom des comptes de l'équipe ne sauverait pas la marque : à
 * deux coachs, une amie prénommée Thomas serait affichée comme le coach. Ce
 * que le coach doit savoir tient dans l'infobulle : c'est une MENTION, donnée
 * par la personne, jamais une attribution.
 */
export function prenomProvenance(
  parNomEquipe: string | null | undefined,
  libre: string | null | undefined,
): string | null {
  return (parNomEquipe?.trim() || null) ?? (libre?.trim() || null);
}

export const CRM_STATUS_META: Record<CrmStatus, { label: string; emoji: string; color: string }> = {
  new: { label: "Nouveaux", emoji: "🆕", color: "var(--ls-teal)" },
  contacted: { label: "Contactés", emoji: "💬", color: "var(--ls-teal)" },
  qualified: { label: "Qualifiés / RDV", emoji: "📅", color: "var(--ls-purple)" },
  converted: { label: "Convertis", emoji: "✅", color: "var(--ls-teal)" },
  lost: { label: "Perdus", emoji: "🌙", color: "var(--ls-text-muted)" },
};

export const CRM_SOURCE_META: Record<CrmSource, { label: string; emoji: string }> = {
  "bilan-online": { label: "Bilan online", emoji: "🌱" },
  vip: { label: "Club VIP", emoji: "👑" },
  "reco-client": { label: "Reco client", emoji: "🤝" },
  intention: { label: "Intention", emoji: "💭" },
  opportunite: { label: "Opportunité", emoji: "🚪" },
  simulateur: { label: "Simulateur", emoji: "✨" },
  business: { label: "Business", emoji: "💼" },
  welcome: { label: "Site web", emoji: "🌐" },
  colis: { label: "Colis", emoji: "🎁" },
  "site-club": { label: "Réserver au club", emoji: "🏠" },
  inconnue: { label: "Source inconnue", emoji: "❓" },
};

// Re-catégorisation manuelle (A, 2026-06-16) : sources éditables pour un lead
// prospect + mapping vers la valeur stockée en base (prospect_leads.source).
export const CRM_EDITABLE_SOURCES: CrmSource[] = ["welcome", "opportunite", "business", "vip", "simulateur", "reco-client"];
const CRM_SOURCE_TO_DB: Partial<Record<CrmSource, string>> = {
  welcome: "welcome_page",
  opportunite: "opportunite",
  business: "business",
  vip: "vip",
  simulateur: "simulateur",
  "reco-client": "reco-client",
};

/** Les objectifs du tunnel « Réserver au club ». Mêmes libellés que le mail de
 *  réservation (book-club-discovery), pour qu'un coach lise la même chose dans
 *  sa boîte et dans le CRM. Un code inconnu s'affiche tel quel. */
const OBJECTIF_LABELS: Record<string, string> = {
  poids: "⚖️ Perdre du poids",
  muscle: "💪 Reprendre du muscle",
  energie: "⚡ Retrouver de l'énergie",
};
export function objectifLabel(code: string | null | undefined): string {
  const c = (code ?? "").trim();
  if (!c) return "—";
  return OBJECTIF_LABELS[c] ?? c;
}
/** Version courte pour la ligne de liste : le libellé sans son emoji. */
export function objectifCourt(code: string | null | undefined): string {
  const l = objectifLabel(code);
  return l === "—" ? l : l.replace(/^\S+\s/u, "");
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  family: "famille",
  work: "travail",
  sport: "sport",
  friend: "ami·e",
  other: "connaissance",
};

function looksLikePhone(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.replace(/\D/g, "").length >= 6 && !value.includes("@");
}

function mapProspectSource(source: string | null | undefined): CrmSource {
  const s = (source ?? "").toLowerCase();
  if (s === "vip") return "vip";
  if (s === "reco-client") return "reco-client";
  // « rejoindre-funnel », « rejoindre », « opportunite-gated »… → Opportunité.
  // (bug : « rejoindre-funnel » ne matchait ni startsWith("opportunite") ni
  // === "rejoindre" → tombait sur le défaut « Site web ». Corrigé 2026-07-11.)
  if (s.startsWith("opportunite") || s.startsWith("rejoindre")) return "opportunite";
  if (s === "simulateur") return "simulateur";
  if (s.startsWith("business")) return "business";
  if (s === "colis") return "colis";
  if (s === "site-club") return "site-club";
  // Les valeurs historiques du site vitrine, listées explicitement.
  if (s === "welcome" || s === "welcome_page" || s === "site" || s === "") return "welcome";
  // Tout le reste : on le DIT. Le défaut d'avant renvoyait « welcome », donc
  // une source jamais déclarée s'affichait « 🌐 Site web » — c'est ce qui a
  // masqué `site-club` pendant 4 leads, après avoir déjà masqué
  // « rejoindre-funnel » en juillet. Un défaut muet ne protège de rien : il
  // fabrique une information fausse (audit 2026-08-11).
  return "inconnue";
}

/** online_bilans.lead_status (6 valeurs) → statut CRM normalisé. */
function mapBilanStatus(leadStatus: string | null, convertedClientId: string | null): CrmStatus {
  if (convertedClientId) return "converted";
  switch (leadStatus) {
    case "contact":
    case "to_recontact":
    case "relance":
      return "contacted";
    case "qualified":
      return "qualified";
    case "lost":
      return "lost";
    default:
      return "new";
  }
}

/**
 * Les trois champs de relance, lus pareil sur les deux tables qui les portent.
 *
 * ⚠️ `relance_done_at IS NULL` = échéance encore ouverte. C'est la sémantique
 * de `crm-relance-notifier`, pas un choix libre : l'inverser ferait naître
 * chaque rappel déjà marqué fait, donc muet (cf. qualification.ts).
 */
function relanceFields(
  row: Record<string, unknown>,
  now: number,
): Pick<CrmLead, "relanceDue" | "relanceDueAt" | "derniereReponse"> {
  const due = (row.relance_due_at as string | null) ?? null;
  const ouverte = Boolean(due && !row.relance_done_at);
  return {
    relanceDue: ouverte && new Date(due as string).getTime() <= now,
    // On n'expose l'échéance que si elle est OUVERTE : une relance déjà faite
    // rangerait la personne dans « Plus tard » alors qu'il n'y a plus rien de
    // prévu — exactement la disparition que ce chantier corrige.
    relanceDueAt: ouverte ? due : null,
    derniereReponse: (row.derniere_reponse as CleReponse | null) ?? null,
  };
}

function mapSimpleStatus(status: string | null): CrmStatus {
  switch (status) {
    case "contacted":
    // Posé par la feuille « Et alors ? ». Sans ce cas, une personne qu'on
    // vient d'appeler retomberait en « Nouveau » — donc traitée comme jamais
    // contactée, et le message repartirait sur « tu as laissé tes coordonnées ».
    case "to_recontact":
      return "contacted";
    case "qualified":
      return "qualified";
    case "converted":
      return "converted";
    case "lost":
      return "lost";
    case "pending":
    case "new":
    default:
      return "new";
  }
}

// Libellés des réponses du funnel colis (/colis) — source de vérité : ColisPage.
// Les réponses vivent dans metadata.colis_answers (codes) ; on les rend lisibles
// pour la fiche CRM (bug : le lead colis affichait « Pas de réponses »).
const COLIS_LABELS: Record<string, Record<string, string>> = {
  energie: { top: "Au top", ca_va: "Ça va", a_plat: "Souvent à plat", vide: "Vidé·e en ce moment" },
  sommeil: { tres_bien: "Je dors très bien", correct: "Correct", difficile: "Difficile", pas_terrible: "Vraiment pas terrible" },
  objectif: { poids: "Perdre du poids", muscle: "Prendre du muscle", energie: "Retrouver de l'énergie", mieux: "Juste me sentir mieux" },
  dispo: { semaine: "Cette semaine", mois: "Ce mois-ci", sans_pression: "Je verrai, sans pression" },
};
const COLIS_QUESTION_LABEL: Record<string, string> = {
  energie: "Énergie au quotidien",
  sommeil: "Sommeil",
  objectif: "Objectif principal",
  dispo: "Prêt·e à agir",
};
function buildColisFunnelAnswers(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const a = raw as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const key of ["energie", "sommeil", "objectif", "dispo"]) {
    const v = a[key];
    if (typeof v === "string" && v) {
      out[COLIS_QUESTION_LABEL[key]] = COLIS_LABELS[key]?.[v] ?? v;
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** Statuts proposables par table (le write-back doit rester natif-compatible). */
export function statusOptionsFor(table: CrmTable): CrmStatus[] {
  if (table === "online_bilans") {
    // 'converted' passe par le flow de conversion du kanban Leads détaillé.
    return ["new", "contacted", "qualified", "lost"];
  }
  return ["new", "contacted", "converted", "lost"];
}

/** Table qui n'a pas de colonne `notes` en base (confirmé 2026-07-16) —
    la fiche détail (Phase 2) doit masquer le champ notes pour ce cas. */
export function tableHasNotes(table: CrmTable): boolean {
  return table !== "client_referrals";
}

/** Décode le `CrmLead.key` (`${table}:${id}`) reçu en paramètre de route
    `/crm/leads/:leadId`. Retourne null si le format ou la table est invalide
    (protège la fiche détail contre une URL trafiquée ou un vieux lien mort). */
export function parseCrmLeadKey(key: string | undefined): { table: CrmTable; id: string } | null {
  if (!key) return null;
  const idx = key.indexOf(":");
  if (idx <= 0) return null;
  const table = key.slice(0, idx);
  const id = key.slice(idx + 1);
  const validTables: CrmTable[] = [
    "online_bilans",
    "prospect_leads",
    "client_referrals",
    "client_referral_intentions",
  ];
  if (!id || !validTables.includes(table as CrmTable)) return null;
  return { table: table as CrmTable, id };
}

interface IntentionRow {
  id: string;
  referrer_client_id: string | null;
  prospect_first_name: string | null;
  relationship: string | null;
  status: string | null;
  created_at: string;
  contacted_at: string | null;
  notes: string | null;
}

export interface CrmSourceStat {
  source: CrmSource;
  total: number;
  active: number; // ni converti ni perdu
  converted: number;
  lost: number;
  conversionRate: number; // converted / total (0-1)
}

/** Stats par source pour le panneau #6 (taux de conversion par canal). */
export function computeCrmStats(leads: CrmLead[]): {
  bySource: CrmSourceStat[];
  overall: { total: number; converted: number; conversionRate: number };
} {
  const map = new Map<CrmSource, CrmSourceStat>();
  for (const l of leads) {
    const s =
      map.get(l.source) ??
      { source: l.source, total: 0, active: 0, converted: 0, lost: 0, conversionRate: 0 };
    s.total += 1;
    if (l.status === "converted") s.converted += 1;
    else if (l.status === "lost") s.lost += 1;
    else s.active += 1;
    map.set(l.source, s);
  }
  const bySource = [...map.values()]
    .map((s) => ({ ...s, conversionRate: s.total > 0 ? s.converted / s.total : 0 }))
    .sort((a, b) => b.total - a.total);
  const total = leads.length;
  const converted = leads.filter((l) => l.status === "converted").length;
  return {
    bySource,
    overall: { total, converted, conversionRate: total > 0 ? converted / total : 0 },
  };
}

/** La clé du cache d'écran pour cette liste. Une seule liste, une seule clé. */
const CLE_CACHE = "crm:leads";

export function useCrmLeads() {
  // ── Revenir sur le CRM ne doit plus rouvrir une page vide (21/08) ────────
  //
  // Le hook se remonte à CHAQUE passage sur la page, et relançait les cinq
  // lectures à chaque fois. Mesuré dans les journaux du jour : ~5 secondes
  // d'écran vide par aller-retour, avec des requêtes à plus de 4 s pièce.
  //
  // Désormais : on repart de ce qu'on avait, affiché tout de suite, et la
  // lecture part quand même derrière pour corriger l'écran. On n'affiche donc
  // jamais du périmé durablement — on évite juste d'attendre devant du vide
  // pour réapprendre ce qu'on savait déjà.
  const dejaVu = lireCacheEcran<CrmLead[]>(CLE_CACHE);
  const [leads, setLeads] = useState<CrmLead[]>(dejaVu ?? []);
  // `loading` ne vaut vrai que la PREMIÈRE fois. Au retour, la liste est là :
  // lever le drapeau afficherait un squelette par-dessus des données valides.
  const [loading, setLoading] = useState(dejaVu === null);
  const [error, setError] = useState<string | null>(null);

  /**
   * LE seul point de mise à jour de la liste — état ET cache, ensemble.
   *
   * ⚠️ Ne jamais rappeler `setLeads` en direct. Le CRM met la liste à jour de
   * façon optimiste après chaque geste (qualifier, archiver, changer la source,
   * écrire une note, attribuer, supprimer). Si ces gestes n'écrivaient que dans
   * l'état React, un aller-retour vers la page réafficherait le cache d'AVANT
   * le geste : le lead qu'on vient de qualifier redeviendrait « à traiter »
   * pendant une seconde, avant que la lecture de fond ne le recorrige. Un
   * clignotement qui donne l'impression que le clic n'a pas pris.
   */
  const majLeads = useCallback(
    (maj: CrmLead[] | ((prev: CrmLead[]) => CrmLead[])) => {
      setLeads((prev) => {
        const suivant = typeof maj === "function" ? maj(prev) : maj;
        ecrireCacheEcran(CLE_CACHE, suivant);
        return suivant;
      });
    },
    [],
  );

  const fetchAll = useCallback(async () => {
    // Pareil ici : on ne vide l'écran que si on n'a rien à montrer.
    if (lireCacheEcran<CrmLead[]>(CLE_CACHE) === null) setLoading(true);
    setError(null);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");

      // ── Les colonnes des leads « prospect », et une à part ────────────────
      // `provenance_libre` n'est qu'un mot à AFFICHER, mais réclamée dans un
      // `select` elle devient une CONDITION DE LECTURE. Tant que la migration
      // `20261215100000` n'est pas appliquée — et la base est PARTAGÉE entre
      // dev et prod, donc la fenêtre est certaine, pas hypothétique — PostgREST
      // refuse la requête ENTIÈRE (42703, « column does not exist ») : pas la
      // colonne, la requête. Le CRM perdait alors d'un coup TOUS les leads de
      // cette table — tunnel club, /rejoindre, /colis, formulaire Welcome — au
      // profit d'une mention décorative.
      //
      // On redemande donc sans elle plutôt que de rendre une liste vide. Le
      // prénom cité manque le temps que la migration passe, rien d'autre. Une
      // fois la colonne en base, le second appel ne part plus jamais : ce repli
      // se retire tout seul, il n'y a rien à penser à enlever.
      const COLONNES_PROSPECTS =
        "id, first_name, last_name, phone, email, city, source, status, metadata, created_at, contacted_at, notes, referrer_user_id, assigned_to_user_id, coach_slug, consent_recontact, relance_due_at, relance_done_at, derniere_reponse, provenance_canal, provenance_user_id";
      // La liste de colonnes est une VARIABLE (c'est tout l'intérêt : pouvoir la
      // redemander sans `provenance_libre`), donc supabase-js ne peut plus en
      // déduire la forme des lignes — le client de l'app n'a pas de types
      // générés. On l'annonce donc explicitement : le mapping plus bas cast déjà
      // chaque champ un par un, exactement comme pour les autres tables.
      const lireProspects = (colonnes: string) =>
        sb
          .from("prospect_leads")
          .select(colonnes)
          .order("created_at", { ascending: false })
          .limit(500) as unknown as Promise<{
            data: Array<Record<string, unknown>> | null;
            error: PostgrestError | null;
          }>;

      // Les réservations du club, pour savoir si un lead du tunnel /reserver
      // est allé jusqu'au créneau. Sans ça, impossible de distinguer celui qui
      // a réservé de celui qui a abandonné à l'écran 1 — or c'est justement
      // celui-là qu'il faut rappeler (audit 2026-08-11).
      const [bilansRes, prospectsRes, referralsRes, reservationsRes, intentionsRes] = await Promise.all([
        sb
          .from("online_bilans")
          // ONLINE-B : on EXCLUT les drafts « Curieux » (completed_at NULL) du
          // pipeline qualifié — ils ont leur section dédiée (useCuriousLeads).
          .select(
            "id, first_name, phone, email, city, lead_status, converted_to_client_id, relance_due_at, relance_done_at, derniere_reponse, result_token, created_at, contacted_at, notes, coach_user_id, assigned_to_user_id, coach_slug, objectives, weight_loss_target_kg, motivation_score, age, callback_requested_at, engagement",
          )
          .not("completed_at", "is", null)
          .order("created_at", { ascending: false })
          .limit(500),
        (async () => {
          const avec = await lireProspects(`${COLONNES_PROSPECTS}, provenance_libre`);
          // On ne se replie QUE sur « cette colonne n'existe pas ». Une erreur
          // de droits ou de réseau doit remonter telle quelle : un repli qui
          // avale tout masquerait une panne derrière une liste incomplète.
          const colonneAbsente =
            !!avec.error &&
            (avec.error.code === "42703" || /provenance_libre/.test(avec.error.message ?? ""));
          return colonneAbsente ? await lireProspects(COLONNES_PROSPECTS) : avec;
        })(),
        sb
          .from("client_referrals")
          .select("id, from_client_id, from_client_name, referred_name, referred_contact, status, created_at")
          .order("created_at", { ascending: false })
          .limit(500),
        sb
          .from("rdv_bookings")
          // id / slot_end / club_id : sans eux la fiche pouvait AFFICHER le
          // rendez-vous mais rien en faire — ni le déplacer, ni l'annuler.
          .select("id, first_name, last_name, contact, slot_start, slot_end, status, club_id, coach_user_id")
          .neq("status", "canceled")
          .order("slot_start", { ascending: true })
          .limit(500),
        // Intentions de parrainage — requête débranchée le 2026-07-29.
        //
        // Ce hook alimente `useCrmBadge`, donc cette requête partait à CHAQUE
        // chargement de l'app, pour tout le monde. Mesure sur 166 jours de
        // statistiques Postgres : 2 735 interrogations, 0 ligne insérée, 0 ligne
        // en table. La fonctionnalité (saisie de prénoms dans le sandbox VIP)
        // n'a jamais été branchée en prod.
        //
        // On renvoie un résultat vide plutôt que de retirer la fonctionnalité :
        // tout l'aval (résolution des parrains, mapping en leads CRM, action
        // « demander le contact ») reste en place et compile. Le jour où les
        // intentions arrivent vraiment, il suffit de restaurer l'appel
        // ci-dessous — rien d'autre à retoucher.
        //
        //   sb.from("client_referral_intentions")
        //     .select("id, referrer_client_id, prospect_first_name, relationship, status, created_at, contacted_at, notes")
        //     .order("created_at", { ascending: false })
        //     .limit(500),
        Promise.resolve({ data: [] as IntentionRow[], error: null }),
      ]);

      // Garde-fou : on remonte la 1ère erreur au lieu d'un échec silencieux
      // (leçon RLS 2026-04-25). Les autres sources restent affichées.
      const firstError =
        bilansRes.error ?? prospectsRes.error ?? referralsRes.error ?? intentionsRes.error;
      if (firstError) setError(firstError.message);

      // Résolution des parrains (nom + téléphone) pour les intentions —
      // 1 seule requête clients sur les ids référents.
      const intentionRows = (intentionsRes.data ?? []) as IntentionRow[];
      // Ids des clients parrains (intentions ET recos) → résolution nom/tel +
      // distributeur (= propriétaire du lead, pour le filtre par ligne).
      const parrainIds = [
        ...new Set(
          [
            ...intentionRows.map((r) => r.referrer_client_id),
            ...(referralsRes.data ?? []).map((r) => r.from_client_id as string | null),
          ].filter(Boolean) as string[],
        ),
      ];
      const parrains = new Map<string, { name: string; phone: string | null }>();
      const clientDistributor = new Map<string, string | null>();
      if (parrainIds.length > 0) {
        const { data: parrainData } = await sb
          .from("clients")
          .select("id, first_name, last_name, phone, distributor_id")
          .in("id", parrainIds);
        for (const c of parrainData ?? []) {
          parrains.set(c.id as string, {
            name: `${(c.first_name as string) ?? ""} ${(c.last_name as string) ?? ""}`.trim(),
            phone: (c.phone as string | null) ?? null,
          });
          clientDistributor.set(c.id as string, (c.distributor_id as string | null) ?? null);
        }
      }

      const now = Date.now();
      const all: CrmLead[] = [];

      for (const row of bilansRes.data ?? []) {
        const contact = (row.phone as string | null) || (row.email as string | null) || null;
        all.push({
          key: `online_bilans:${row.id}`,
          table: "online_bilans",
          id: row.id as string,
          firstName: nomPropre(row.first_name as string) || "—",
          contact,
          contactIsPhone: looksLikePhone(row.phone as string | null),
          city: (row.city as string | null) ?? null,
          source: "bilan-online",
          status: mapBilanStatus(
            row.lead_status as string | null,
            row.converted_to_client_id as string | null,
          ),
          viaName: null,
          parrainPhone: null,
          parrainClientId: null,
          extra: null,
          // Assignation manuelle (Phase 5 routage) prioritaire sur la provenance
          // (coach dont le lien a capté le lead) — RLS autorise déjà l'accès via
          // les deux colonnes, seul le mapping app-level l'ignorait (bug corrigé
          // 2026-07-16 : un lead assigné via assigned_to_user_id était invisible
          // du filtre « mes leads » côté CRM alors que RLS le laissait passer).
          ownerUserId: (row.assigned_to_user_id as string | null) ?? (row.coach_user_id as string | null) ?? null,
          bilanObjectives: Array.isArray(row.objectives) ? (row.objectives as string[]) : null,
          bilanWeightTarget: (row.weight_loss_target_kg as number | null) ?? null,
          bilanMotivation: (row.motivation_score as number | null) ?? null,
          bilanAge: (row.age as number | null) ?? null,
          bilanCoachSlug: (row.coach_slug as string | null) ?? null,
          ...relanceFields(row, now),
          resultToken: (row.result_token as string | null) ?? null,
          callbackRequestedAt: (row.callback_requested_at as string | null) ?? null,
          engagement: (row.engagement as { score: number; tier: string; signals: string[] } | null) ?? null,
          createdAt: row.created_at as string,
          contactedAt: (row.contacted_at as string | null) ?? null,
          notes: (row.notes as string | null) ?? null,
        });
      }

      // Deux clés d'appariement : l'email/téléphone d'abord (fiable), le prénom
      // ensuite (le tunnel club demande les deux, mais rien ne garantit la même
      // saisie aux deux écrans). On ne relie que pour DIRE « a réservé » — aucune
      // écriture ne dépend de cet appariement.
      //
      // ⚠️ On garde le rendez-vous À VENIR le plus proche, et seulement à défaut
      // le dernier passé. L'ancienne version prenait le PREMIER de la liste,
      // triée par date croissante et sans filtre sur le passé : quelqu'un venu
      // en juin puis revenu en août affichait son créneau de juin, et la fiche
      // annonçait « il est déjà dans ton agenda » pour un rendez-vous vieux de
      // deux mois.
      const parContact = new Map<string, RdvLie>();
      const parPrenom = new Map<string, RdvLie>();
      const maintenantMs = Date.now();
      // Voit-on seulement les réservations du club ? La policy
      // `rdv_bookings_club_admin_read` exige `is_admin()` ; un coach ordinaire
      // ne lit QUE ses propres rendez-vous (`coach_user_id = auth.uid()`), et
      // reçoit zéro ligne club — sans erreur, silencieusement.
      //
      // Sans ce compteur, l'app en tirait la mauvaise conclusion : « pas de
      // réservation trouvée » devenait « cette personne est partie sans choisir
      // de créneau », affirmé en gros sur la fiche. Pour 10 des 12 comptes
      // actifs, ç'aurait été faux à chaque fois. On préfère ne rien affirmer.
      let resasClubVues = 0;
      const meilleur = (a: RdvLie | undefined, b: RdvLie): RdvLie => {
        if (!a) return b;
        // Un rendez-vous à venir bat toujours un rendez-vous passé.
        if (a.passe !== b.passe) return a.passe ? b : a;
        // À venir : le plus proche. Passés : le plus récent.
        const aMs = new Date(a.slotStart).getTime();
        const bMs = new Date(b.slotStart).getTime();
        return a.passe ? (bMs > aMs ? b : a) : bMs < aMs ? b : a;
      };
      for (const b of (reservationsRes.data ?? []) as Array<Record<string, unknown>>) {
        const slotStart = String(b.slot_start);
        const t = new Date(slotStart).getTime();
        if (Number.isNaN(t)) continue;
        if (b.club_id != null) resasClubVues += 1;
        const rdv: RdvLie = {
          id: String(b.id),
          slotStart,
          slotEnd: b.slot_end ? String(b.slot_end) : null,
          clubId: (b.club_id as string | null) ?? null,
          coachUserId: (b.coach_user_id as string | null) ?? null,
          passe: t < maintenantMs,
          label: new Intl.DateTimeFormat("fr-FR", {
            timeZone: "Europe/Paris", weekday: "short", day: "2-digit", month: "short",
            hour: "2-digit", minute: "2-digit",
          }).format(new Date(slotStart)),
        };
        const c = String(b.contact ?? "").trim().toLowerCase();
        const p = String(b.first_name ?? "").trim().toLowerCase();
        if (c) parContact.set(c, meilleur(parContact.get(c), rdv));
        if (p) parPrenom.set(p, meilleur(parPrenom.get(p), rdv));
      }

      for (const row of prospectsRes.data ?? []) {
        const meta = (row.metadata ?? {}) as Record<string, unknown>;
        const viaName =
          typeof meta.from_client_name === "string" ? (meta.from_client_name as string) : null;
        const source = mapProspectSource(row.source as string | null);
        // Réponses du funnel Opportunité (metadata.answers) — pour les afficher
        // dans la carte CRM (bug : elles n'étaient jamais exposées).
        const funnelAnswers =
          meta.answers && typeof meta.answers === "object" && !Array.isArray(meta.answers)
            ? (meta.answers as Record<string, string>)
            : null;
        // Réponses du funnel colis (metadata.colis_answers) — format + rendu
        // différents du funnel Opportunité (FunnelAnswers passe par
        // buildFunnelSummary qui ne connaît que les clés Opportunité). On expose
        // donc un champ dédié, rendu par un bloc propre dans la fiche.
        const colisAnswers = source === "colis" ? buildColisFunnelAnswers(meta.colis_answers) : null;
        // Signal de priorité colis (remplace "disponibilité", décision Thomas
        // 2026-07-08) : ce que la personne a choisi en fin de tunnel — une
        // action réelle est un bien meilleur indicateur qu'une réponse déclarée.
        const colisNextAction =
          source === "colis" ? (meta.colis_next_action as string | undefined) : undefined;
        const colisExtra =
          colisNextAction === "rdv"
            ? "🔴 Voulait un RDV direct"
            : colisNextAction === "bilan"
              ? "🟠 Bilan en ligne complet"
              : colisNextAction === "email_only"
                ? "⚪ A laissé son email"
                : null;
        const cleContact = String(row.email ?? row.phone ?? "").trim().toLowerCase();
        const clePrenom = String(row.first_name ?? "").trim().toLowerCase();
        const rdvTrouve: RdvLie | null =
          (cleContact ? parContact.get(cleContact) : undefined) ??
          (clePrenom ? parPrenom.get(clePrenom) : undefined) ??
          null;

        all.push({
          key: `prospect_leads:${row.id}`,
          table: "prospect_leads",
          id: row.id as string,
          firstName: nomPropre(row.first_name as string) || "—",
          contact: (row.phone as string | null) || (row.email as string | null) || null,
          contactIsPhone: looksLikePhone(row.phone as string | null),
          city: (row.city as string | null) ?? null,
          source,
          status: mapSimpleStatus(row.status as string | null),
          viaName,
          parrainPhone: null,
          parrainClientId:
            typeof meta.from_client_id === "string" ? (meta.from_client_id as string) : null,
          extra: colisExtra,
          // Cf. commentaire online_bilans — même correction (assigned_to_user_id prioritaire).
          ownerUserId: (row.assigned_to_user_id as string | null) ?? (row.referrer_user_id as string | null) ?? null,
          ...relanceFields(row, now),
          resultToken: null,
          callbackRequestedAt: null,
          engagement: null,
          createdAt: row.created_at as string,
          contactedAt: (row.contacted_at as string | null) ?? null,
          notes: (row.notes as string | null) ?? null,
          sourceRaw: (row.source as string | null) ?? null,
          lastName: nomPropre(
            (row.last_name as string | null)
            ?? (typeof meta.nom === "string" ? (meta.nom as string) : null),
          ) || null,
          objectif: typeof meta.objectif === "string" ? (meta.objectif as string) : null,
          peopleCount: typeof meta.people_count === "number" ? (meta.people_count as number) : null,
          partnerName: [meta.partner_first_name, meta.partner_last_name]
            .filter((v): v is string => typeof v === "string" && !!v.trim())
            .join(" ") || null,
          partnerObjectif: typeof meta.partner_objectif === "string" ? (meta.partner_objectif as string) : null,
          coachSlug: (row.coach_slug as string | null) ?? null,
          consentRecontact: typeof row.consent_recontact === "boolean" ? (row.consent_recontact as boolean) : null,
          rdvLabel: rdvTrouve?.label ?? null,
          rdv: rdvTrouve,
          provenanceCanal: (row.provenance_canal as CrmLead["provenanceCanal"]) ?? null,
          provenancePar: (row.provenance_user_id as string | null) ?? null,
          provenanceLibre: (row.provenance_libre as string | null) ?? null,
          // Le signal du chantier : parti avant de choisir son créneau. On ne
          // le lève que pour le tunnel club — ailleurs, ne pas avoir de RDV est
          // l'état normal — ET seulement si on a effectivement pu lire les
          // réservations du club (cf. `resasClubVues`). Aveugle, on se tait.
          abandonAvantCreneau: source === "site-club" && !rdvTrouve && resasClubVues > 0,
          funnelAnswers,
          colisAnswers,
          funnelScore: typeof meta.score === "number" ? (meta.score as number) : null,
          funnelTemperature: typeof meta.temperature === "string" ? (meta.temperature as string) : null,
          funnelProfile: typeof meta.profile === "string" ? (meta.profile as string) : null,
        });
      }

      for (const row of referralsRes.data ?? []) {
        all.push({
          key: `client_referrals:${row.id}`,
          table: "client_referrals",
          id: row.id as string,
          firstName: nomPropre(row.referred_name as string) || "—",
          contact: (row.referred_contact as string | null) ?? null,
          contactIsPhone: looksLikePhone(row.referred_contact as string | null),
          city: null,
          source: "reco-client",
          status: mapSimpleStatus(row.status as string | null),
          viaName: (row.from_client_name as string | null) ?? null,
          parrainPhone: null,
          parrainClientId: (row.from_client_id as string | null) ?? null,
          extra: null,
          ownerUserId: row.from_client_id
            ? clientDistributor.get(row.from_client_id as string) ?? null
            : null,
          // Ni relance ni qualification sur cette table : la personne se range
          // dans « Aujourd'hui » tant qu'on ne l'a pas appelée.
          relanceDue: false,
          relanceDueAt: null,
          derniereReponse: null,
          resultToken: null,
          callbackRequestedAt: null,
          engagement: null,
          createdAt: row.created_at as string,
          // client_referrals n'a pas de colonne contacted_at (confirmé DB 2026-07-16).
          contactedAt: null,
          notes: null,
        });
      }

      // Intentions VIP (upgrade V1.1) : pas de contact direct — l'action est
      // « demander le contact au parrain » (client connu, téléphone résolu).
      for (const row of intentionRows) {
        const parrain = row.referrer_client_id ? parrains.get(row.referrer_client_id) : undefined;
        all.push({
          key: `client_referral_intentions:${row.id}`,
          table: "client_referral_intentions",
          id: row.id,
          firstName: nomPropre(row.prospect_first_name) || "—",
          contact: null,
          contactIsPhone: false,
          city: null,
          source: "intention",
          status: mapSimpleStatus(row.status),
          viaName: parrain?.name ?? null,
          parrainPhone: parrain?.phone ?? null,
          parrainClientId: row.referrer_client_id,
          extra: row.relationship ? RELATIONSHIP_LABELS[row.relationship] ?? row.relationship : null,
          ownerUserId: row.referrer_client_id
            ? clientDistributor.get(row.referrer_client_id) ?? null
            : null,
          // Ni relance ni qualification sur cette table : la personne se range
          // dans « Aujourd'hui » tant qu'on ne l'a pas appelée.
          relanceDue: false,
          relanceDueAt: null,
          derniereReponse: null,
          resultToken: null,
          callbackRequestedAt: null,
          engagement: null,
          createdAt: row.created_at,
          contactedAt: row.contacted_at ?? null,
          notes: row.notes ?? null,
        });
      }

      // Archive « endormi » (flag orthogonal, table crm_archived_leads).
      const { data: arch } = await sb.from("crm_archived_leads").select("lead_table, lead_id");
      const archSet = new Set(
        ((arch ?? []) as Array<{ lead_table: string; lead_id: string }>).map(
          (a) => `${a.lead_table}:${a.lead_id}`,
        ),
      );
      for (const l of all) {
        if (archSet.has(`${l.table}:${l.id}`)) {
          l.dormant = true;
          // Un endormi ne déclenche aucune relance — ni le 🔔, ni le rangement
          // par échéance (il est mis de côté exprès, il n'attend rien).
          l.relanceDue = false;
          l.relanceDueAt = null;
        }
      }

      all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      majLeads(all);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement CRM impossible.");
    } finally {
      setLoading(false);
    }
  }, [majLeads]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  /**
   * « Et alors ? » — la seule façon de sortir quelqu'un du flou. Un tap, et la
   * date de retour est calculée depuis le geste ; personne ne saisit jamais
   * une date à la main.
   *
   * Le CRM ET le Co-pilote passent par le même service d'écriture : les deux
   * tables ne parlent pas le même vocabulaire de statut, et une traduction
   * oubliée fait rejeter tout l'update en silence.
   */
  const qualifier = useCallback(
    async (lead: CrmLead, reponse: Reponse): Promise<string | null> => {
      const table = lead.table;
      if (!estQualifiable(table)) {
        return "Cette fiche ne porte pas d'échéance de relance.";
      }
      const maintenant = new Date();
      const err = await ecrireQualification(table, lead.id, reponse, maintenant);
      if (err) return err;

      const ecrit = ecritureFor(reponse, maintenant);
      majLeads((prev) =>
        prev.map((l) =>
          l.key === lead.key
            ? {
                ...l,
                // On rejoue EXACTEMENT ce que la base vient d'enregistrer :
                // traduction dans le vocabulaire de la table, puis le mapping
                // du chargement. Sinon un « RDV calé » s'afficherait
                // « Qualifié » sur un prospect_lead (qui ne connaît pas ce
                // statut et a stocké « contacted ») et clignoterait au refetch.
                status:
                  table === "online_bilans"
                    ? mapBilanStatus(statutPour(table, ecrit.status), null)
                    : mapSimpleStatus(statutPour(table, ecrit.status)),
                derniereReponse: ecrit.derniere_reponse,
                contactedAt: ecrit.contacted_at,
                relanceDueAt: ecrit.relance_due_at,
                relanceDue: false, // une échéance fraîche est toujours future
              }
            : l,
        ),
      );
      return null;
    },
    [majLeads],
  );

  const updateStatus = useCallback(
    async (lead: CrmLead, next: CrmStatus): Promise<string | null> => {
      const sb = await getSupabaseClient();
      if (!sb) return "Service indisponible.";

      let err: string | null = null;
      // Sortir quelqu'un de la file doit AUSSI refermer son échéance. Sans ça,
      // `crm-relance-notifier` continue de pousser « relance Laure » le
      // lendemain du jour où on l'a passée en Perdu — le cron ne lit que
      // `relance_due_at <= now AND relance_done_at IS NULL`, pas le statut.
      const sortDeLaFile = next === "lost" || next === "converted" || next === "qualified";
      const refermeEcheance = (patch: Record<string, unknown>) => {
        if (sortDeLaFile) {
          patch.relance_due_at = null;
          patch.relance_done_at = new Date().toISOString();
        }
        return patch;
      };

      if (lead.table === "online_bilans") {
        // Traduction vers les valeurs natives du kanban Leads.
        const native =
          next === "contacted" ? "contact" : next === "qualified" ? "qualified" : next;
        const patch: Record<string, unknown> = { lead_status: native };
        if (next === "contacted") patch.contacted_at = new Date().toISOString();
        refermeEcheance(patch);
        const { error: e } = await sb.from("online_bilans").update(patch).eq("id", lead.id);
        err = e?.message ?? null;
      } else if (lead.table === "prospect_leads") {
        const patch: Record<string, unknown> = { status: next === "qualified" ? "contacted" : next };
        if (next === "contacted") patch.contacted_at = new Date().toISOString();
        refermeEcheance(patch);
        const { error: e } = await sb.from("prospect_leads").update(patch).eq("id", lead.id);
        err = e?.message ?? null;
      } else if (lead.table === "client_referral_intentions") {
        // Natif : pending / contacted / converted / lost.
        const native = next === "new" ? "pending" : next === "qualified" ? "contacted" : next;
        const patch: Record<string, unknown> = { status: native };
        if (next === "contacted") patch.contacted_at = new Date().toISOString();
        if (next === "converted") patch.converted_at = new Date().toISOString();
        const { error: e } = await sb
          .from("client_referral_intentions")
          .update(patch)
          .eq("id", lead.id);
        err = e?.message ?? null;
      } else {
        const { error: e } = await sb
          .from("client_referrals")
          .update({ status: next })
          .eq("id", lead.id);
        err = e?.message ?? null;
      }

      if (!err) {
        majLeads((prev) =>
          prev.map((l) =>
            l.key === lead.key
              ? {
                  ...l,
                  status: next,
                  relanceDue: false,
                  relanceDueAt: sortDeLaFile ? null : l.relanceDueAt,
                }
              : l,
          ),
        );
        // Wagon 2 chantier 5 : conversion d'une reco/intention → push de
        // gratification au client parrain (« 🎉 Ta reco a porté ses fruits »).
        // Fire-and-forget : un échec ne bloque jamais le changement de statut.
        if (next === "converted" && lead.parrainClientId) {
          void sb.functions
            .invoke("notify-referral-converted", {
              body: {
                parrain_client_id: lead.parrainClientId,
                prospect_first_name: lead.firstName,
              },
            })
            .catch(() => {
              /* best-effort */
            });
        }
      }
      return err;
    },
    [majLeads],
  );

  // Re-catégoriser la source d'un lead prospect (A, 2026-06-16). Les autres
  // tables ont une source intrinsèque (bilan online, reco client, intention).
  const updateSource = useCallback(async (lead: CrmLead, next: CrmSource): Promise<string | null> => {
    if (lead.table !== "prospect_leads") {
      return "La source n'est modifiable que pour les leads prospect.";
    }
    const dbVal = CRM_SOURCE_TO_DB[next];
    if (!dbVal) return "Source invalide.";
    const sb = await getSupabaseClient();
    if (!sb) return "Service indisponible.";
    const { error: e } = await sb.from("prospect_leads").update({ source: dbVal }).eq("id", lead.id);
    if (e) return e.message;
    majLeads((prev) => prev.map((l) => (l.key === lead.key ? { ...l, source: next } : l)));
    return null;
  }, [majLeads]);

  // Endormir / réveiller un lead (archive orthogonale).
  const setDormant = useCallback(async (lead: CrmLead, value: boolean): Promise<string | null> => {
    const sb = await getSupabaseClient();
    if (!sb) return "Service indisponible.";
    if (value) {
      const { error: e } = await sb
        .from("crm_archived_leads")
        .upsert({ lead_table: lead.table, lead_id: lead.id }, { onConflict: "lead_table,lead_id" });
      if (e) return e.message;
    } else {
      const { error: e } = await sb
        .from("crm_archived_leads")
        .delete()
        .eq("lead_table", lead.table)
        .eq("lead_id", lead.id);
      if (e) return e.message;
    }
    majLeads((prev) =>
      prev.map((l) =>
        l.key === lead.key
          ? {
              ...l,
              dormant: value,
              relanceDue: value ? false : l.relanceDue,
              relanceDueAt: value ? null : l.relanceDueAt,
            }
          : l,
      ),
    );
    return null;
  }, [majLeads]);

  // Notes coach — générique 4 tables (Phase 2 fiche détail). client_referrals
  // n'a pas de colonne notes en base (confirmé 2026-07-16) : erreur explicite
  // plutôt qu'un échec silencieux, la fiche détail masque le champ pour ce cas.
  const updateNotes = useCallback(async (lead: CrmLead, notes: string): Promise<string | null> => {
    if (!tableHasNotes(lead.table)) {
      return "Les recos clients n'ont pas de champ notes.";
    }
    const sb = await getSupabaseClient();
    if (!sb) return "Service indisponible.";
    const { error: e } = await sb.from(lead.table).update({ notes }).eq("id", lead.id);
    if (e) return e.message;
    majLeads((prev) => prev.map((l) => (l.key === lead.key ? { ...l, notes } : l)));
    return null;
  }, [majLeads]);

  // Attribution manuelle (Phase 5 routage, suggestion validée par le coach —
  // JAMAIS automatique). Seules online_bilans/prospect_leads ont une colonne
  // assigned_to_user_id ; les recos/intentions dérivent leur propriétaire du
  // parrain, non réassignable ici.
  const assignOwner = useCallback(async (lead: CrmLead, userId: string | null): Promise<string | null> => {
    if (lead.table !== "online_bilans" && lead.table !== "prospect_leads") {
      return "L'attribution n'est possible que pour les leads bilan online / prospect.";
    }
    const sb = await getSupabaseClient();
    if (!sb) return "Service indisponible.";
    const { error: e } = await sb.from(lead.table).update({ assigned_to_user_id: userId }).eq("id", lead.id);
    if (e) return e.message;

    // Le rendez-vous suit la personne (Thomas, 19/08 : « si dans le CRM on dit
    // que ce lead est pour Mélanie, le RDV doit être chez Mélanie »). Sans ça
    // on confie le contact à quelqu'un et son rendez-vous reste dans l'agenda
    // d'un autre — c'est exactement le symptôme remonté par Mélanie.
    //
    // On rapproche par email, seule clé commune : il n'y a pas de lead_id sur
    // rdv_bookings. Deux égalités plutôt qu'une comparaison insensible à la
    // casse, parce qu'un motif SQL obligerait à échapper les jokers — et le
    // tiret bas est un caractère parfaitement valide dans une adresse, qui
    // matcherait alors n'importe quelle lettre à sa place. Mesuré le 19/08 :
    // une des 21 réservations porte une majuscule, le cas n'est pas théorique.
    //
    // Best-effort et silencieux : l'attribution du lead, elle, a réussi, et
    // c'est ce que le coach vient de demander. Sans email, rien à rapprocher —
    // on ne devine pas sur le prénom seul, « Manon » ne désigne personne.
    const mail = (lead.contact ?? "").trim();
    if (userId && mail.includes("@")) {
      const formes = [...new Set([mail, mail.toLowerCase()])];
      for (const forme of formes) {
        const { error: eRdv } = await sb
          .from("rdv_bookings")
          .update({ coach_user_id: userId })
          .eq("contact", forme)
          .neq("status", "canceled");
        if (eRdv) console.warn(`[crm] RDV non redirige vers son coach : ${eRdv.message}`);
      }
    }

    majLeads((prev) => prev.map((l) => (l.key === lead.key ? { ...l, ownerUserId: userId } : l)));
    return null;
  }, [majLeads]);

  // Suppression définitive (admin) depuis la table source + nettoyage archive.
  const deleteLead = useCallback(async (lead: CrmLead): Promise<string | null> => {
    const sb = await getSupabaseClient();
    if (!sb) return "Service indisponible.";
    const { error: e } = await sb.from(lead.table).delete().eq("id", lead.id);
    if (e) return e.message;
    await sb
      .from("crm_archived_leads")
      .delete()
      .eq("lead_table", lead.table)
      .eq("lead_id", lead.id);
    majLeads((prev) => prev.filter((l) => l.key !== lead.key));
    return null;
  }, [majLeads]);

  const counts = useMemo(() => {
    const byStatus: Record<CrmStatus, number> = {
      new: 0,
      contacted: 0,
      qualified: 0,
      converted: 0,
      lost: 0,
    };
    for (const l of leads) byStatus[l.status] += 1;
    return byStatus;
  }, [leads]);

  return {
    leads,
    loading,
    error,
    counts,
    refetch: fetchAll,
    qualifier,
    updateStatus,
    updateSource,
    updateNotes,
    assignOwner,
    setDormant,
    deleteLead,
  };
}
