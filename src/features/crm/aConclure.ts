// =============================================================================
// aConclure — « ce rendez-vous est passé. Elle est venue, ou pas ? »
//
// LE TROU, mesuré en base le 28/08/2026 : 5 rendez-vous étaient encore
// « confirmed » alors que leur créneau était passé, 2 demandes n'avaient jamais
// été acceptées et leur date était passée aussi. Sur 31 rendez-vous, UN SEUL
// portait `honored`. Rien dans l'app ne posait la question, donc personne n'y
// répondait, et ces gens ne revenaient jamais dans aucune file.
//
// Ce module ne fait que DÉCIDER. Il ne lit pas la base, n'écrit rien, ne rend
// aucun écran — c'est ce qui le rend testable, et c'est la règle qu'on s'est
// donnée après avoir trouvé la même logique réécrite à trois endroits.
//
// ── LA RÈGLE ────────────────────────────────────────────────────────────────
// Un rendez-vous est « à conclure » quand :
//   1. son créneau est passé (avec la même grâce de 15 min que partout) ;
//   2. il n'a pas encore été soldé (`honored` / `no_show` / `canceled`) ;
//   3. il ne date pas de plus de 14 jours — au-delà, un rendez-vous ne se
//      solde plus, il s'oublie, et la liste deviendrait un cimetière.
// =============================================================================

import { RDV_GRACE_PERIOD_MS } from "../../lib/timeConstants";
import type { CleReponse } from "./qualification";

/** Au-delà, on n'demande plus : le rendez-vous s'oublie. Même borne que
 *  `useClubDiscoveryBookings`, qui remonte les créneaux des 14 derniers jours. */
export const FENETRE_A_CONCLURE_MS = 14 * 24 * 60 * 60 * 1000;

/** Les statuts qui signifient « déjà soldé » : plus rien à demander. */
const SOLDES = new Set(["honored", "no_show", "canceled"]);

export interface RdvConcluable {
  id: string;
  /** ISO 8601. */
  slotStart: string;
  status: string;
}

/**
 * Ce rendez-vous attend-il une réponse ?
 * `maintenant` est injecté : aucun appel à Date.now() ici, sinon les tests
 * dépendent de l'heure à laquelle on les lance.
 */
export function estAConclure(rdv: RdvConcluable, maintenant: Date): boolean {
  if (SOLDES.has(rdv.status)) return false;
  const t = new Date(rdv.slotStart).getTime();
  if (Number.isNaN(t)) return false;
  const ecoule = maintenant.getTime() - t;
  // Pas encore commencé (ou en cours, dans la grâce) → ce n'est pas à conclure.
  if (ecoule < RDV_GRACE_PERIOD_MS) return false;
  // Trop vieux → on n'en parle plus.
  if (ecoule > FENETRE_A_CONCLURE_MS) return false;
  return true;
}

/** Les rendez-vous à solder, le plus ancien d'abord : c'est celui qui traîne
 *  depuis le plus longtemps qu'il faut ranger en premier. */
export function rdvAConclure<T extends RdvConcluable>(rdvs: T[], maintenant: Date): T[] {
  return rdvs
    .filter((r) => estAConclure(r, maintenant))
    .sort((a, b) => new Date(a.slotStart).getTime() - new Date(b.slotStart).getTime());
}

// ── LES TROIS ISSUES ────────────────────────────────────────────────────────

/** Ce qu'on peut répondre devant un rendez-vous passé. */
export type IssueRdv = "venue_demarre" | "venue_pas_demarre" | "pas_venue";

export interface EffetIssue {
  /** Le statut à écrire sur `rdv_bookings`. */
  statutRdv: "honored" | "no_show";
  /** La réponse à écrire sur le lead — null quand il quitte la file. */
  reponseLead: CleReponse | null;
  /** La personne sort-elle du CRM (devient cliente) ? */
  sortDuCrm: boolean;
  /** Faut-il proposer d'écrire à la personne ? (le lapin, oui ; le reste, non
   *  — elle vient de vous voir en face.) */
  proposerMail: boolean;
  /** Ce qu'on affiche sur le bouton. */
  libelle: string;
}

/**
 * L'effet de chaque réponse. Une seule table, pour que les trois écrans qui
 * poseront la question un jour écrivent exactement la même chose.
 *
 * Délais validés par Thomas le 28/08 : pas venue → J+2 (`pas_venue`),
 * venue mais pas démarré → J+7 (`venue_pas_demarre`). Les jours eux-mêmes
 * vivent dans `qualification.ts`, avec toutes les autres échéances.
 */
export const EFFET_ISSUE: Record<IssueRdv, EffetIssue> = {
  venue_demarre: {
    statutRdv: "honored",
    reponseLead: null,
    sortDuCrm: true,
    proposerMail: false,
    libelle: "Venue · elle démarre",
  },
  venue_pas_demarre: {
    statutRdv: "honored",
    reponseLead: "venue_pas_demarre",
    sortDuCrm: false,
    proposerMail: false,
    libelle: "Venue · pas démarré",
  },
  pas_venue: {
    statutRdv: "no_show",
    reponseLead: "pas_venue",
    sortDuCrm: false,
    proposerMail: true,
    libelle: "Pas venue",
  },
};

/** Depuis combien de temps ce rendez-vous attend une réponse. Sert à écrire
 *  « passé il y a 3 jours » sur la carte — un chiffre, pas un « récemment ». */
export function retardEnJours(rdv: RdvConcluable, maintenant: Date): number {
  const t = new Date(rdv.slotStart).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((maintenant.getTime() - t) / (24 * 60 * 60 * 1000)));
}
