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
  /**
   * Le résultat, dans les mots de Thomas : « −20 kg en 6 mois ».
   * Vide tant qu'on ne l'a pas — c'est le chiffre qui fait la preuve, et un
   * chiffre inventé la détruit.
   */
  resultat?: string;
  /** Ses mots, si elle/il nous les a donnés. */
  mots?: string;
};

/**
 * Les témoignages autorisés SUR LE SITE PUBLIC DU CLUB — par identifiant.
 *
 * ⚠️ LISTE EXPLICITE, ET SURTOUT PAS UN TIRAGE AUTOMATIQUE de tout ce qui est
 * « approuvé ». La modération de l'app valide qu'un témoignage est authentique ;
 * elle ne dit rien de ce qu'on a le droit d'écrire sur une vitrine de nutrition.
 * Sur les sept approuvés, la relecture du 2026-08-11 en a écarté cinq :
 *
 *   Maria     ✕ finit par « je rejoins l'équipe pour accompagner d'autres
 *               personnes » — un message de recrutement dans un témoignage
 *               produit. C'est précisément le mélange que les règles de conduite
 *               Herbalife interdisent, et il transforme la page en annonce.
 *   Mélanie   ✕ c'est la CO-FONDATRICE. Publier son texte parmi des avis de
 *               membres le fait passer pour celui d'une cliente indépendante.
 *               C'est le point le plus grave des sept.
 *   Virginie  ✕ cite « herbalife », « le thé aloès », « mon shake », et
 *               « moins essoufflé ». Marque + produits nommés + symptôme.
 *   Romane    ✕ cite « les produits Herbalife ». Le site du club ne nomme la
 *               marque nulle part — ce texte la ferait entrer par la bande.
 *   Marjorie  ✕ « moins ballonnée » : décrire l'amélioration d'un symptôme
 *               digestif, c'est une allégation de santé. Un aliment ne peut pas
 *               revendiquer d'agir sur un trouble.
 *
 * Restent les deux qui ne parlent que de ressenti et d'accompagnement, sans
 * marque, sans produit nommé, sans symptôme, sans chiffre : Sabrina et Judith.
 *
 * Pour en ajouter un : le relire avec cette grille, puis coller son id ici.
 * Liste vide = la page garde son texte d'attente, qui reste vrai.
 */
export const CLUB_TEMOIGNAGES_PUBLIES: string[] = [
  "93384eb5-dd5a-4897-adb9-fd39d67c7075", // Sabrina
  "4fff49ff-5e55-4145-a9d3-ef0a3713c291", // Judith
];

export const CLUB_RESULTATS: ClubResultat[] = [
  { slug: "joel", nom: "Joël", resultat: "−20 kg en 6 mois" },
  { slug: "marie", nom: "Marie", resultat: "−17 kg et −60 cm en 18 mois" },
  { slug: "margaux", nom: "Margaux", resultat: "−16 kg en un an" },
  { slug: "jean", nom: "Jean", resultat: "−12 kg, et l'énergie revenue" },
  { slug: "fanny", nom: "Fanny", resultat: "−6 kg de masse grasse en 9 mois" },
  { slug: "lucas", nom: "Lucas", resultat: "De la masse musculaire en plus" },
  // ⚠️ EN ATTENTE — ne pas remplir au jugé :
  // · tom       Thomas a écrit « + 4 kg de masse grasse ». Pris au mot, ça
  //             annonce une prise de GRAISSE comme une réussite. C'est
  //             sûrement « +4 kg de masse musculaire » ou « −4 kg de masse
  //             grasse » — deux choses opposées, à trancher par lui.
  // · margaux-2 Deux photos portent le prénom Margaux. Le « −16 kg en un an »
  //             s'applique-t-il aux deux (même personne, deux angles) ou
  //             s'agit-il d'une autre personne ?
  // · heleane, julie  Aucun chiffre communiqué.
  { slug: "tom", nom: "Tom" },
  { slug: "margaux-2", nom: "Margaux" },
  { slug: "heleane", nom: "Héléane" },
  { slug: "julie", nom: "Julie" },
];
