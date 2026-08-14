// =============================================================================
// bilan10Pesee — l'écriture de la 2ᵉ pesée du bilan des 10.
//
// ── POURQUOI UN VRAI BILAN ET PAS UNE LIGNE DE CHECKLIST ─────────────────────
// La courbe du membre (app PWA, onglet Évolution) lit `assessments`, et elle
// exige DEUX relevés pour exister — sinon elle affiche « ta transformation
// commence » après dix petits-déjeuners. Cocher une case dans `club_bilans` ne
// la fera jamais bouger. La 2ᵉ pesée doit donc créer un vrai bilan de suivi.
//
// ── ON RÉUTILISE LE CHEMIN D'ÉCRITURE EXISTANT ───────────────────────────────
// `addSupabaseFollowUpAssessment` est le service que la page « nouveau suivi »
// utilise déjà. Il fait trois écritures qui vont ensemble : le bilan, la fiche
// client (programme, prochain RDV, statut) et le suivi. On ne réécrit pas ces
// inserts à la main.
//
// Deux précautions prises ici, parce que ce service a des effets de bord :
//  • on lui REDONNE le programme et le RDV déjà en base — sinon il écraserait le
//    programme du membre par une chaîne vide et déplacerait son prochain RDV ;
//  • on passe par le service, pas par `AppContext.addFollowUpAssessment`, pour
//    ne pas déclencher un refetch complet de l'app coach depuis le mode BBC
//    (~47 requêtes) alors qu'aucun de ces écrans n'est monté.
//
// ── IDEMPOTENCE ──────────────────────────────────────────────────────────────
// Un bilan des 10 rouvert ne doit JAMAIS créer un second bilan. Deux garde-fous :
//  1. l'id du bilan créé est rangé dans `club_bilans.steps` (jsonb, aucune
//     migration) et relu à l'ouverture de la feuille ;
//  2. si cet id manque (écriture de la checklist perdue, bilan précédent
//     clôturé), on cherche en base un bilan de suivi du MÊME JOUR portant le
//     préfixe d'id `a-b10-` avant de décider de créer.
//
// ── CORRIGER UNE PESÉE : SURTOUT PAS UN `update` DEPUIS LE NAVIGATEUR ────────
// `assessments` n'a que des policies select / insert / delete (schema.sql
// l.327 / 341 / 407) — AUCUNE en UPDATE. Et `authenticated` possède bien le
// GRANT : un `update` depuis le front ne remonte donc pas d'erreur, il ne
// touche simplement AUCUNE ligne, en silence. Le bouton « mettre à jour la
// pesée » était mort à 100 %, et le recours qu'il indiquait (« passe par la
// fiche du membre ») est inatteignable pour un coach de club, qui n'a pas
// l'app coach : `AppLayout` monte `BbcApp` à la place de tout le routeur.
// La correction passe donc par `/api/update-assessment` (service_role, avec
// contrôle de session et de propriété côté serveur) — le SEUL chemin d'édition
// d'un bilan dans l'app. On lui REDONNE le bilan entier, relu en base : il
// réécrit toutes les colonnes, ne lui envoyer que le body scan effacerait le
// reste.
// =============================================================================

import { getSupabaseClient } from "../../services/supabaseClient";
import {
  addSupabaseFollowUpAssessment,
  refreshClientRecap,
  updateSupabaseAssessment,
} from "../../services/supabaseService";
import type { Goal } from "../../lib/bodyMetricUnits";
import type {
  AssessmentQuestionnaire,
  AssessmentRecord,
  BodyScanMetrics,
  FollowUp,
  Objective,
} from "../../types/domain";
import type { ScanValues } from "./BbcBilan10Scan";

/** Préfixe d'id des bilans écrits par cet écran — sert de garde anti-doublon. */
const PREFIXE_ID = "a-b10-";

/** Les statuts que la contrainte CHECK de `follow_ups` accepte. */
const STATUTS_SUIVI: ReadonlyArray<FollowUp["status"]> = [
  "scheduled",
  "pending",
  "completed",
  "dismissed",
  "inactive",
];

export interface ContextePesee {
  /** Objectif tel qu'il est en base — c'est lui qui repart dans le bilan. */
  objectifNatif: Objective;
  /** Sa traduction pour la coloration des écarts (2 valeurs seulement). */
  objectifAffiche: Goal;
  /** Le programme du membre. Redonné tel quel pour ne pas l'effacer. */
  programme: string;
  /** Le prochain RDV déjà calé. Redonné tel quel pour ne pas le déplacer. */
  prochainRdv: string;
  suiviType: string;
  suiviStatut: FollowUp["status"];
  /** Le point de départ : le premier bilan qui porte un poids. */
  depart: ScanValues | null;
  departDate: string | null;
  /** La pesée du jour, si elle a déjà été écrite (feuille rouverte). */
  peseeDuJour: { id: string; date: string | null; scan: ScanValues | null } | null;
  questionnaire: AssessmentQuestionnaire;
  pedagogicalFocus: string[];
}

