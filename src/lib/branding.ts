// Branding centralise (2026-04-29 → V2 2026-04-30).
// Permet de re-brander l'app facilement (futur rebrand Noaly + nouvelle
// raison sociale). NE PAS hardcoder ces valeurs ailleurs.

// ─── App / Marque ──────────────────────────────────────────────────────────
export const APP_NAME = "Lor'Squad";
export const APP_NAME_FULL = "Lor'Squad Wellness";
export const APP_NAME_ACADEMY = `${APP_NAME} Academy`;
export const APP_FALLBACK_DISTRI = `Distributeur ${APP_NAME}`;

// ─── Société éditrice (raison sociale RGPD / mentions légales) ─────────────
// Note Thomas (2026-04-30) : la raison sociale changera au prochain rebrand.
// Centralise ici pour ne toucher qu'1 fichier au moment du switch.
export const COMPANY_NAME = "SAS HTM FITLIFE";
export const COMPANY_ADDRESS = "6 lotissement Bellevue, 55100 Vacherauville, France";
export const COMPANY_DIRECTOR = "Thomas Houbert";
export const COMPANY_EMAIL = "labaseverdun@gmail.com";

// ─── Hébergement (pour mentions légales + politique conf) ──────────────────
export const HOSTING_PROVIDER = "Supabase Inc.";
export const HOSTING_REGION = "Irlande, Union européenne (eu-west-1, Dublin)";

// ─── Helpers ───────────────────────────────────────────────────────────────
/** Footer compact reutilisable dans pages principales */
export const FOOTER_SHORT = `${APP_NAME_FULL} · ${COMPANY_NAME}`;

