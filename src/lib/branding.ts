// Branding centralise (Rebrand La Base 360, 2026-05-05).
// Permet de re-brander l'app facilement. NE PAS hardcoder ces valeurs ailleurs.

// ─── App / Marque ──────────────────────────────────────────────────────────
export const APP_NAME = "La Base 360";
export const APP_NAME_FULL = "La Base 360";
export const APP_TAGLINE = "The wellness nutrition club";
export const APP_TAGLINE_FR = "Le club bien-être nutrition";
export const APP_HERITAGE = "★ Since 2022 ★";
export const APP_LOCATION = "Verdun · France";
export const APP_NAME_ACADEMY = `${APP_NAME} Academy`;
export const APP_FALLBACK_DISTRI = `Distributeur ${APP_NAME}`;

// ─── Société éditrice (raison sociale RGPD / mentions légales) ─────────────
// La raison sociale reste SAS HTM FITLIFE (legal), seule la marque change.
export const COMPANY_NAME = "SAS HTM FITLIFE";
export const COMPANY_ADDRESS = "6 lotissement Bellevue, 55100 Vacherauville, France";
export const COMPANY_DIRECTOR = "Thomas Houbert";
export const COMPANY_EMAIL = "labaseverdun@gmail.com";
/** N° SIRET — obligatoire sur les mentions légales et les CGV d'une boutique. */
export const COMPANY_SIRET = "931 482 004 00013";

/** Téléphone du club — obligatoire sur les CGV d'une vente à un particulier. */
export const COMPANY_PHONE = "06 79 44 87 59";
/** Adresse de l'établissement qui reçoit le public (≠ siège social ci-dessus). */
export const CLUB_ADDRESS = "11 rue Saint Pierre, 55100 Verdun";

/**
 * Médiateur de la consommation.
 *
 * ⚠ OBLIGATION LÉGALE, PAS UNE OPTION (art. L616-1 du code de la consommation) :
 * tout professionnel qui vend à des particuliers doit adhérer à un médiateur
 * agréé et en indiquer les coordonnées sur son site et ses CGV.
 *
 * Laissé VIDE volontairement : inventer un nom de médiateur serait pire que de
 * n'en afficher aucun. Tant que c'est vide, les CGV expliquent le droit à la
 * médiation sans citer d'organisme. Dès que l'adhésion est prise, remplir les
 * deux valeurs — la page s'adapte toute seule.
 */
export const CONSUMER_MEDIATOR_NAME = "";
export const CONSUMER_MEDIATOR_URL = "";

// ─── Hébergement ───────────────────────────────────────────────────────────
/** Hébergeur du SITE, au sens de la LCEN art. 6 — ce n'est pas la base. */
export const SITE_HOST = "Vercel Inc.";
export const SITE_HOST_ADDRESS = "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis";
/** Hébergeur des DONNÉES (base + fonctions), pour la politique de confidentialité. */
export const HOSTING_PROVIDER = "Supabase Inc.";
export const HOSTING_REGION = "Irlande, Union européenne (eu-west-1, Dublin)";

// ─── Helpers ───────────────────────────────────────────────────────────────
/** Footer compact reutilisable dans pages principales */
export const FOOTER_SHORT = `${APP_NAME_FULL} · ${COMPANY_NAME}`;