interface LigneBilan {
  id: string;
  date: string | null;
  body_scan: Record<string, unknown> | null;
  questionnaire: AssessmentQuestionnaire | null;
  pedagogical_focus: string[] | null;
}

// -----------------------------------------------------------------------------
// Conversions de forme (aucune conversion d'UNITÉ ici — voir bodyMetricUnits)
// -----------------------------------------------------------------------------

/** Un nombre exploitable, sinon `null`. Le 0 vaut « non mesuré » dans ce schéma. */
function mesure(valeur: unknown): number | null {
  const n = typeof valeur === "string" ? Number(valeur) : valeur;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null;
}

/** `body_scan` (jsonb) → les 8 mesures, valeurs natives, `null` si absentes. */
export function scanDepuisBodyScan(brut: Record<string, unknown> | null | undefined): ScanValues | null {
  if (!brut) return null;
  return {
    weight: mesure(brut.weight),
    bodyFat: mesure(brut.bodyFat),
    muscleMass: mesure(brut.muscleMass),
    hydration: mesure(brut.hydration),
    visceralFat: mesure(brut.visceralFat),
    metabolicAge: mesure(brut.metabolicAge),
    bmr: mesure(brut.bmr),
    boneMass: mesure(brut.boneMass),
  };
}

/**
 * Les 8 mesures → `BodyScanMetrics`. Une mesure non saisie s'écrit 0, comme le
 * fait déjà `buildEmptyBodyScan` : c'est la convention « non mesuré » du schéma.
 */
function versBodyScan(valeurs: ScanValues): BodyScanMetrics {
  const n = (v: number | null) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  return {
    weight: n(valeurs.weight),
    bodyFat: n(valeurs.bodyFat),
    muscleMass: n(valeurs.muscleMass),
    hydration: n(valeurs.hydration),
    boneMass: n(valeurs.boneMass),
    visceralFat: n(valeurs.visceralFat),
    bmr: n(valeurs.bmr),
    metabolicAge: n(valeurs.metabolicAge),
  };
}

/**
 * L'objectif du membre n'a que deux sens possibles à l'écran : on cherche à
 * descendre, ou à monter. Les sous-objectifs sport qui visent la masse basculent
 * du côté « prise de masse » ; le coach peut de toute façon corriger en un tap,
 * ce réglage ne touche que la couleur.
 */
export function objectifAffichable(objectif: string | null | undefined): Goal {
  return objectif === "mass-gain" || objectif === "strength" || objectif === "sport"
    ? "mass-gain"
    : "weight-loss";
}

/** Le jour d'une date EN HEURE LOCALE : `toISOString()` recule d'un jour la nuit. */
function jourLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** La date du jour, en heure locale, au format `AAAA-MM-JJ`. */
export function dateDuJour(): string {
  return jourLocal(new Date());
}

/**
 * Ce timestamp tombe-t-il sur la journée d'aujourd'hui ?
 *
 * Sert à ne PAS traiter la pesée d'un autre jour comme celle d'aujourd'hui :
 * un bilan des 10 inachevé se recharge d'un jour à l'autre (il est filtré sur
 * `completed_at is null`, pas sur la date), et l'id de pesée rangé dans sa
 * checklist survit avec lui.
 */
export function estDeAujourdhui(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return !Number.isNaN(d.getTime()) && jourLocal(d) === dateDuJour();
}

// -----------------------------------------------------------------------------
// Lecture du contexte
// -----------------------------------------------------------------------------

/**
 * Tout ce qu'il faut savoir avant d'écrire : l'objectif, le programme et le RDV
 * à redonner tels quels, et le point de départ à afficher en face de la pesée.
 */
