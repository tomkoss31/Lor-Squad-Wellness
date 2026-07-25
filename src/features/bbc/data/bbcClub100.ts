// =============================================================================
// bbcClub100 — les repères du modèle « Club 100 » et le calcul de rentabilité.
//
// ⚠️ DEUX NATURES DE CHIFFRES, à ne jamais mélanger :
//
//  1. SOURCÉS — Notion « 00 — La machine à royalties » (Clare & Dan) :
//     100 membres actifs · 3 superviseurs actifs (junior partners) ·
//     9 coachs stagiaires · ~13 superviseurs au total · 20 000 PV
//     d'organisation · 40 % des membres viennent chaque jour.
//     Échelle : 1 club ≈ 20 000 PV · 2 clubs ≈ 35 000 · 3 clubs ≈ 50 000.
//
//  2. VALIDÉS PAR THOMAS (2026-07-25) : carte 10 visites = 80 € ·
//     carte 30 visites = 185 €.
//
// Tout le reste (prix par visite, chiffre d'affaires, marge, point mort) est
// CALCULÉ à partir de ces entrées — rien n'est inventé. Les coûts (portion,
// loyer, charges) ne sont pas connus : ils sont SAISIS par le coach.
// =============================================================================

/** Repères du modèle, sourcés. Ne pas modifier sans changer la source. */
export const CLUB100 = {
  membres: 100,
  superviseursActifs: 3,
  coachsStagiaires: 9,
  superviseursTotal: 13,
  pvOrganisation: 20000,
  /** Part des membres qui viennent chaque jour. */
  frequentation: 0.4,
  /** Le club ouvre 6 matins par semaine (7h-11h). */
  joursParSemaine: 6,
} as const;

/** Échelle organisation (sourcée). */
export const ECHELLE_ORG = [
  { clubs: 1, superviseurs: 13, pv: 20000 },
  { clubs: 2, superviseurs: 33, pv: 35000 },
  { clubs: 3, superviseurs: 43, pv: 50000 },
] as const;

/** Prix des cartes — validés par Thomas. */
export const PRIX_CARTE = { c10: 80, c30: 185 } as const;

export interface RentaInput {
  membres: number;
  frequentation: number; // 0-1
  joursParSemaine: number;
  prixCarte10: number;
  prixCarte30: number;
  /** Part des membres en carte 30 (0-1) ; le reste est en carte 10. */
  partCarte30: number;
  /** Coût matière d'une portion servie (€). Inconnu → saisi. */
  coutPortion: number;
  /** Loyer + charges fixes mensuels (€). Inconnu → saisi. */
  chargesFixes: number;
}

export interface RentaResult {
  prixVisite10: number;
  prixVisite30: number;
  prixVisiteMoyen: number;
  visitesParJour: number;
  visitesParMois: number;
  caMensuel: number;
  coutProduits: number;
  margeBrute: number;
  margeParVisite: number;
  resultatMensuel: number;
  /** Visites/mois nécessaires pour couvrir les charges fixes. */
  seuilVisites: number | null;
  /** Membres nécessaires pour atteindre ce seuil. */
  seuilMembres: number | null;
}

/** Semaines moyennes par mois (52 / 12) — évite le biais du « 4 semaines ». */
const SEMAINES_PAR_MOIS = 52 / 12;

export function calculerRenta(i: RentaInput): RentaResult {
  const prixVisite10 = i.prixCarte10 > 0 ? i.prixCarte10 / 10 : 0;
  const prixVisite30 = i.prixCarte30 > 0 ? i.prixCarte30 / 30 : 0;
  const part30 = Math.min(Math.max(i.partCarte30, 0), 1);
  const prixVisiteMoyen = prixVisite30 * part30 + prixVisite10 * (1 - part30);

  const visitesParJour = i.membres * Math.min(Math.max(i.frequentation, 0), 1);
  const visitesParMois = visitesParJour * i.joursParSemaine * SEMAINES_PAR_MOIS;

  const caMensuel = visitesParMois * prixVisiteMoyen;
  const coutProduits = visitesParMois * Math.max(i.coutPortion, 0);
  const margeBrute = caMensuel - coutProduits;
  const margeParVisite = prixVisiteMoyen - Math.max(i.coutPortion, 0);
  const resultatMensuel = margeBrute - Math.max(i.chargesFixes, 0);

  const seuilVisites = margeParVisite > 0 ? i.chargesFixes / margeParVisite : null;
  const visitesParMoisParMembre =
    i.membres > 0 ? visitesParMois / i.membres : 0;
  const seuilMembres =
    seuilVisites !== null && visitesParMoisParMembre > 0
      ? seuilVisites / visitesParMoisParMembre
      : null;

  return {
    prixVisite10,
    prixVisite30,
    prixVisiteMoyen,
    visitesParJour,
    visitesParMois,
    caMensuel,
    coutProduits,
    margeBrute,
    margeParVisite,
    resultatMensuel,
    seuilVisites,
    seuilMembres,
  };
}

export const DEFAULT_RENTA: RentaInput = {
  membres: CLUB100.membres,
  frequentation: CLUB100.frequentation,
  joursParSemaine: CLUB100.joursParSemaine,
  prixCarte10: PRIX_CARTE.c10,
  prixCarte30: PRIX_CARTE.c30,
  partCarte30: 0.5,
  coutPortion: 0, // inconnu : à saisir
  chargesFixes: 0, // inconnu : à saisir
};
