// =============================================================================
// Les faits du Breakfast Club : téléphone, adresse, horaires, tarifs.
//
// POURQUOI CE FICHIER (audit du 13/08)
// Ces informations étaient recopiées dans tout le site. Relevé avant d'écrire
// une ligne :
//     le téléphone ....... 13 fois dans 8 fichiers
//     « body scan » ...... 27 fois dans 7 fichiers
//     les horaires ....... 34 fois dans 6 fichiers
//     l'adresse .......... 10 fois dans 5 fichiers
//
// Aucune valeur ne divergeait — les prix et les durées concordaient partout.
// Mais LES HORAIRES, SI : quatre formulations coexistaient, et seules deux
// mentionnaient le samedi. Quelqu'un qui lisait « entre 7h et 11h » dans la FAQ
// repartait en pensant que le club ferme le samedi. Une information perdue sur
// quatre emplacements sur six, sans que personne puisse s'en apercevoir.
//
// C'est le même piège que « thé aux plantes » : on corrige un endroit, il en
// reste six. Ici les faits sont écrits UNE fois, et un test refuse qu'on les
// recopie ailleurs (src/data/__tests__/clubInfos.test.ts).
//
// ⚠ Ce fichier dit ce qu'on AFFICHE. Il ne fixe pas ce qu'on encaisse : l'edge
// `create-club-card-payment` relit prix et validité dans `clubs.settings.cards`
// avant tout paiement, et ne fait confiance à aucune valeur venue du navigateur.
// =============================================================================

// ─── Contact ────────────────────────────────────────────────────────────────
/** Le numéro tel qu'on l'écrit à l'écran. */
export const CLUB_TEL = "06 79 44 87 59";
/** Le même, pour un lien cliquable. Format international : marche depuis l'étranger. */
export const CLUB_TEL_HREF = "tel:+33679448759";

// ─── Adresse ────────────────────────────────────────────────────────────────
export const CLUB_RUE = "11 rue Saint Pierre";
export const CLUB_CODE_POSTAL = "55100";
export const CLUB_VILLE = "Verdun";
export const CLUB_ADRESSE = `${CLUB_RUE}, ${CLUB_CODE_POSTAL} ${CLUB_VILLE}`;

// ─── Horaires ───────────────────────────────────────────────────────────────
/**
 * Le club ouvre AUSSI le samedi, à 8h. C'est le fait qui se perdait.
 * Toute phrase qui annonce les horaires doit le dire — sinon on ferme le samedi
 * dans la tête du lecteur.
 */
export const HORAIRES = {
  semaine: { debut: "7h", fin: "11h", jours: "du lundi au vendredi" },
  samedi: { debut: "8h", fin: "11h" },
} as const;

/** Le plus court, quand la place manque (en-tête). */
export const HORAIRES_COURT = `${HORAIRES.semaine.debut}–${HORAIRES.semaine.fin} · Sam ${HORAIRES.samedi.debut}–${HORAIRES.samedi.fin}`;

/** Compact mais avec les jours, pour un pied de page. */
export const HORAIRES_COURT_JOURS = `Lun–Ven ${HORAIRES.semaine.debut}–${HORAIRES.semaine.fin} · Sam ${HORAIRES.samedi.debut}–${HORAIRES.samedi.fin}`;

/**
 * Pour une phrase suivie : « Ouvert … ». Sans deux-points, qui hachent la
 * lecture au milieu d'un texte courant.
 */
export const HORAIRES_INLINE = `${HORAIRES.semaine.jours} ${HORAIRES.semaine.debut}–${HORAIRES.semaine.fin}, et le samedi ${HORAIRES.samedi.debut}–${HORAIRES.samedi.fin}`;

/** Qui se glisse après « quand tu veux » ou « on répond ». */
export const HORAIRES_PHRASE = `entre ${HORAIRES.semaine.debut} et ${HORAIRES.semaine.fin} en semaine, ${HORAIRES.samedi.debut} et ${HORAIRES.samedi.fin} le samedi`;

/** Version détaillée, sur deux lignes. */
export const HORAIRES_LIGNES = [
  `${HORAIRES.semaine.jours} : ${HORAIRES.semaine.debut}–${HORAIRES.semaine.fin}`,
  `Samedi : ${HORAIRES.samedi.debut}–${HORAIRES.samedi.fin}`,
];

// ─── Cartes de visites ──────────────────────────────────────────────────────
/**
 * AFFICHAGE SEULEMENT. Ces valeurs doivent rester alignées sur
 * `clubs.settings.cards` en base, qui est la seule à décider du montant encaissé.
 */
export const CARTES = {
  10: { visites: 10, prix: 80, validiteJours: 30, parVisite: "8 €" },
  30: { visites: 30, prix: 185, prixPlein: 210, validiteJours: 90, parVisite: "6,17 €" },
} as const;

/** Nombre de places de l'offre de pré-lancement. */
export const PRELANCEMENT_PLACES = 20;