export async function chargerContextePesee(clientId: string): Promise<ContextePesee | null> {
  const sb = await getSupabaseClient();
  if (!sb) return null;

  const [clientRes, bilansRes, suiviRes] = await Promise.all([
    sb.from("clients").select("objective, current_program, next_follow_up").eq("id", clientId).maybeSingle(),
    sb
      .from("assessments")
      .select("id, date, body_scan, questionnaire, pedagogical_focus")
      .eq("client_id", clientId)
      .order("date", { ascending: true }),
    sb.from("follow_ups").select("due_date, type, status").eq("client_id", clientId).maybeSingle(),
  ]);

  const client = clientRes.data as
    | { objective: string | null; current_program: string | null; next_follow_up: string | null }
    | null;
  if (!client) return null;

  const bilans = (bilansRes.data ?? []) as LigneBilan[];

  // La pesée du jour, si la feuille a déjà été validée puis rouverte : on la
  // remet dans les champs plutôt que de laisser le coach croire qu'il doit tout
  // ressaisir. Elle est aussi EXCLUE du point de départ ci-dessous — sinon un
  // membre sans bilan initial chiffré se comparerait à lui-même.
  const aujourdhui = dateDuJour();
  const ligneDuJour = [...bilans]
    .reverse()
    .find((b) => typeof b.id === "string" && b.id.startsWith(PREFIXE_ID) && b.date === aujourdhui);
  const peseeDuJour = ligneDuJour
    ? { id: ligneDuJour.id, date: ligneDuJour.date, scan: scanDepuisBodyScan(ligneDuJour.body_scan) }
    : null;

  // Le point de départ n'est PAS forcément le premier bilan : une fiche créée
  // sans pesée porte un body scan à zéro. On prend le premier qui a un poids —
  // sans quoi l'écart se calculerait contre du vide et s'annoncerait « stable ».
  let depart: ScanValues | null = null;
  let departDate: string | null = null;
  for (const b of bilans) {
    if (peseeDuJour && b.id === peseeDuJour.id) continue;
    const scan = scanDepuisBodyScan(b.body_scan);
    if (scan && scan.weight != null) {
      depart = scan;
      departDate = b.date;
      break;
    }
  }

  const dernier = bilans.length ? bilans[bilans.length - 1] : null;
  const suivi = suiviRes.data as { due_date: string | null; type: string | null; status: string | null } | null;

  const statutBrut = (suivi?.status ?? "scheduled") as FollowUp["status"];
  const dansUnMois = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  return {
    objectifNatif: (client.objective ?? "weight-loss") as Objective,
    objectifAffiche: objectifAffichable(client.objective),
    programme: client.current_program ?? "",
    prochainRdv: suivi?.due_date ?? client.next_follow_up ?? dansUnMois,
    suiviType: suivi?.type ?? "Bilan des 10",
    suiviStatut: STATUTS_SUIVI.includes(statutBrut) ? statutBrut : "scheduled",
    depart,
    departDate,
    peseeDuJour,
    questionnaire: dernier?.questionnaire ?? ({} as AssessmentQuestionnaire),
    pedagogicalFocus: dernier?.pedagogical_focus ?? [],
  };
}

// -----------------------------------------------------------------------------
// Écriture
// -----------------------------------------------------------------------------

export interface ResultatPesee {
  assessmentId: string;
  /** `true` si le bilan vient d'être créé, `false` s'il a été corrigé. */
  cree: boolean;
}

/**
 * Enregistre la 2ᵉ pesée : création du bilan de suivi la première fois,
 * correction ensuite — par l'API service_role, seul chemin d'édition possible.
 */
export async function enregistrerPeseeBilan10(params: {
  clientId: string;
  contexte: ContextePesee;
  valeurs: ScanValues;
  /** L'id déjà rangé dans `club_bilans.steps`, s'il y en a un. */
  assessmentIdConnu: string | null;
}): Promise<ResultatPesee> {
  const { clientId, contexte, valeurs, assessmentIdConnu } = params;

  // Échouer tout de suite, et clairement, plutôt qu'au fond d'un service.
  const sb = await getSupabaseClient();
  if (!sb) throw new Error("Connexion indisponible — la pesée n'a pas été enregistrée.");

  const bodyScan = versBodyScan(valeurs);
  const idCible = assessmentIdConnu ?? (await chercherPeseeDuJour(clientId));

  if (idCible) {
    // Correction d'une pesée déjà écrite AUJOURD'HUI. On relit le bilan entier
    // puis on ne change que son body scan (cf. l'en-tête : c'est l'API
    // service_role qui écrit, et elle réécrit toutes les colonnes).
    const existant = await lireBilan(clientId, idCible);

    if (existant && existant.type !== "follow-up") {
      // Inatteignable en pratique (l'id visé porte toujours le préfixe
      // `a-b10-` et le type « follow-up »), mais on ne réécrit jamais un bilan
      // initial par accident : ce serait toucher au point de départ du membre.
      throw new Error("Le bilan visé n'est pas une pesée du bilan des 10 — rien n'a été modifié.");
    }

    if (existant) {
      await updateSupabaseAssessment(clientId, { ...existant, bodyScan });
      void rafraichirRecap(clientId);
      return { assessmentId: idCible, cree: false };
    }
    // La ligne visée n'existe plus (bilan supprimé depuis l'app coach) : on
    // repart sur une création plutôt que de perdre la pesée du jour.
  }

  const assessment: AssessmentRecord = {
    id: `${PREFIXE_ID}${clientId}-${Date.now()}`,
    date: dateDuJour(),
    type: "follow-up",
    objective: contexte.objectifNatif,
    // Programme et RDV redonnés tels quels : le service les réécrit sur la fiche.
    programTitle: contexte.programme,
    summary: "Bilan des 10 au club — 2ᵉ scan corporel.",
    notes: "",
    nextFollowUp: contexte.prochainRdv,
    bodyScan,
    questionnaire: contexte.questionnaire,
    pedagogicalFocus: contexte.pedagogicalFocus,
  };

  await addSupabaseFollowUpAssessment(clientId, assessment, {
    dueDate: contexte.prochainRdv,
    type: contexte.suiviType,
    status: contexte.suiviStatut,
  });

  void rafraichirRecap(clientId);
  return { assessmentId: assessment.id, cree: true };
}

