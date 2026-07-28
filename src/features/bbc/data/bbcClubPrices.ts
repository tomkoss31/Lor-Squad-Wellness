// =============================================================================
// La recette du club — ce qu'il y a DANS le verre, et ce que ça coûte.
//
// Ce fichier portait avant toute une ardoise de bar : ~26 lignes de produits,
// leur rayon, leur libellé, un prix de vente relevé sur un tarif annoté, un
// prix conseillé, une marge par dose. Tout ça a été retiré le 2026-07-28.
//
// POURQUOI. Aucun écran de l'app n'encaisse au comptoir : ces prix de vente ne
// pilotaient rien, ils demandaient juste au coach de valider 26 lignes pour le
// plaisir. La carte des membres est PHYSIQUE, affichée au club — l'app n'a pas
// à la dupliquer. Décision Thomas : « je ne veux pas surcharger l'app de choses
// qui ne sont pas essentielles ».
//
// CE QUI RESTE, et pourquoi c'est le seul morceau qui comptait : le COÛT DE
// REVIENT D'UNE VISITE (~3,67 €). Lui alimente le calculateur de rentabilité
// (`BbcClub100`), donc le point mort, donc la décision d'ouvrir ou pas. Il ne
// dépend que de 4 produits et de la dose servie de chacun.
//
// ⚠️ Les doses ci-dessous viennent de Thomas (25/07/2026), pas d'un calcul.
// Ne pas les « corriger » : c'est la recette réellement servie au BBC, et elle
// n'est pas celle du Shake Bar (30 g de PDM là-bas, 14 g ici — autre commerce).
//
// La recette réellement appliquée vit dans `clubs.settings.carte` (jsonb, cf.
// `useClubSettings`), saisie dans l'onglet Rentabilité. Ce fichier n'en est que
// le point de départ pour un club qui n'a rien personnalisé.
// =============================================================================

import { getProductByRef } from "../../../data/herbalifeCatalog";

export interface IngredientRecette {
  /** Référence Herbalife — clé de jointure avec `herbalifeCatalog`. */
  ref: string;
  /** Nom court, pour étiqueter le champ de saisie de la dose. */
  nom: string;
  /** La dose servie, telle que Thomas la mesure au bar. */
  dose: string;
  /** Format du contenant — affiché pour que le calcul reste vérifiable à l'œil. */
  contenant: string;
  /** Doses tirées d'un contenant à cette dose-là (contenant ÷ dose). */
  doses: number;
}

/**
 * Les 4 produits qui composent ce qu'on sert le matin. Un shake de 400 ml, ce
 * n'est PAS que du F1 (il y a du PDM dedans) ; une boisson, ce n'est pas que du
 * thé (il y a de l'aloé). Oublier un composant fausserait le coût vers le bas
 * et flatterait la marge — c'est exactement le piège que cette liste évite.
 */
export const RECETTE_CLUB: IngredientRecette[] = [
  { ref: "4466", nom: "Formula 1", dose: "26 g par shake", contenant: "pot de 550 g", doses: 21 },
  { ref: "2600", nom: "Protéines PDM", dose: "14 g par shake", contenant: "pot de 588 g", doses: 42 },
  { ref: "178K", nom: "Thé", dose: "1,7 g par boisson", contenant: "pot de 51 g", doses: 30 },
  { ref: "0006", nom: "Aloé Vera", dose: "10 ml par boisson", contenant: "flacon de 473 ml", doses: 47 },
];

/**
 * Ce qu'un membre repart consommer quand il passe le matin : un shake et une
 * boisson. C'est CE coût-là qu'il faut comparer au prix d'une visite (carte 10
 * ou 30) — jamais le prix d'un produit isolé.
 */
export const PETIT_DEJ = {
  shake: { libelle: "un shake", refs: ["4466", "2600"] },
  boisson: { libelle: "une boisson", refs: ["178K", "0006"] },
} as const;

/**
 * Coût d'une dose pour le coach.
 *
 * Le tarif Herbalife donne le prix payé par le distributeur selon son palier de
 * remise (25 / 35 / 42 / 50 %). On part du prix public du catalogue et on
 * applique le palier — la formule reste affichée à l'écran pour que le coach
 * puisse la confronter à sa facture réelle. `null` si les doses sont inconnues.
 */
export function coutParDose(prixPublicContenant: number, doses: number | null, tauxRemise: number): number | null {
  if (!doses || doses <= 0) return null;
  return (prixPublicContenant * (1 - tauxRemise / 100)) / doses;
}

/**
 * Coût de revient d'un ensemble de doses (ex. le shake = F1 + PDM).
 * `null` dès qu'une dose manque — on préfère ne rien afficher qu'un chiffre qui
 * oublierait un ingrédient.
 */
export function coutServi(
  refs: readonly string[],
  doses: Record<string, number | null | undefined>,
  tauxRemise: number,
): number | null {
  let total = 0;
  for (const ref of refs) {
    const produit = getProductByRef(ref);
    const c = produit ? coutParDose(produit.publicPrice, doses[ref] ?? null, tauxRemise) : null;
    if (c == null) return null;
    total += c;
  }
  return total;
}

/**
 * Ce que coûte au coach un membre qui passe le matin, d'après SA recette.
 * Sert au calculateur de rentabilité, qui sinon redemanderait un chiffre que
 * l'app vient de calculer. `null` tant qu'une dose de la recette manque.
 */
export function coutVisiteDepuisCarte(
  doses: Record<string, number | null | undefined>,
  tauxRemise: number,
): number | null {
  const shake = coutServi(PETIT_DEJ.shake.refs, doses, tauxRemise);
  const boisson = coutServi(PETIT_DEJ.boisson.refs, doses, tauxRemise);
  if (shake == null || boisson == null) return null;
  return shake + boisson;
}

/** Les doses de la recette de référence, pour un club qui n'a rien personnalisé. */
export function dosesParDefaut(): Record<string, number | null> {
  return Object.fromEntries(RECETTE_CLUB.map((l) => [l.ref, l.doses]));
}

/** Les paliers de remise Herbalife — le coût d'une dose en dépend directement. */
export const PALIERS_REMISE = [25, 35, 42, 50] as const;
export type PalierRemise = (typeof PALIERS_REMISE)[number];
