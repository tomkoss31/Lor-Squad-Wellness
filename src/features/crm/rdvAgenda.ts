// =============================================================================
// Le rendez-vous posé DANS L'AGENDA, rattaché à son lead.
//
// LE CONSTAT (Thomas, 14/09). Romane appelle une lead de la pub
// Meta, et lui cale un rendez-vous pour le lendemain avec « Caler un RDV »
// depuis le CRM. Le rendez-vous est bien dans l'agenda. Mais la fiche du lead
// reste « Pas encore de rendez-vous ».
//
// LA CAUSE. Deux tables portent des rendez-vous :
//   · `rdv_bookings` — ce que la personne réserve elle-même sur le site ;
//   · `prospects`    — ce que le coach pose à la main dans l'agenda. C'est là
//                      qu'écrit « Caler un RDV ».
// Le CRM ne rapprochait un lead QUE de la première. Le bouton du CRM écrivait
// donc dans une table que le CRM ne relisait jamais : tout rendez-vous calé au
// téléphone était invisible sur la fiche qui l'avait créé.
//
// ── CE QUE CE MODULE NE FAIT PAS ──────────────────────────────────────────
// Il ne sert qu'à DIRE « a un rendez-vous ». Rien ne s'écrit sur le lead à
// partir de ce rapprochement : c'est un lien probable, pas une clé étrangère
// (`prospects` n'a pas de `lead_id`). Et un rendez-vous d'agenda ne se déplace
// ni ne s'annule depuis la fiche lead — ces boutons visent les réservations du
// site. On le marque `origine: "agenda"` pour que l'écran le sache.
//
// ── LA RÈGLE DE RAPPROCHEMENT ─────────────────────────────────────────────
// Numéro OU adresse d'abord, normalisés par `cleDoublon.ts` (« 06 45 … » et
// « +33 6 45 … » sont la même personne). Le nom COMPLET ensuite, jamais le
// prénom seul — « Manon » ne désigne personne (cf. `appariementRdv.ts`).
// =============================================================================

import type { CrmLead, RdvLie } from "../../hooks/useCrmLeads";
import type { ProspectSource } from "../../types/domain";
import { clesDoublon } from "./cleDoublon";
import { cleIdentite } from "./appariementRdv";

/** Sans durée saisie, le formulaire applique « comme d'habitude » : une heure. */
export const DUREE_RDV_PAR_DEFAUT_MIN = 60;

const LIBELLE = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** « mar. 15 sept., 17:15 » — le même libellé que les réservations du site. */
export function libelleCreneau(iso: string): string {
  return LIBELLE.format(new Date(iso));
}

/**
 * Entre deux rendez-vous d'une même personne, lequel montrer.
 *
 * Un rendez-vous À VENIR bat toujours un rendez-vous passé. À venir : le plus
 * proche. Passés : le plus récent. Règle unique pour les deux sources — elle
 * vivait jusqu'ici dans le hook, réservée aux réservations du site.
 */
export function meilleurRdv(
  a: RdvLie | null | undefined,
  b: RdvLie | null | undefined,
): RdvLie | null {
  if (!a) return b ?? null;
  if (!b) return a;
  if (a.passe !== b.passe) return a.passe ? b : a;
  const aMs = new Date(a.slotStart).getTime();
  const bMs = new Date(b.slotStart).getTime();
  return a.passe ? (bMs > aMs ? b : a) : bMs < aMs ? b : a;
}

/** Une ligne de `prospects`, telle que la rend Supabase (client non typé). */
export type LigneAgenda = Record<string, unknown>;

/**
 * Un rendez-vous d'agenda, ou `null` s'il ne compte pas.
 *
 * Seul `scheduled` compte. `done`, `no_show`, `cancelled` et `converted` sont
 * des rendez-vous déjà tranchés : les rattacher ferait redemander « et alors ? »
 * à propos de quelqu'un dont le sort est déjà écrit.
 */
