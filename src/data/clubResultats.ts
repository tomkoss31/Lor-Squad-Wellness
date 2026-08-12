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
  /**
   * Dimensions RÉELLES du fichier. Deux raisons, pas une :
   *  · sans elles, le navigateur ne réserve aucune place et la page saute au
   *    fur et à mesure des chargements ;
   *  · surtout, les cartes font alors zéro pixel de haut au montage, donc
   *    toutes empilées dans l'écran — et l'observateur qui déclenche la mise en
   *    couleur les voyait TOUTES d'un coup. L'effet était joué avant qu'on
   *    arrive à la section. Bug mesuré le 2026-08-11.
   * À relever avec les vraies valeurs pour toute nouvelle photo.
   */
  w: number;
  h: number;
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
  /**
   * Vrai pour un coach du club. Une transformation de coach est une bonne
   * preuve — il pratique ce qu'il propose — mais elle doit se VOIR : glissée
   * sans mention parmi des résultats de membres, elle se lit comme celle d'un
   * client, et c'est trompeur. Même règle que pour les témoignages, où celui
   * de la co-fondatrice a été écarté pour cette raison exacte.
   */
  coach?: boolean;
};

/**
 * Les témoignages autorisés SUR LE SITE PUBLIC DU CLUB — par identifiant.
 *
 * ⚠️ LISTE EXPLICITE, ET SURTOUT PAS UN TIRAGE AUTOMATIQUE de tout ce qui est
 * « approuvé ». La modération de l'app valide qu'un témoignage est authentique ;
 * elle ne dit rien de ce qu'on a le droit d'écrire sur une vitrine de nutrition.
 * Sans cette liste, le prochain témoignage validé partirait en ligne sans
 * qu'aucun œil ne le relise.
 *
 * RELECTURE DU 2026-08-11 — cinq des sept posaient un problème. Quatre ont été
 * CORRIGÉS EN RETIRANT la phrase fautive, jamais en réécrivant leurs mots, et
 * la version publiable vit dans `public_excerpt` : le `content` d'origine, ce
 * que la personne a réellement écrit, n'est pas touché.
 *
 *   Maria     retiré « je rejoins l'équipe pour accompagner d'autres
 *             personnes » — du recrutement dans un témoignage produit, le
 *             mélange que les règles de conduite interdisent. Et « essoufflée »,
 *             qui est un symptôme.
 *   Romane    retiré « les produits Herbalife » : le site du club ne nomme la
 *             marque nulle part, ce texte la faisait entrer par la bande.
 *   Marjorie  retiré « moins ballonnée » : améliorer un trouble digestif est
 *             une allégation de santé, qu'un aliment ne peut pas revendiquer.
 *   Virginie  retiré la marque, « le thé aloès », « mon shake » et « moins
 *             essoufflé ». Orthographe remise d'aplomb, propos inchangé.
 *
 *   Mélanie   ✕ NON PUBLIÉE, et aucune coupe n'y changerait rien : c'est la
 *             CO-FONDATRICE. Le problème n'est pas ce qu'elle écrit, c'est
 *             qu'un avis de la patronne au milieu d'avis de membres se lit
 *             comme celui d'une cliente indépendante.
 *
 * Pour en ajouter un : le relire avec cette grille — marque, produit nommé,
 * symptôme, promesse de soigner, recrutement — puis coller son id ici.
 * Liste vide = la page garde son texte d'attente, qui reste vrai.
 */
export const CLUB_TEMOIGNAGES_PUBLIES: string[] = [
  "93384eb5-dd5a-4897-adb9-fd39d67c7075", // Sabrina — propre d'origine
  "4fff49ff-5e55-4145-a9d3-ef0a3713c291", // Judith  — propre d'origine
  "e66704f5-4a2f-471f-8888-ce23e927f825", // Maria    — corrigée
  "57853580-71b0-48ce-98ee-8c82d33dc3dc", // Romane   — corrigée
  "38339b70-6154-4914-a163-836abd3c7913", // Marjorie — corrigée
  "c27018ec-84ca-4e09-9c0f-17f6b7ee7928", // Virginie — corrigée
];

export const CLUB_RESULTATS: ClubResultat[] = [
  { slug: "joel", w: 1125, h: 1107, nom: "Joël", resultat: "−20 kg en 6 mois" },
  { slug: "marie", w: 1224, h: 1171, nom: "Marie", resultat: "−17 kg et −60 cm en 18 mois" },
  { slug: "margaux", w: 1280, h: 1280, nom: "Margaux", resultat: "−16 kg en un an" },
  { slug: "jean", w: 1280, h: 945, nom: "Jean", resultat: "−12 kg, et l'énergie revenue" },
  { slug: "fanny", w: 828, h: 816, nom: "Fanny", resultat: "−6 kg de masse grasse en 9 mois" },
  { slug: "lucas", w: 1280, h: 1280, nom: "Lucas", resultat: "De la masse musculaire en plus" },
  // Même personne que ci-dessus, sous un autre angle (confirmé par Thomas) —
  // donc même résultat, et pas de prénom répété : deux cartes « Margaux » avec
  // le même chiffre se liraient comme un doublon plutôt que comme deux vues.
  { slug: "margaux-2", w: 1280, h: 1280, resultat: "Margaux, sous un autre angle" },
  // « Tom », c'est Thomas — d'où la mention coach. Le sommeil n'est PAS dans
  // la légende : améliorer le sommeil est une allégation de santé qu'un aliment
  // ne peut pas revendiquer, et une légende parle avec la voix du club, pas
  // avec la sienne. S'il y tient, sa place est dans un témoignage signé.
  { slug: "tom", w: 1280, h: 1112, nom: "Thomas", coach: true, resultat: "+4 kg de masse musculaire, et des performances sportives en nette progression" },
  // Sans chiffre : Thomas ne les a pas, et on n'en invente pas. La photo parle
  // seule, le prénom suffit.
  { slug: "heleane", w: 1125, h: 1112, nom: "Héléane" },
  { slug: "julie", w: 1312, h: 1288, nom: "Julie" },
];
