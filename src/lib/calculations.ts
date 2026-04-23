import type {
  AssessmentRecord,
  BodyScanDelta,
  BodyScanMetrics,
  Client,
  Objective,
  WeightLossPaceInsight,
  WeightLossPlan
} from "../types/domain";

const timePattern = /(?:T|\s)\d{2}:\d{2}/;

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function toLocalDateTimeInputValue(date: Date) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
}

export function calculateWaterNeed(weight: number): number {
  if (!weight || weight <= 0) {
    return 0;
  }

  return Number((weight / 30).toFixed(1));
}

export function calculateProteinRange(
  weight: number,
  objective: Objective,
  timeline?: string
): string {
  if (!weight || weight <= 0) {
    return "0 - 0 g";
  }

  const multiplier =
    objective === "sport"
      ? { min: 1.6, max: 2 }
      : getWeightLossProteinMultiplier(resolveTimelineDays(timeline ?? "3 mois"));

  return `${Math.round(weight * multiplier.min)} - ${Math.round(weight * multiplier.max)} g`;
}

// Chantier Recommandations nutritionnelles (2026-04-25).
// Variantes "target" : retournent une valeur NUMÉRIQUE unique (pas une
// plage ni une string) pour stockage DB + affichage card "objectif".
// Clampées sur plages physiologiques (2-4 L d'eau, protéines < 3 g/kg
// pour rester sain même si calcul extrême).

/**
 * Eau recommandée (litres/jour) — number.
 * Base : 33 mL / kg (recommandation EFSA adulte actif).
 * Clamp 2.0 → 4.0 L. Arrondi à 0.1 L près.
 */
export function computeWaterTarget(weightKg: number): number {
  if (!weightKg || weightKg <= 0) return 2.0;
  const base = weightKg * 0.033;
  const clamped = Math.max(2, Math.min(4, base));
  return Math.round(clamped * 10) / 10;
}

/**
 * Protéines cible (grammes/jour) — number.
 * Multiplicateurs :
 *   - sport / prise de masse : 2.0 g/kg
 *   - perte de poids : 1.8 g/kg (préservation masse maigre)
 *   - bien-être / maintenance : 1.4 g/kg
 * Valeur par défaut 1.6 g/kg si objectif inconnu. Clamp max 3 g/kg.
 */
export function computeProteinTarget(weightKg: number, objective?: Objective | string): number {
  if (!weightKg || weightKg <= 0) return 0;
  const multipliers: Record<string, number> = {
    sport: 2.0,
    "weight-loss": 1.8,
    weight_loss: 1.8,
    muscle_gain: 2.0,
    maintenance: 1.4,
    wellbeing: 1.4,
  };
  const m = multipliers[(objective ?? "").toString()] ?? 1.6;
  const base = weightKg * m;
  const clamped = Math.min(weightKg * 3, base);
  return Math.round(clamped);
}

export function formatDate(input: string | null | undefined): string {
  // Fix Invalid time value (2026-04-19) : protège contre null/undefined/"" et
  // dates non-parseables. Alignement avec le pattern de formatDateTime().
  if (!input) {
    return "—";
  }
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

export function formatDateTime(input: string | null | undefined): string {
  // Fix Invalid time value (2026-04-19) : même protection que formatDate().
  if (!input) {
    return "—";
  }
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return input;
  }

  const hasTime = timePattern.test(input);

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(hasTime
      ? {
          hour: "2-digit" as const,
          minute: "2-digit" as const
        }
      : {})
  }).format(date);
}

export function normalizeDateTimeLocalInputValue(
  value: string | undefined,
  fallbackDate?: Date
) {
  if (!value) {
    return toLocalDateTimeInputValue(fallbackDate ?? new Date());
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime()) && timePattern.test(value)) {
    return toLocalDateTimeInputValue(parsed);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T09:00`;
  }

  return value.includes("T") ? value.slice(0, 16) : value;
}

export function serializeDateTimeForStorage(value: string, fallbackHour = 9) {
  if (!value) {
    return value;
  }

  if (/([zZ]|[+-]\d{2}:\d{2})$/.test(value)) {
    return value;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T${String(fallbackHour).padStart(2, "0")}:00`);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

export function estimateBodyFatKg(weight: number, bodyFatPercent: number): number {
  return roundMetric(weight * (bodyFatPercent / 100));
}

export function estimateMuscleMassPercent(weight: number, muscleMassKg: number): number {
  if (!weight || weight <= 0) {
    return 0;
  }

  return roundMetric((muscleMassKg / weight) * 100);
}

export function estimateMuscleMassKg(weight: number, muscleMassPercent: number): number {
  return roundMetric(weight * (muscleMassPercent / 100));
}

export function estimateHydrationKg(weight: number, hydrationPercent: number): number {
  return roundMetric(weight * (hydrationPercent / 100));
}

export function estimateRelativeMassPercent(weight: number, massKg: number): number {
  if (!weight || weight <= 0) {
    return 0;
  }

  return roundMetric((massKg / weight) * 100);
}

