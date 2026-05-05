// Visual content (Rebrand La Base 360, 2026-05-05).
// Anciens imports d'assets locaux (Lor-Squad-blason, Lor-Squad, la-base) remplaces
// par des chemins vers /public/brand/labase360/ pour s'aligner sur le nouveau
// branding. Les noms d'export (blasonLogo, lorSquadLogo, laBaseLogo) sont
// conserves pour ne pas casser les composants qui en dependent (rebrand
// progressif).

const APP_ICON = "/brand/labase360/app-icon-512.svg";
const LOGO_PRIMARY = "/brand/labase360/logo-primary.svg";

export const blasonLogo = APP_ICON;
export const lorSquadLogo = LOGO_PRIMARY; // alias deprecated, garde pour compat
export const laBaseLogo = APP_ICON;