/**
 * Le bilan visé, relu ENTIER — SAUF son body scan, que la correction remplace.
 * `/api/update-assessment` réécrit toutes les colonnes du bilan : on lui redonne
 * donc ce qui est déjà en base. Le type exclut `bodyScan` pour qu'aucun appelant
 * ne puisse envoyer par mégarde un scan à zéro. `null` si la ligne n'existe plus.
 */
async function lireBilan(
  clientId: string,
  assessmentId: string,
): Promise<Omit<AssessmentRecord, "bodyScan"> | null> {
  const sb = await getSupabaseClient();
  if (!sb) return null;
  const { data } = await sb
    .from("assessments")
    .select("id, date, type, objective, program_id, program_title, summary, notes, next_follow_up, questionnaire, pedagogical_focus")
    .eq("id", assessmentId)
    .eq("client_id", clientId)
    .maybeSingle();

  const r = data as
    | {
        id: string;
        date: string;
        type: string | null;
        objective: string | null;
        program_id: string | null;
        program_title: string | null;
        summary: string | null;
        notes: string | null;
        next_follow_up: string | null;
        questionnaire: AssessmentQuestionnaire | null;
        pedagogical_focus: string[] | null;
      }
    | null;
  if (!r) return null;

  return {
    id: String(r.id),
    date: String(r.date),
    type: (r.type ?? "follow-up") as AssessmentRecord["type"],
    objective: (r.objective ?? "weight-loss") as Objective,
    ...(r.program_id ? { programId: r.program_id } : {}),
    programTitle: r.program_title ?? "",
    summary: r.summary ?? "",
    notes: r.notes ?? "",
    ...(r.next_follow_up ? { nextFollowUp: r.next_follow_up } : {}),
    questionnaire: r.questionnaire ?? ({} as AssessmentQuestionnaire),
    pedagogicalFocus: r.pedagogical_focus ?? [],
  };
}

/**
 * Le filet de sécurité : un bilan des 10 déjà écrit aujourd'hui pour ce membre.
 * Sert quand l'id n'a pas pu être rangé dans la checklist, ou quand le bilan
 * précédent a été clôturé et que la feuille repart d'une case vierge.
 */
async function chercherPeseeDuJour(clientId: string): Promise<string | null> {
  try {
    const sb = await getSupabaseClient();
    if (!sb) return null;
    const { data } = await sb
      .from("assessments")
      .select("id")
      .eq("client_id", clientId)
      .eq("type", "follow-up")
      .eq("date", dateDuJour())
      .like("id", `${PREFIXE_ID}%`)
      .order("id", { ascending: false })
      .limit(1);
    const ligne = (data ?? [])[0] as { id: string } | undefined;
    return ligne ? String(ligne.id) : null;
  } catch {
    // Le garde-fou n'est pas la sécurité principale (l'id rangé dans la
    // checklist l'est) : s'il échoue, on ne bloque pas la pesée.
    return null;
  }
}

/**
 * Le récap figé (`client_recaps`) alimente l'écran du membre en cas de panne de
 * l'edge function. Sans ce refresh il garderait les chiffres du bilan initial.
 * Non bloquant : la pesée, elle, est déjà écrite.
 */
async function rafraichirRecap(clientId: string): Promise<void> {
  try {
    await refreshClientRecap(clientId);
  } catch {
    // silencieux volontairement : c'est un confort, pas le livrable.
  }
}