export function resolveTimelineDays(timeline: string): number {
  return parseTimelineInput(timeline).days;
}

export function normalizeTimelineLabel(timeline: string): string {
  return parseTimelineInput(timeline).label;
}

export function getWeightLossPlan(
  currentWeight: number,
  targetWeight?: number | null,
  timeline = "3 mois"
): WeightLossPlan {
  if (targetWeight == null || Number.isNaN(targetWeight) || targetWeight <= 0) {
    return {
      targetWeight: null,
      remainingKg: 0,
      dailyGrams: 0,
      isAchieved: false,
      days: resolveTimelineDays(timeline)
    };
  }

  const days = resolveTimelineDays(timeline);
  const remainingKg = roundMetric(currentWeight - targetWeight);
  const isAchieved = remainingKg <= 0;
  const dailyGrams = isAchieved ? 0 : Math.round((remainingKg * 1000) / days);

  return {
    targetWeight,
    remainingKg,
    dailyGrams,
    isAchieved,
    days
  };
}

export function getWeightLossPaceInsight(plan: WeightLossPlan): WeightLossPaceInsight {
  if (plan.targetWeight == null) {
    return {
      label: "Objectif a definir",
      description: "Ajoute un poids cible pour obtenir un rythme clair.",
      tone: "blue"
    };
  }

  if (plan.isAchieved) {
    return {
      label: "Objectif déjà atteint",
      description: "Le poids cible est déjà atteint ou depasse.",
      tone: "green"
    };
  }

  if (plan.dailyGrams <= 50) {
    return {
      label: "Rythme confortable",
      description: "Cap progressif et generalement facile a expliquer au client.",
      tone: "green"
    };
  }

  if (plan.dailyGrams <= 90) {
    return {
      label: "Objectif realiste",
      description: "Le rythme demande de la regularite, mais reste pedagogique et motivant.",
      tone: "blue"
    };
  }

  if (plan.dailyGrams <= 140) {
    return {
      label: "Objectif ambitieux",
      description: "Le cap est atteignable mais demandera une vraie constance sur la duree.",
      tone: "amber"
    };
  }

  return {
    label: "Objectif tres ambitieux",
    description: "Le rythme quotidien est eleve. Mieux vaut parfois allonger le delai pour rester rassurant.",
    tone: "red"
  };
}

// ─── BodyScan par défaut — sécurité contre null/undefined ──────────
const SAFE_BODY_SCAN: BodyScanMetrics = {
  weight: 0, bodyFat: 0, muscleMass: 0, hydration: 0,
  boneMass: 0, visceralFat: 0, bmr: 0, metabolicAge: 0,
};

function ensureBodyScan(scan: Partial<BodyScanMetrics> | null | undefined): BodyScanMetrics {
  if (!scan) return { ...SAFE_BODY_SCAN };
  return {
    weight: typeof scan.weight === 'number' && !Number.isNaN(scan.weight) ? scan.weight : 0,
    bodyFat: typeof scan.bodyFat === 'number' && !Number.isNaN(scan.bodyFat) ? scan.bodyFat : 0,
    muscleMass: typeof scan.muscleMass === 'number' && !Number.isNaN(scan.muscleMass) ? scan.muscleMass : 0,
    hydration: typeof scan.hydration === 'number' && !Number.isNaN(scan.hydration) ? scan.hydration : 0,
    boneMass: typeof scan.boneMass === 'number' && !Number.isNaN(scan.boneMass) ? scan.boneMass : 0,
    visceralFat: typeof scan.visceralFat === 'number' && !Number.isNaN(scan.visceralFat) ? scan.visceralFat : 0,
    bmr: typeof scan.bmr === 'number' && !Number.isNaN(scan.bmr) ? scan.bmr : 0,
    metabolicAge: typeof scan.metabolicAge === 'number' && !Number.isNaN(scan.metabolicAge) ? scan.metabolicAge : 0,
  };
}

function ensureAssessment(a: AssessmentRecord | undefined | null): AssessmentRecord {
  if (!a) {
    return {
      id: 'empty',
      date: new Date().toISOString(),
      type: 'initial',
      objective: 'weight-loss',
      programTitle: '',
      summary: '',
      notes: '',
      bodyScan: { ...SAFE_BODY_SCAN },
      questionnaire: {} as AssessmentRecord['questionnaire'],
      pedagogicalFocus: [],
    } as unknown as AssessmentRecord;
  }
  return {
    ...a,
    bodyScan: ensureBodyScan(a.bodyScan as Partial<BodyScanMetrics> | null | undefined),
  };
}

export function getLatestAssessment(client: Client): AssessmentRecord {
  const sorted = [...(client.assessments ?? [])].sort(compareAssessmentsDesc);
  return ensureAssessment(sorted[0]);
}

export function getPreviousAssessment(client: Client): AssessmentRecord | null {
  const sorted = [...(client.assessments ?? [])].sort(compareAssessmentsDesc);
  const prev = sorted[1];
  return prev ? ensureAssessment(prev) : null;
}

