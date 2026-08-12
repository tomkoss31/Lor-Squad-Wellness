// =============================================================================
// Avant / après des membres — site public du Breakfast Club.
//
// ⚠️ POUR AJOUTER QUELQU'UN : déposer le visuel dans
// public/brand/breakfast-club/resultats/ puis ajouter une entrée ici. C'est le
// SEUL fichier à toucher, le composant s'adapte.
//
// ⚠️ CE QUI EST VIDE EST VIDE EXPRÈS. Les dix prénoms sont là (Thomas a
// renommé les fichiers), mais AUCUNE durée ni citation : on ne remplit pas une
// preuve avec de l'inventé. « −18 kg en 6 mois » sous une photo, ça ne se
// devine pas — ça se demande à la personne. Thomas complète `duree` et `mots`
// quand il les a, l'affichage suit tout seul.
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
  { slug: "marie", nom: "Marie" },
  { slug: "julie", nom: "Julie" },
  { slug: "joel", nom: "Joël" },
  { slug: "tom", nom: "Tom" },
  { slug: "jean", nom: "Jean" },
  { slug: "lucas", nom: "Lucas" },
];
