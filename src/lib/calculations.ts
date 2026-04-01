import type {
  AssessmentRecord,
  BodyScanDelta,
  BodyScanMetrics,
  Client,
  Objective,
  WeightLossPaceInsight,
  WeightLossPlan
} from "../types/domain";

export function calculateWaterNeed(weight: number): number {
  if (!weight || weight <= 0) {
    return 0;
  }

  return Number((weight / 30).toFixed(1));
}

export function calculateProteinRange(
  weight: number,
  objective: Objective
): string {
  if (!weight || weight <= 0) {
    return "0 - 0 g";
  }

  const multiplier =
    objective === "sport" ? { min: 1.6, max: 2 } : { min: 1.2, max: 1.5 };

  return `${Math.round(weight * multiplier.min)} - ${Math.round(weight * multiplier.max)} g`;
}

export function formatDate(input: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(input));
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
  const normalized = timeline.toLowerCase();

  if (normalized.includes("1 mois")) {
    return 30;
  }
  if (normalized.includes("3 mois")) {
    return 90;
  }
  if (normalized.includes("6 mois")) {
    return 180;
  }
  if (normalized.includes("9 mois")) {
    return 270;
  }

  return 90;
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
      label: "Objectif deja atteint",
      description: "Le poids cible est deja atteint ou depasse.",
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

export function getLatestAssessment(client: Client): AssessmentRecord {
  return [...client.assessments].sort(compareAssessmentsDesc)[0];
}

export function getPreviousAssessment(client: Client): AssessmentRecord | null {
  const sorted = [...client.assessments].sort(compareAssessmentsDesc);
  return sorted[1] ?? null;
}

export function getFirstAssessment(client: Client): AssessmentRecord {
  return [...client.assessments].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )[0];
}

export function getLatestBodyScan(client: Client): BodyScanMetrics {
  return getLatestAssessment(client).bodyScan;
}

export function getLatestQuestionnaire(client: Client) {
  return getLatestAssessment(client).questionnaire;
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