export function getFirstAssessment(client: Client): AssessmentRecord {
  const sorted = [...(client.assessments ?? [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  return ensureAssessment(sorted[0]);
}

export function getLatestBodyScan(client: Client): BodyScanMetrics {
  return ensureBodyScan(getLatestAssessment(client).bodyScan);
}

export function getLatestQuestionnaire(client: Client) {
  return getLatestAssessment(client).questionnaire ?? ({} as AssessmentRecord['questionnaire']);
}

export function getAssessmentDelta(
  current: BodyScanMetrics,
  previous?: BodyScanMetrics | null
): BodyScanDelta {
  if (!previous) {
    return {
      weight: 0,
      bodyFat: 0,
      muscleMass: 0,
      hydration: 0,
      boneMass: 0,
      visceralFat: 0,
      bmr: 0,
      metabolicAge: 0
    };
  }

  return {
    weight: roundDelta(current.weight - previous.weight),
    bodyFat: roundDelta(current.bodyFat - previous.bodyFat),
    muscleMass: roundDelta(current.muscleMass - previous.muscleMass),
    hydration: roundDelta(current.hydration - previous.hydration),
    boneMass: roundDelta(current.boneMass - previous.boneMass),
    visceralFat: roundDelta(current.visceralFat - previous.visceralFat),
    bmr: roundDelta(current.bmr - previous.bmr),
    metabolicAge: roundDelta(current.metabolicAge - previous.metabolicAge)
  };
}

export function formatDelta(value: number, suffix = ""): string {
  if (value === 0) {
    return `0${suffix}`;
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${value}${suffix}`;
}

export function compareAssessmentsDesc(a: AssessmentRecord, b: AssessmentRecord) {
  return new Date(b.date).getTime() - new Date(a.date).getTime();
}

function roundDelta(value: number) {
  return Number(value.toFixed(1));
}

function roundMetric(value: number) {
  return Number(value.toFixed(1));
}

function parseTimelineInput(timeline: string) {
  const normalized = timeline.trim().toLowerCase().replace(",", ".");

  if (!normalized) {
    return {
      days: 90,
      label: "3 mois"
    };
  }

  const monthsMatch = normalized.match(/(\d+(?:\.\d+)?)\s*mois/);
  if (monthsMatch) {
    const months = Number(monthsMatch[1]);
    if (Number.isFinite(months) && months > 0) {
      return {
        days: clampTimelineDays(Math.round(months * 30)),
        label: `${formatDurationNumber(months)} mois`
      };
    }
  }

  const weeksMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:semaines?|sem)/);
  if (weeksMatch) {
    const weeks = Number(weeksMatch[1]);
    if (Number.isFinite(weeks) && weeks > 0) {
      return {
        days: clampTimelineDays(Math.round(weeks * 7)),
        label: `${formatDurationNumber(weeks)} semaine${weeks > 1 ? "s" : ""}`
      };
    }
  }

  const daysMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:jours?|j)/);
  if (daysMatch) {
    const days = Number(daysMatch[1]);
    if (Number.isFinite(days) && days > 0) {
      return {
        days: clampTimelineDays(Math.round(days)),
        label: `${formatDurationNumber(days)} jour${days > 1 ? "s" : ""}`
      };
    }
  }

  const bareNumberMatch = normalized.match(/^(\d+(?:\.\d+)?)$/);
  if (bareNumberMatch) {
    const rawValue = Number(bareNumberMatch[1]);
    if (Number.isFinite(rawValue) && rawValue > 0) {
      if (rawValue <= 12) {
        return {
          days: clampTimelineDays(Math.round(rawValue * 30)),
          label: `${formatDurationNumber(rawValue)} mois`
        };
      }

      return {
        days: clampTimelineDays(Math.round(rawValue)),
        label: `${formatDurationNumber(rawValue)} jours`
      };
    }
  }

  if (normalized.includes("1 mois")) {
    return { days: 30, label: "1 mois" };
  }
  if (normalized.includes("2 mois")) {
    return { days: 60, label: "2 mois" };
  }
  if (normalized.includes("3 mois")) {
    return { days: 90, label: "3 mois" };
  }
  if (normalized.includes("4 mois")) {
    return { days: 120, label: "4 mois" };
  }
  if (normalized.includes("5 mois")) {
    return { days: 150, label: "5 mois" };
  }
  if (normalized.includes("6 mois")) {
    return { days: 180, label: "6 mois" };
  }
  if (normalized.includes("9 mois")) {
    return { days: 270, label: "9 mois" };
  }

  return {
    days: 90,
    label: timeline.trim() || "3 mois"
  };
}

function getWeightLossProteinMultiplier(days: number) {
  if (days <= 60) {
    return { min: 1.5, max: 1.8 };
  }

  if (days <= 120) {
    return { min: 1.4, max: 1.7 };
  }

  if (days <= 180) {
    return { min: 1.3, max: 1.6 };
  }

  return { min: 1.2, max: 1.5 };
}

function clampTimelineDays(days: number) {
  return Math.min(Math.max(days, 14), 365);
}

function formatDurationNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
