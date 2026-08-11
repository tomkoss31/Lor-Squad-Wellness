// =============================================================================
// Avant / après des membres — site public du Breakfast Club.
//
// ⚠️ POUR AJOUTER QUELQU'UN : déposer le visuel dans
// public/brand/breakfast-club/resultats/ puis ajouter une entrée ici. C'est le
// SEUL fichier à toucher, le composant s'adapte.
//
// ⚠️ CE QUI EST VIDE EST VIDE EXPRÈS. Cinq personnes n'ont pas de prénom et
// aucune n'a de durée ni de citation : je ne les connais pas, et on ne remplit
// pas une preuve avec de l'inventé. Une photo sans prénom reste une preuve
// honnête ; une photo avec un faux prénom n'en est plus une. Thomas complète
// `nom`, `duree` et `mots` quand il les a — l'affichage suit tout seul.
//
// ⚠️ RATIO D'ORIGINE, JAMAIS DE RECADRAGE. Ce sont des diptyques déjà composés
// (avant | après côte à côte, ratios mesurés de 1,00 à 1,35). Les forcer dans
// un cadre commun couperait une des deux moitiés — donc précisément la
// comparaison qu'on vient montrer.
//
// ⚠️ MENTION OBLIGATOIRE : « résultats individuels » sous la grille. Une
// transformation n'est pas une promesse, et la page le dit déjà en titre.
// =============================================================================

export type ClubResultat = {
  /** Nom du fichier dans public/brand/breakfast-club/resultats/ (sans .jpg). */
  slug: string;
  /** Prénom, si on l'a. Vide = la photo s'affiche sans légende. */
  nom?: string;
  /** Ex. « 8 mois ». Vide tant qu'on ne l'a pas — on n'invente pas une durée. */
  duree?: string;
  /** Ses mots, si elle/il nous les a donnés. */
  mots?: string;
};

export const CLUB_RESULTATS: ClubResultat[] = [
  { slug: "heleane", nom: "Héléane" },
  { slug: "margaux", nom: "Margaux" },
  { slug: "margaux-2", nom: "Margaux" },
  { slug: "fanny", nom: "Fanny" },
  { slug: "joel", nom: "Joël" },
  // Prénoms à compléter par Thomas.
  { slug: "membre-a" },
  { slug: "membre-b" },
  { slug: "membre-c" },
  { slug: "membre-d" },
  { slug: "membre-e" },
];
