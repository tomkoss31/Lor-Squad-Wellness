// =============================================================================
// caseLead — LA case d'un lead. Une seule, pour tout l'écran.
//
// LE BUG QU'ON SUPPRIME (constat Thomas, 28/08, vérifié dans l'app) : la jauge
// annonçait « Contacté 18 » et se voulait cliquable. On tapait dessus, et la
// liste affichait 7 lignes dont AUCUNE n'était contactée. Les compteurs du haut
// et les lignes du bas ne parlaient pas de la même chose : la jauge comptait un
// entonnoir CUMULÉ (chacun compte dans toutes les étapes qu'il a franchies)
// pendant que la liste, elle, rangeait chaque personne à un seul endroit.
//
// La règle est donc : chaque personne est dans UNE case et une seule, et la
// somme des cases fait le total. La jauge compte avec cette fonction, la liste
// filtre avec cette fonction — elles ne PEUVENT plus se contredire.
//
// Module pur : aucune requête, aucun rendu. C'est ce qui le rend testable.
// =============================================================================

import { etapeDuLead, type LeadEtape } from "./etapeLead";

/** Les cases du flux actif — celles que la jauge propose comme filtres. */
export const CASES_ACTIVES = ["nouveau", "contacte", "relance", "rdv"] as const;
export type CaseActive = (typeof CASES_ACTIVES)[number];

/** Toutes les cases, y compris celles qui sortent du flux. */
export type CaseLead = CaseActive | "converti" | "perdu" | "endormi";

/** Ce qu'on montre sur la puce de chaque case. */
export const LIBELLE_CASE: Record<CaseLead, string> = {
  nouveau: "Nouveau",
  contacte: "Contacté",
  relance: "À relancer",
  rdv: "RDV calé",
  converti: "Converti",
  perdu: "Perdu",
  endormi: "Endormi",
};

/**
 * Range un lead dans SA case. L'ordre des tests porte la logique métier :
 *
 * 1. Endormi passe avant tout : c'est un choix explicite du coach de le sortir
 *    du flux, il ne doit pas réapparaître dans un compteur actif.
 * 2. Converti / perdu : deux fins de parcours, elles priment sur le reste.
 * 3. Un rendez-vous à venir passe AVANT l'échéance de relance — quelqu'un qui
 *    a un créneau vendredi n'est pas « à relancer » parce qu'un rappel traîne,
 *    il faut le recevoir. (Même ordre que `zoneDe` et que le board.)
 * 4. Sinon, l'échéance de relance.
 * 5. Sinon, son étape brute.
 */
export function caseDuLead(l: LeadEtape): CaseLead {
  if (l.dormant) return "endormi";
  const etape = etapeDuLead(l);
  if (etape === "converted") return "converti";
  if (etape === "lost") return "perdu";
  if (etape === "qualified") return "rdv";
  if (l.relanceDue) return "relance";
  return etape === "contacted" ? "contacte" : "nouveau";
}

/** Est-ce que ce lead demande un geste aujourd'hui ? Sert à couper la liste en
 *  « À faire aujourd'hui » / « Le reste ». Un rendez-vous à venir n'en demande
 *  pas : il est calé, il n'y a rien à faire d'ici là. */
export function demandeUnGeste(l: LeadEtape): boolean {
  const c = caseDuLead(l);
  if (c === "nouveau") return true; // personne ne lui a parlé
  if (c === "relance") return true; // le filet a sonné
  return false;
}

export type ComptesParCase = Record<CaseLead, number>;

/** Compte chaque case. La somme des cases DOIT faire le total — c'est ce que
 *  le test garantit, et c'est ce qui empêche la jauge de mentir. */
export function compterParCase(leads: LeadEtape[]): ComptesParCase {
  const c: ComptesParCase = {
    nouveau: 0, contacte: 0, relance: 0, rdv: 0,
    converti: 0, perdu: 0, endormi: 0,
  };
  for (const l of leads) c[caseDuLead(l)] += 1;
  return c;
}

/** Combien de personnes sont encore « en cours » — ni converties, ni perdues,
 *  ni endormies. C'est le chiffre affiché à côté de la jauge. */
export function totalEnCours(comptes: ComptesParCase): number {
  return CASES_ACTIVES.reduce((n, k) => n + comptes[k], 0);
}
