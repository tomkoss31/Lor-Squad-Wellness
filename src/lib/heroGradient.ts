// =============================================================================
// heroGradient — palette time-of-day reutilisable pour les heros premium
// (2026-04-29)
// =============================================================================
//
// Chaque page peut choisir sa "couleur identitaire" (gold, teal, purple) et
// recevoir un gradient time-of-day cale sur cette couleur. La hue varie au
// fil de la journee (chaud le matin, sature midi, magique le soir, profond
// la nuit) MAIS reste dans la famille de la couleur identitaire.
//
// Usage :
//   const g = getHeroGradient("gold");  // ou "teal" / "purple" / "neutre"
//   <div style={{ background: g.glow }} />
// =============================================================================

export type HeroIdentity = "gold" | "teal" | "purple" | "neutral";

export interface HeroGradient {
  /** Couleur primaire (chaude, contrastee) pour titres / badges. */
  primary: string;
  /** Couleur secondaire (medium) pour borders / sub-text. */
  secondary: string;
  /** Couleur tertiaire (deep) pour gradient finitions. */
  tertiary: string;
  /** Couleur RGBA glow utilisee pour box-shadow et radial-gradient. */
  glow: string;
}

/**
 * Retourne un gradient adapte a l'heure de la journee + la couleur
 * identitaire de la page.
 */
export function getHeroGradient(
  identity: HeroIdentity = "gold",
  date: Date = new Date(),
): HeroGradient {
  const hour = date.getHours();
  const phase: "dawn" | "morning" | "noon" | "afternoon" | "dusk" | "evening" | "night" =
    hour >= 5 && hour < 8
      ? "dawn"
      : hour >= 8 && hour < 11
        ? "morning"
        : hour >= 11 && hour < 14
          ? "noon"
          : hour >= 14 && hour < 17
            ? "afternoon"
            : hour >= 17 && hour < 20
              ? "dusk"
              : hour >= 20 && hour < 23
                ? "evening"
                : "night";

  // Palettes par identite + phase
  const palettes: Record<HeroIdentity, Record<typeof phase, HeroGradient>> = {
    gold: {
      dawn:      { primary: "#FFB088", secondary: "#FF8866", tertiary: "#EF9F27", glow: "rgba(255,176,136,0.30)" },
      morning:   { primary: "#FFD56B", secondary: "#EF9F27", tertiary: "#BA7517", glow: "rgba(239,159,39,0.28)" },
      noon:      { primary: "#EF9F27", secondary: "#BA7517", tertiary: "#0D9488", glow: "rgba(13,148,136,0.22)" },
      afternoon: { primary: "#EF9F27", secondary: "#BA7517", tertiary: "#5C3A05", glow: "rgba(186,117,23,0.28)" },
      dusk:      { primary: "#FF6B6B", secondary: "#BA7517", tertiary: "#7C3AED", glow: "rgba(255,107,107,0.25)" },
      evening:   { primary: "#C084FC", secondary: "#7C3AED", tertiary: "#BA7517", glow: "rgba(192,132,252,0.25)" },
      night:     { primary: "#A5B4FC", secondary: "#818CF8", tertiary: "#7C3AED", glow: "rgba(165,180,252,0.25)" },
    },
    teal: {
      dawn:      { primary: "#5EEAD4", secondary: "#2DD4BF", tertiary: "#0D9488", glow: "rgba(94,234,212,0.30)" },
      morning:   { primary: "#2DD4BF", secondary: "#0D9488", tertiary: "#0F766E", glow: "rgba(45,212,191,0.28)" },
      noon:      { primary: "#0D9488", secondary: "#0F766E", tertiary: "#EF9F27", glow: "rgba(13,148,136,0.30)" },
      afternoon: { primary: "#0D9488", secondary: "#0F766E", tertiary: "#134E4A", glow: "rgba(15,118,110,0.30)" },
      dusk:      { primary: "#0D9488", secondary: "#7C3AED", tertiary: "#0F766E", glow: "rgba(13,148,136,0.28)" },
      evening:   { primary: "#67E8F9", secondary: "#0D9488", tertiary: "#7C3AED", glow: "rgba(103,232,249,0.28)" },
      night:     { primary: "#A5B4FC", secondary: "#0D9488", tertiary: "#7C3AED", glow: "rgba(13,148,136,0.30)" },
    },
    purple: {
      dawn:      { primary: "#FFB088", secondary: "#C084FC", tertiary: "#7C3AED", glow: "rgba(192,132,252,0.30)" },
      morning:   { primary: "#C084FC", secondary: "#A78BFA", tertiary: "#7C3AED", glow: "rgba(124,58,237,0.28)" },
      noon:      { primary: "#A78BFA", secondary: "#7C3AED", tertiary: "#5B21B6", glow: "rgba(124,58,237,0.30)" },
      afternoon: { primary: "#A78BFA", secondary: "#7C3AED", tertiary: "#4C1D95", glow: "rgba(124,58,237,0.30)" },
      dusk:      { primary: "#FF6B6B", secondary: "#C084FC", tertiary: "#7C3AED", glow: "rgba(192,132,252,0.30)" },
      evening:   { primary: "#C084FC", secondary: "#7C3AED", tertiary: "#A78BFA", glow: "rgba(124,58,237,0.32)" },
      night:     { primary: "#A5B4FC", secondary: "#818CF8", tertiary: "#7C3AED", glow: "rgba(165,180,252,0.30)" },
    },
    neutral: {
      dawn:      { primary: "#94A3B8", secondary: "#64748B", tertiary: "#475569", glow: "rgba(148,163,184,0.20)" },
      morning:   { primary: "#94A3B8", secondary: "#64748B", tertiary: "#334155", glow: "rgba(100,116,139,0.20)" },
      noon:      { primary: "#64748B", secondary: "#475569", tertiary: "#334155", glow: "rgba(71,85,105,0.20)" },
      afternoon: { primary: "#64748B", secondary: "#475569", tertiary: "#1E293B", glow: "rgba(71,85,105,0.20)" },
      dusk:      { primary: "#94A3B8", secondary: "#64748B", tertiary: "#7C3AED", glow: "rgba(124,58,237,0.18)" },
      evening:   { primary: "#A78BFA", secondary: "#64748B", tertiary: "#475569", glow: "rgba(167,139,250,0.20)" },
      night:     { primary: "#A5B4FC", secondary: "#818CF8", tertiary: "#475569", glow: "rgba(165,180,252,0.22)" },
    },
  };

  return palettes[identity][phase];
}