export function rdvDepuisAgenda(l: LigneAgenda, maintenantMs: number): RdvLie | null {
  if (String(l.status ?? "") !== "scheduled") return null;
  const debut = typeof l.rdv_date === "string" ? l.rdv_date : "";
  const t = new Date(debut).getTime();
  if (!debut || Number.isNaN(t)) return null;
  const duree = Number(l.duration_min);
  const minutes = Number.isFinite(duree) && duree > 0 ? duree : DUREE_RDV_PAR_DEFAUT_MIN;
  return {
    id: String(l.id),
    slotStart: debut,
    slotEnd: new Date(t + minutes * 60_000).toISOString(),
    clubId: null,
    coachUserId: l.distributor_id ? String(l.distributor_id) : null,
    passe: t < maintenantMs,
    label: libelleCreneau(debut),
    origine: "agenda",
  };
}

export interface IndexAgenda {
  /** Par clé de contact normalisée (`t:…` / `e:…`). */
  parCle: Map<string, RdvLie>;
  /** Par nom complet normalisé. */
  parIdentite: Map<string, RdvLie>;
}

/** Range les rendez-vous d'agenda pour les retrouver lead par lead. */
export function indexerAgenda(lignes: readonly LigneAgenda[], maintenantMs: number): IndexAgenda {
  const parCle = new Map<string, RdvLie>();
  const parIdentite = new Map<string, RdvLie>();
  for (const l of lignes) {
    const rdv = rdvDepuisAgenda(l, maintenantMs);
    if (!rdv) continue;
    const cles = clesDoublon({
      phone: typeof l.phone === "string" ? l.phone : null,
      email: typeof l.email === "string" ? l.email : null,
    });
    for (const k of cles) parCle.set(k, meilleurRdv(parCle.get(k), rdv) ?? rdv);
    const identite = cleIdentite(l.first_name, l.last_name);
    if (identite) parIdentite.set(identite, meilleurRdv(parIdentite.get(identite), rdv) ?? rdv);
  }
  return { parCle, parIdentite };
}

/** Le rendez-vous d'agenda de ce lead, s'il en a un. */
export function rdvAgendaDuLead(
  lead: { phone?: string | null; email?: string | null; firstName?: unknown; lastName?: unknown },
  index: IndexAgenda,
): RdvLie | null {
  let trouve: RdvLie | null = null;
  for (const k of clesDoublon({ phone: lead.phone, email: lead.email })) {
    trouve = meilleurRdv(trouve, index.parCle.get(k));
  }
  if (trouve) return trouve;
  const identite = cleIdentite(lead.firstName, lead.lastName);
  return identite ? (index.parIdentite.get(identite) ?? null) : null;
}

/** Ce que le formulaire d'agenda a besoin de savoir d'un lead. */
export type LeadPourRdv = Pick<
  CrmLead,
  | "firstName"
  | "lastName"
  | "phone"
  | "email"
  | "contact"
  | "contactIsPhone"
  | "source"
  | "viaName"
  | "notes"
  | "ownerUserId"
>;

function sourceAgenda(source: string): ProspectSource {
  if (source === "reco-client" || source === "intention") return "Parrainage";
  if (source === "meta-ads") return "Meta Ads";
  return "Autre";
}

/**
 * Le pré-remplissage de « Caler un RDV » — UNE définition pour les deux
 * boutons du CRM (la liste et la fiche).
 *
 * ⚠️ 14/09 — les deux boutons ne transmettaient que le prénom, le téléphone et
 * la note. Ni le NOM, ni l'EMAIL — alors que le formulaire sait les recevoir et
 * que l'email conditionne le rappel automatique de la veille. Romane a dû
 * retaper l'adresse de la lead, pourtant présente sur sa fiche.
 *
 * Le rendez-vous part dans l'agenda du coach À QUI LE LEAD EST CONFIÉ (Thomas,
 * 19/08 : « si dans le CRM on dit que ce lead est pour Mélanie, le RDV doit être
 * chez Mélanie »). Le formulaire garde la main pour en choisir un autre.
 */
export function prefillRdvDepuisLead(lead: LeadPourRdv, libelleSource: string) {
  const prenom = lead.firstName && lead.firstName !== "—" ? lead.firstName : undefined;
  return {
    firstName: prenom,
    lastName: lead.lastName ?? undefined,
    phone: lead.phone ?? (lead.contactIsPhone ? (lead.contact ?? undefined) : undefined),
    email: lead.email ?? undefined,
    source: sourceAgenda(lead.source),
    sourceDetail: `CRM · ${libelleSource}${lead.viaName ? ` (via ${lead.viaName})` : ""}`,
    note: lead.notes ?? undefined,
    distributorId: lead.ownerUserId ?? undefined,
  };
}
