// =============================================================================
// time-context — Phase A Co-pilote V5 Editoriale (2026-05-05)
//
// Pure function (zero deps, testable). Mappe l'heure de la journée vers
// un contexte UX :
//   - greeting + emoji + label produit La Base 360 (thé/aloe/shake/smoothie)
//   - heroFocus pour orienter l'action proactive (suggestion idle)
//   - dailyBoostCategory pour filtrer les quotes affichées
//
// Plages (heure locale du device) :
//   05h–11h : morning-prep   ☕  Thé time         · mindset
//   11h–14h : noon-rdv       🥗  Aloe time        · business
//   14h–18h : afternoon-act  🥤  Shake time       · business
//   18h–22h : evening-recap  🍃  Smoothie time    · nutrition
//   22h–05h : late-night     🌙  Détente          · mindset
//
// Pas de café (La Base 360 = thé/aloe/shake/smoothie uniquement).
// =============================================================================

export type TimeFocus =
  | "morning-prep"
  | "noon-rdv"
  | "afternoon-action"
  | "evening-recap"
  | "late-night";

export type DailyBoostCategory =
  | "lorsquad"
  | "mark-hughes"
  | "business"
  | "mindset"
  | "nutrition";

export interface TimeContext {
  /** Heure courante (0-23) qui a généré ce contexte. Utile pour debug. */
  hour: number;
  /** Salutation contextuelle FR ("Bonjour", "Salut", "Bonsoir", etc.). */
  greeting: string;
  /** Emoji représentant la "boisson" du moment (thé/aloe/shake/smoothie/lune). */
  emoji: string;
  /** Label court de la "boisson time" (affiché en pill éventuellement). */
  label: string;
  /** Focus UX qui pilote l'action proactive en cas d'idle. */
  heroFocus: TimeFocus;
  /** Catégorie privilégiée pour le Daily Boost. */
  dailyBoostCategory: DailyBoostCategory;
}

/**
 * Renvoie le TimeContext correspondant à une date donnée.
 * Pure fonction — pas de side effect, parfaitement testable.
 *
 * @param now Date à inspecter (en heure locale device).
 * @returns Le TimeContext (greeting + emoji + heroFocus + boostCategory).
 */
export function getTimeContext(now: Date): TimeContext {
  const hour = now.getHours();

  if (hour >= 5 && hour < 11) {
    return {
      hour,
      greeting: "Bonjour",
      emoji: "☕",
      label: "Thé time",
      heroFocus: "morning-prep",
      dailyBoostCategory: "mindset",
    };
  }

  if (hour >= 11 && hour < 14) {
    return {
      hour,
      greeting: "Salut",
      emoji: "🥗",
      label: "Aloe time",
      heroFocus: "noon-rdv",
      dailyBoostCategory: "business",
    };
  }

  if (hour >= 14 && hour < 18) {
    return {
      hour,
      greeting: "Bon après-midi",
      emoji: "🥤",
      label: "Shake time",
      heroFocus: "afternoon-action",
      dailyBoostCategory: "business",
    };
  }

  if (hour >= 18 && hour < 22) {
    return {
      hour,
      greeting: "Bonsoir",
      emoji: "🍃",
      label: "Smoothie time",
      heroFocus: "evening-recap",
      dailyBoostCategory: "nutrition",
    };
  }

  // 22h - 5h
  return {
    hour,
    greeting: "Bonne soirée",
    emoji: "🌙",
    label: "Détente",
    heroFocus: "late-night",
    dailyBoostCategory: "mindset",
  };
}

// ─── Suggestion proactive (mode idle) ─────────────────────────────────────

export interface ProactiveSuggestion {
  /** Texte court affiché dans le hero quand pas de RDV/suivi. */
  title: string;
  /** Label du CTA. */
  ctaLabel: string;
  /** Route interne ciblée par le CTA. */
  ctaRoute: string;
}

/**
 * Renvoie une suggestion proactive contextuelle quand le distri n'a
 * RIEN de prévu (cas "idle" de useNextAction). Évite le sentiment de
 * page vide / désengagement.
 */
export function getProactiveSuggestion(focus: TimeFocus): ProactiveSuggestion {
  switch (focus) {
    case "morning-prep":
      return {
        title: "Profite-en pour préparer 3 invitations sur ton réseau.",
        ctaLabel: "Ouvrir la boîte à outils",
        ctaRoute: "/formation/boite-a-outils",
      };
    case "noon-rdv":
      return {
        title: "Rebondis sur tes 3 derniers bilans : qui peut passer en suivi ?",
        ctaLabel: "Voir mes clients récents",
        ctaRoute: "/clients",
      };
    case "afternoon-action":
      return {
        title: "Le pic d'engagement Insta est à 18h. Prépare ton post du soir.",
        ctaLabel: "Voir mes accroches",
        ctaRoute: "/formation/boite-a-outils",
      };
    case "evening-recap":
      return {
        title: "Note ta victoire du jour pour clôturer.",
        ctaLabel: "Check-in soir FLEX",
        ctaRoute: "/flex",
      };
    case "late-night":
      return {
        title: "Demain commence par un bilan ? Prépare ta playlist mentale.",
        ctaLabel: "Daily Boost de demain",
        ctaRoute: "/co-pilote",
      };
  }
}
