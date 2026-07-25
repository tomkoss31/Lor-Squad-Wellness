// =============================================================================
// La carte du club — ce qu'on sert AU BAR, à l'unité.
//
// Pourquoi ce fichier existe : le catalogue Herbalife (`src/data/herbalifeCatalog.ts`)
// donne le prix d'un CONTENANT (un pot de 550 g, une boîte de 10 sachets). Le club
// ne vend pas des pots : il vend un shake, une tasse de thé, un verre d'aloé. Il
// manquait donc deux informations que le tarif ne porte pas :
//   1. combien de doses il y a dans un contenant  → `doses`
//   2. à combien on vend LA dose au comptoir      → prix de la carte
//
// ⚠️ RÈGLE : aucun prix n'est inventé ici.
//   - `prixReleve` = ce qui est écrit à la main sur le tarif du 25/06/2026 que
//     Thomas a photographié. C'est une PROPOSITION affichée au coach, jamais un
//     prix appliqué : tant qu'il ne l'a pas validé dans Réglages → La carte, la
//     ligne est marquée « à valider ».
//   - `doses` n'est renseigné QUE lorsque le contenant l'indique (« boîte de 10
//     sachets », « 14 barres », « 21 sachets ») ou que Thomas l'a noté sur la
//     feuille (« 33d » sur le thé 102 g, « 60d » sur la créatine, « 20S » sur
//     Hydrate). Une poudre en vrac (F1, aloé, thé 51 g) → `null` : le nombre de
//     doses dépend de la dose servie au club, c'est le coach qui la fixe.
//
// La carte réellement appliquée vit dans `clubs.settings.carte` (voir
// `useClubSettings`), ce fichier n'en est que le point de départ. Chaque club
// duplique le modèle avec SES prix — c'est le but.
// =============================================================================

import { getProductByRef, type HerbalifeProduct } from "../../../data/herbalifeCatalog";

/** Rayon du bar — sert à regrouper la carte à l'écran comme sur une ardoise. */
export type RayonCarte = "shake" | "boisson" | "encas" | "energie" | "complement" | "materiel";

export const RAYON_LABELS: Record<RayonCarte, string> = {
  shake: "Shakes",
  boisson: "Boissons",
  encas: "En-cas",
  energie: "Énergie & sport",
  complement: "Compléments",
  materiel: "Shakers & accessoires",
};

export interface LigneCarte {
  /** Référence Herbalife — clé de jointure avec `herbalifeCatalog`. */
  ref: string;
  rayon: RayonCarte;
  /** Nom court affiché sur l'ardoise (ex. « Shake Formula 1 »). */
  libelle: string;
  /** Ce qu'on sert : « un shake », « une tasse », « un sachet »… */
  unite: string;
  /**
   * Doses par contenant. `null` = dépend de la dose servie, à fixer par le coach.
   * `source` dit d'où vient le chiffre pour qu'il soit contestable.
   */
  doses: number | null;
  dosesSource?: "contenant" | "note-tarif";
  /** Prix relevé sur la feuille annotée du 25/06/2026. `null` = rien d'écrit. */
  prixReleve: number | null;
  /** true quand l'annotation manuscrite était nette ; false = lecture à confirmer. */
  releveNet: boolean;
}

/**
 * Les lignes de la carte. Un seul représentant par famille de saveurs (les 8
 * parfums de F1 ont le même prix — inutile de les lister un par un au bar).
 */
