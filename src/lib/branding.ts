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
//
// ⚠ Deux adresses coexistent, et elles ne sont PAS interchangeables :
//   - COMPANY_ADDRESS = siège social (domicile du dirigeant). C'est l'adresse
//     légalement exigée dans les mentions légales et la politique de
//     confidentialité. Réservée à ces usages — ne pas la diffuser ailleurs.
//   - CLUB_ADDRESS    = le local, là où on reçoit les gens. C'est celle qui va
//     dans tout ce qui est public : SEO local, données structurées, emails
//     prospects, flyers.
// Se tromper de sens, c'est soit publier le domicile du dirigeant, soit
// casser la cohérence NAP avec la fiche Google (qui pénalise le SEO local).
export const COMPANY_NAME = "SAS HTM FITLIFE";
export const COMPANY_ADDRESS = "6 lotissement Bellevue, 55100 Vacherauville, France";
export const COMPANY_DIRECTOR = "Thomas Houbert";
export const COMPANY_EMAIL = "labaseverdun@gmail.com";

// ─── Local / club (adresse publique) ───────────────────────────────────────
// Doit rester strictement identique à la fiche Google Business, au caractère
// près : c'est ce qui permet à Google de recouper les mentions du club.
export const CLUB_STREET = "11 rue Saint-Pierre";
export const CLUB_POSTAL_CODE = "55100";
export const CLUB_CITY = "Verdun";
export const CLUB_COUNTRY = "France";
export const CLUB_ADDRESS = `${CLUB_STREET}, ${CLUB_POSTAL_CODE} ${CLUB_CITY}`;

// ─── Hébergement (pour mentions légales + politique conf) ──────────────────
export const HOSTING_PROVIDER = "Supabase Inc.";
export const HOSTING_REGION = "Irlande, Union européenne (eu-west-1, Dublin)";

// ─── Helpers ───────────────────────────────────────────────────────────────
/** Footer compact reutilisable dans pages principales */
export const FOOTER_SHORT = `${APP_NAME_FULL} · ${COMPANY_NAME}`;
