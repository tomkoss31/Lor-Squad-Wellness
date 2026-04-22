// Chantier Polish Vue complète + refonte bilan (2026-04-24).
// Ranges de santé pour les métriques body scan, femme / homme.
// Utilisé par les jauges combinées (BodyCompositionGauges) et les badges
// de zone. Les valeurs s'appuient sur les standards Tanita / OMS.

export type BiologicalSex = "female" | "male";

export type ZoneKey =
  | "ideal"
  | "normal"
  | "warning"
  | "high"
  | "low"
  | "insufficient"
  | "limit"
  | "overhydrated";

export interface Zone {
  key: ZoneKey;
  label: string;
  color: string;
  from: number;
  to: number;
}

export type MetricKind = "bodyFat" | "muscleMass" | "hydration";

export interface MetricRange {
  metric: MetricKind;
  sex: BiologicalSex;
  min: number;
  max: number;
  zones: Zone[];
  /** Plus c'est haut, mieux c'est (ex: masse musculaire, hydratation) */
  higherIsBetter: boolean;
}

// Palette chantier (alignée avec les accents UI existants)
const COLORS = {
  ideal: "#1D9E75",
  normal: "#EF9F27",
  warning: "#D4537E",
  high: "#E24B4A",
  low: "#D4537E",
  insufficient: "#E24B4A",
  limit: "#EF9F27",
  overhydrated: "#D4537E",
};

const BODY_FAT_FEMALE: MetricRange = {
  metric: "bodyFat",
  sex: "female",
  min: 0,
  max: 50,
  higherIsBetter: false,
  zones: [
    { key: "ideal", label: "Idéal", color: COLORS.ideal, from: 0, to: 25 },
    { key: "normal", label: "Normal", color: COLORS.normal, from: 25, to: 33 },
    { key: "warning", label: "Vigilance", color: COLORS.warning, from: 33, to: 39 },
    { key: "high", label: "Élevé", color: COLORS.high, from: 39, to: 100 },
  ],
};

const BODY_FAT_MALE: MetricRange = {
  metric: "bodyFat",
  sex: "male",
  min: 0,
  max: 45,
  higherIsBetter: false,
  zones: [
    { key: "ideal", label: "Idéal", color: COLORS.ideal, from: 0, to: 18 },
    { key: "normal", label: "Normal", color: COLORS.normal, from: 18, to: 25 },
    { key: "warning", label: "Vigilance", color: COLORS.warning, from: 25, to: 30 },
    { key: "high", label: "Élevé", color: COLORS.high, from: 30, to: 100 },
  ],
};

// V3 (2026-04-24) : thresholds recalibrés par Thomas.
// Femme : <35 Faible / 35-40 Normal / 40-45 Élevé / >45 Très élevé
// Homme : <40 Faible / 40-45 Normal / 45-50 Élevé / >50 Très élevé
const MUSCLE_MASS_FEMALE: MetricRange = {
  metric: "muscleMass",
  sex: "female",
  min: 20,
  max: 55,
  higherIsBetter: true,
  zones: [
    { key: "low", label: "Faible", color: COLORS.low, from: 0, to: 35 },
    { key: "normal", label: "Normal", color: COLORS.normal, from: 35, to: 40 },
    { key: "ideal", label: "Élevé", color: COLORS.ideal, from: 40, to: 45 },
    { key: "high", label: "Très élevé", color: COLORS.ideal, from: 45, to: 100 },
  ],
};

const MUSCLE_MASS_MALE: MetricRange = {
  metric: "muscleMass",
  sex: "male",
  min: 25,
  max: 60,
  higherIsBetter: true,
  zones: [
    { key: "low", label: "Faible", color: COLORS.low, from: 0, to: 40 },
    { key: "normal", label: "Normal", color: COLORS.normal, from: 40, to: 45 },
    { key: "ideal", label: "Élevé", color: COLORS.ideal, from: 45, to: 50 },
    { key: "high", label: "Très élevé", color: COLORS.ideal, from: 50, to: 100 },
  ],
};