export const CARTE_CLUB: LigneCarte[] = [
  // ─── Shakes ───────────────────────────────────────────────────────────────
  { ref: "4466", rayon: "shake", libelle: "Shake Formula 1", unite: "un shake", doses: null, prixReleve: 2.8, releveNet: true },
  { ref: "048K", rayon: "shake", libelle: "Shake Formula 1 · grand format", unite: "un shake", doses: null, prixReleve: 3.8, releveNet: false },
  { ref: "4469", rayon: "shake", libelle: "Shake sans lactose / sans gluten", unite: "un shake", doses: null, prixReleve: 2.8, releveNet: false },
  { ref: "013K", rayon: "shake", libelle: "Shake Tri Blend Select", unite: "un shake", doses: null, prixReleve: null, releveNet: false },
  { ref: "2600", rayon: "shake", libelle: "Boost protéines (PDM)", unite: "une dose", doses: null, prixReleve: null, releveNet: false },
  { ref: "0242", rayon: "shake", libelle: "Boost protéines (Formula 3)", unite: "une dose", doses: null, prixReleve: null, releveNet: false },

  // ─── Boissons ─────────────────────────────────────────────────────────────
  { ref: "178K", rayon: "boisson", libelle: "Thé instantané", unite: "une tasse", doses: null, prixReleve: null, releveNet: false },
  { ref: "179K", rayon: "boisson", libelle: "Thé instantané · grand format", unite: "une tasse", doses: 33, dosesSource: "note-tarif", prixReleve: null, releveNet: false },
  { ref: "0006", rayon: "boisson", libelle: "Aloé Vera", unite: "un verre", doses: null, prixReleve: null, releveNet: false },
  { ref: "1188", rayon: "boisson", libelle: "Aloé Vera · grand format", unite: "un verre", doses: null, prixReleve: null, releveNet: false },
  { ref: "012K", rayon: "boisson", libelle: "Café protéiné glacé", unite: "un verre", doses: null, prixReleve: 5.25, releveNet: true },
  { ref: "2554", rayon: "boisson", libelle: "Boisson multi-fibres", unite: "un verre", doses: null, prixReleve: 1.5, releveNet: true },
  { ref: "201K", rayon: "boisson", libelle: "Fibre Concentrate", unite: "une dose", doses: null, prixReleve: 2.1, releveNet: false },

  // ─── En-cas ───────────────────────────────────────────────────────────────
  { ref: "141K", rayon: "encas", libelle: "Chips protéinées", unite: "un sachet", doses: 10, dosesSource: "contenant", prixReleve: 3.3, releveNet: false },
  { ref: "3968", rayon: "encas", libelle: "Barre protéinée", unite: "une barre", doses: 14, dosesSource: "contenant", prixReleve: 2.3, releveNet: false },
  { ref: "4472", rayon: "encas", libelle: "Barre repas Formula 1 Express", unite: "une barre", doses: null, prixReleve: null, releveNet: false },
  { ref: "149K", rayon: "encas", libelle: "Barre Achieve H24", unite: "une barre", doses: 6, dosesSource: "contenant", prixReleve: 4.6, releveNet: true },

  // ─── Énergie & sport ──────────────────────────────────────────────────────
  { ref: "192K", rayon: "energie", libelle: "LiftOff Max H24", unite: "un sachet", doses: 10, dosesSource: "contenant", prixReleve: 3.85, releveNet: true },
  { ref: "3152", rayon: "energie", libelle: "LiftOff effervescent", unite: "un comprimé", doses: 10, dosesSource: "contenant", prixReleve: 1.95, releveNet: false },
  { ref: "1433", rayon: "energie", libelle: "H24 Hydrate", unite: "un stick", doses: 20, dosesSource: "note-tarif", prixReleve: 2.4, releveNet: true },
  { ref: "402K", rayon: "energie", libelle: "Gel énergétique Prolong", unite: "un gel", doses: 10, dosesSource: "contenant", prixReleve: 3.0, releveNet: false },
  { ref: "403K", rayon: "energie", libelle: "Rebuild Strength", unite: "une dose", doses: null, prixReleve: 5.1, releveNet: false },
  { ref: "488K", rayon: "energie", libelle: "Créatine+", unite: "une dose", doses: 60, dosesSource: "note-tarif", prixReleve: null, releveNet: false },
  { ref: "1466", rayon: "energie", libelle: "CR7 Drive", unite: "un verre", doses: null, prixReleve: 1.4, releveNet: false },

  // ─── Compléments ──────────────────────────────────────────────────────────
  { ref: "173K", rayon: "complement", libelle: "Microbiotic Max", unite: "un sachet", doses: 20, dosesSource: "note-tarif", prixReleve: 3.3, releveNet: false },
  { ref: "233K", rayon: "complement", libelle: "Immune Booster", unite: "un sachet", doses: 21, dosesSource: "contenant", prixReleve: 2.5, releveNet: false },
];

/** Le produit du catalogue derrière une ligne de carte (prix public, PV, nom complet). */
export function produitDeLaLigne(ligne: LigneCarte): HerbalifeProduct | undefined {
  return getProductByRef(ligne.ref);
}

/**
 * Coût d'une dose pour le coach.
 *
 * Le tarif Herbalife donne le prix payé par le distributeur selon son palier de
 * remise (25 / 35 / 42 / 50 %). On part du prix public du catalogue et on applique
 * le palier — la formule est affichée à l'écran pour que le coach puisse la
 * confronter à sa facture réelle. `null` si on ne connaît pas encore les doses.
 */
export function coutParDose(prixPublicContenant: number, doses: number | null, tauxRemise: number): number | null {
  if (!doses || doses <= 0) return null;
  return (prixPublicContenant * (1 - tauxRemise / 100)) / doses;
}

/** Marge dégagée sur une dose vendue au bar. `null` tant qu'il manque une donnée. */
export function margeParDose(prixVente: number | null, cout: number | null): number | null {
  if (prixVente == null || cout == null) return null;
  return prixVente - cout;
}

/** Les paliers de remise Herbalife, pour le sélecteur de Réglages. */
export const PALIERS_REMISE = [25, 35, 42, 50] as const;
export type PalierRemise = (typeof PALIERS_REMISE)[number];
