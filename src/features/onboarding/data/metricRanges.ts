// Chantier Tuto interactif client (2026-04-24).
// Ranges par métrique + par sexe pour la jauge pédagogique.

export type MetricSex = "female" | "male";
export type MetricColor = "green" | "gold" | "coral" | "red" | "blue";

export interface MetricRange {
  min: number;
  max: number;
  label: string;
  key: string;
  color: MetricColor;
}

export const COLOR_HEX: Record<MetricColor, string> = {
  green: "#1D9E75",
  gold: "#EF9F27",
  coral: "#D85A30",
  red: "#E24B4A",
  blue: "#4A90E2",
};

export const BODY_FAT_RANGES: Record<MetricSex, MetricRange[]> = {
  female: [
    { min: 0, max: 25, label: "Idéal", key: "ideal", color: "green" },
    { min: 25, max: 33, label: "Normal", key: "normal", color: "gold" },
    { min: 33, max: 39, label: "Vigilance", key: "warning", color: "coral" },
    { min: 39, max: 100, label: "Élevé", key: "high", color: "red" },
  ],
  male: [
    { min: 0, max: 18, label: "Idéal", key: "ideal", color: "green" },
    { min: 18, max: 25, label: "Normal", key: "normal", color: "gold" },
    { min: 25, max: 30, label: "Vigilance", key: "warning", color: "coral" },
    { min: 30, max: 100, label: "Élevé", key: "high", color: "red" },
  ],
};

export const HYDRATATION_RANGES: Record<MetricSex, MetricRange[]> = {
  female: [
    { min: 0, max: 45, label: "Insuffisant", key: "low", color: "coral" },
    { min: 45, max: 50, label: "Limite", key: "limit", color: "gold" },
    { min: 50, max: 60, label: "Idéal", key: "ideal", color: "green" },
    { min: 60, max: 100, label: "Surhydratation", key: "over", color: "blue" },
  ],
  male: [
    { min: 0, max: 50, label: "Insuffisant", key: "low", color: "coral" },
    { min: 50, max: 55, label: "Limite", key: "limit", color: "gold" },
    { min: 55, max: 65, label: "Idéal", key: "ideal", color: "green" },
    { min: 65, max: 100, label: "Surhydratation", key: "over", color: "blue" },
  ],
};

export function findRange(
  value: number,
  ranges: MetricRange[],
): MetricRange {
  for (const r of ranges) {
    if (value >= r.min && value < r.max) return r;
  }
  return ranges[ranges.length - 1];
}

/**
 * Calcule la position en % [0..100] d'une valeur dans l'ensemble des ranges
 * pour positionner le curseur sur la jauge horizontale. Le max visuel est
 * le max du 3e range (pas du 4e qui file à 100, pour rester lisible).
 */
export function valueToPercent(value: number, ranges: MetricRange[]): number {
  if (ranges.length < 2) return 50;
  const displayMin = ranges[0].min;
  const displayMax = ranges[Math.min(ranges.length - 1, 3)].min + 5; // legère marge au-delà du vigilance
  const clamped = Math.max(displayMin, Math.min(value, displayMax));
  const pct = ((clamped - displayMin) / (displayMax - displayMin)) * 100;
  return Math.max(2, Math.min(98, pct));
}

/**
 * Message de motivation contextualisé selon la zone du client.
 * Utilisé par BodyCompositionStep + HydrationStep.
 */
export function motivationMessage(
  metric: "body_fat" | "hydration",
  key: string,
  firstName: string,
): { tone: "positive" | "neutral" | "push"; text: string } {
  if (metric === "body_fat") {
    switch (key) {
      case "ideal":
        return {
          tone: "positive",
          text: `Tu es dans la zone idéale, ${firstName} ! L'objectif est de maintenir ça avec ton programme.`,
        };
      case "normal":
        return {
          tone: "neutral",
          text: `Tu es dans une zone saine. Avec ton programme, on peut affiner encore un peu pour viser la zone idéale.`,
        };
      case "warning":
        return {
          tone: "push",
          text: `Bonne nouvelle : avec ton programme, on vise -3 à -5% en 3 mois. Tu vas voir ta barre passer dans le jaune.`,
        };
      case "high":
        return {
          tone: "push",
          text: `On va progresser pas à pas. Chaque kilo perdu te ramène dans la zone saine. Thomas t'accompagne à chaque étape.`,
        };
    }
  } else {
    switch (key) {
      case "ideal":
        return {
          tone: "positive",
          text: `Hydratation idéale ${firstName} ! Continue à boire régulièrement dans la journée.`,
        };
      case "limit":
        return {
          tone: "neutral",
          text: `Tu es juste en dessous de l'idéal. Ajoute 1-2 verres d'eau par jour et tu y es.`,
        };
      case "low":
        return {
          tone: "push",
          text: `L'hydratation, c'est le carburant de tes cellules. Vise 1,5L d'eau minimum par jour — Thomas pourra t'expliquer les astuces.`,
        };
      case "over":
        return {
          tone: "neutral",
          text: `Hydratation très élevée — souvent temporaire après un gros effort. À vérifier au prochain bilan.`,
        };
    }
  }
  return { tone: "neutral", text: "" };
}