const HYDRATION_FEMALE: MetricRange = {
  metric: "hydration",
  sex: "female",
  min: 30,
  max: 70,
  higherIsBetter: true,
  zones: [
    { key: "insufficient", label: "Insuffisant", color: COLORS.insufficient, from: 0, to: 45 },
    { key: "limit", label: "Limite", color: COLORS.limit, from: 45, to: 50 },
    { key: "ideal", label: "Idéal", color: COLORS.ideal, from: 50, to: 60 },
    { key: "overhydrated", label: "Sur-hydraté", color: COLORS.overhydrated, from: 60, to: 100 },
  ],
};

const HYDRATION_MALE: MetricRange = {
  metric: "hydration",
  sex: "male",
  min: 35,
  max: 75,
  higherIsBetter: true,
  zones: [
    { key: "insufficient", label: "Insuffisant", color: COLORS.insufficient, from: 0, to: 50 },
    { key: "limit", label: "Limite", color: COLORS.limit, from: 50, to: 55 },
    { key: "ideal", label: "Idéal", color: COLORS.ideal, from: 55, to: 65 },
    { key: "overhydrated", label: "Sur-hydraté", color: COLORS.overhydrated, from: 65, to: 100 },
  ],
};

const RANGES: Record<MetricKind, Record<BiologicalSex, MetricRange>> = {
  bodyFat: { female: BODY_FAT_FEMALE, male: BODY_FAT_MALE },
  muscleMass: { female: MUSCLE_MASS_FEMALE, male: MUSCLE_MASS_MALE },
  hydration: { female: HYDRATION_FEMALE, male: HYDRATION_MALE },
};

export function getMetricRange(metric: MetricKind, sex: BiologicalSex): MetricRange {
  return RANGES[metric][sex];
}

/**
 * Retourne la zone dans laquelle tombe `value` pour une métrique/sexe donné.
 * Si la valeur est hors bornes → clamp sur la première/dernière zone.
 */
export function getZone(value: number, metric: MetricKind, sex: BiologicalSex): Zone {
  const range = getMetricRange(metric, sex);
  const found = range.zones.find((z) => value >= z.from && value < z.to);
  if (found) return found;
  // Fallback : clamp sur la dernière zone si valeur >= max de la dernière
  return range.zones[range.zones.length - 1];
}

/**
 * Retourne le pourcentage (0-100) de `value` sur l'échelle complète de la métrique,
 * pour positionner le marqueur visuel sur la barre.
 */
export function getPercentOnBar(
  value: number,
  metric: MetricKind,
  sex: BiologicalSex,
): number {
  const range = getMetricRange(metric, sex);
  const total = range.max - range.min;
  if (total <= 0) return 0;
  const pct = ((value - range.min) / total) * 100;
  return Math.max(0, Math.min(100, pct));
}

export function formatMetricDelta(
  current: number | null | undefined,
  initial: number | null | undefined,
  metric: MetricKind,
): { delta: number | null; label: string; tone: "positive" | "neutral" | "warning" } {
  if (current == null || initial == null) {
    return { delta: null, label: "—", tone: "neutral" };
  }
  const delta = current - initial;
  const abs = Math.abs(delta).toFixed(1);
  const rounded = Math.round(delta * 10) / 10;
  if (metric === "bodyFat") {
    if (rounded < -0.05) return { delta, label: `-${abs} points depuis le départ`, tone: "positive" };
    if (rounded > 0.05) return { delta, label: `+${abs} points depuis le départ`, tone: "warning" };
    return { delta, label: "Stable depuis le départ", tone: "neutral" };
  }
  // muscleMass / hydration : higher is better
  if (rounded > 0.05) return { delta, label: `+${abs} points depuis le départ`, tone: "positive" };
  if (rounded < -0.05) return { delta, label: `-${abs} points depuis le départ`, tone: "warning" };
  return { delta, label: "Stable depuis le départ", tone: "neutral" };
}
