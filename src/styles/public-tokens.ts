// =============================================================================
// public-tokens — Design tokens partagés des pages publiques V2 dark (2026-05-18)
// =============================================================================
//
// Source de verite : docs/mockups/bilan-online-v2.html + temoignage-client-v2.html
// (validation Thomas 17/05). Utilises par PublicShell, BilanOnlineWelcomePage,
// BilanOnlinePage, BilanOnlineThankYouPage, BusinessPage, TestimonialFormPage,
// Newsletter publique (chantier #8 a venir).
//
// IMPORTANT : separes du theme system interne (var(--ls-*) dans globals.css).
// Les pages publiques ont leur DNA dark premium independant du toggle dark/light
// de l'app coach interne.
// =============================================================================

import type { CSSProperties } from "react";

export const PUBLIC_TOKENS = {
  // Bases dark
  ink: "#0B0D11",
  ink2: "#131820",

  // Surface text on dark (par defaut)
  cream: "#FBF7F0",
  cream2: "#F2EBDF",
  textOnDark: "#FBF7F0",
  textOnDarkSoft: "rgba(251,247,240,0.92)",
  textOnDarkMuted: "rgba(251,247,240,0.58)",
  textOnDarkHint: "rgba(251,247,240,0.32)",
  hairOnDark: "rgba(251,247,240,0.10)",
  hairStrongOnDark: "rgba(251,247,240,0.18)",

  // Surface text on light (theme override)
  textOnLight: "#0B0D11",
  textOnLightSoft: "rgba(11,13,17,0.92)",
  textOnLightMuted: "rgba(11,13,17,0.62)",
  textOnLightHint: "rgba(11,13,17,0.38)",
  hairOnLight: "rgba(11,13,17,0.10)",
  hairStrongOnLight: "rgba(11,13,17,0.18)",

  // Brand
  teal: "#2DD4BF",
  tealDark: "#0F766E",
  violet: "#A78BFA",
  violetDark: "#7C3AED",
  coral: "#FB7185",
  gold: "#C9A84C",
  goldSoft: "#E5C97D",
  emerald: "#34D399",
  // Identité v2 « premium performance » (2026-07) : lime signature, teal = confiance.
  lime: "#c5f82a",
  limeDark: "#8fbf0f",

  // Gradients identite brand — v2 : teal (confiance/santé) → lime (énergie/perf).
  // Registre « premium accueillant » : frais et dynamique sans être agressif.
  gradHeadline: "linear-gradient(120deg, #2DD4BF 0%, #c5f82a 100%)",
  gradCta: "linear-gradient(120deg, #2DD4BF 0%, #c5f82a 100%)",
  gradCtaHover: "linear-gradient(120deg, #34D399 0%, #c5f82a 100%)",
  gradProgress: "linear-gradient(90deg, #2DD4BF 0%, #c5f82a 100%)",
} as const;

export const PUBLIC_FONTS = {
  display: '"Sora", -apple-system, BlinkMacSystemFont, sans-serif',
  // impact = Anton (titres/chiffres à fort punch, identité v2). display reste
  // Sora pour les phrases d'accueil (registre chaleureux, pas « war-room »).
  impact: '"Anton", "Sora", sans-serif',
  body: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
} as const;

// Style helper pour les headlines avec gradient teal -> violet -> coral
//
// Fix 2026-05-27 : ajout display: inline-block + padding-right pour eviter
// que background-clip:text + italic coupe la derniere lettre (S, F, etc.).
// Probleme constate sur "Merci THOMAS" + tous les step heroes du bilan.
export const publicGradText: CSSProperties = {
  background: PUBLIC_TOKENS.gradHeadline,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
  fontStyle: "italic",
  fontWeight: 500,
  display: "inline-block",
  paddingRight: "0.12em",
  paddingBottom: "0.04em",
  lineHeight: 1.22,
};

// Style helper pour le CTA primary (gradient teal -> violet)
export const publicGradCta: CSSProperties = {
  background: PUBLIC_TOKENS.gradCta,
  color: PUBLIC_TOKENS.cream,
  border: "none",
};

// LocalStorage key pour la preference theme cote utilisateur
export const PUBLIC_THEME_STORAGE_KEY = "ls-public-theme";

export type PublicTheme = "dark" | "light";
