// Helpers app client — Chantier MEGA v2 (2026-04-25).
// Source de vérité pour les calculs delta/dates dans les composants
// ClientApp* (Hero, Evolution, Mensurations, Action du jour, etc.).

export type AssessmentType = "initial" | "follow-up";

export interface BodyScan {
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
  hydration?: number;
  visceralFat?: number;
  metabolicAge?: number;
  bmr?: number;
}

export interface Assessment {
  date: string;
  type: AssessmentType;
  bodyScan: BodyScan;
}

export interface Measurement {
  measured_at: string;
  waist_cm?: number;
  hips_cm?: number;
  thigh_cm?: number;
  arm_cm?: number;
}

// Compat helpers Chantier 2 (avant refonte) — conservés pour code existant.
export interface BodyScanLite {
  weight?: number | null;
  bodyFat?: number | null;
  muscleMass?: number | null;
  hydration?: number | null;
  visceralFat?: number | null;
  metabolicAge?: number | null;
  bmr?: number | null;
}
export interface AssessmentLite {
  date: string;
  bodyScan: BodyScanLite;
}

function isValidNumber(n: unknown): n is number {
  return typeof n === "number" && !Number.isNaN(n);
}

/** Premier item (ordre asc supposé). Null si liste vide. */
export function getStartingAssessment(assessments: Assessment[]): Assessment | null {
  if (!assessments?.length) return null;
  return assessments[0];
}

/** Dernier item (ordre asc supposé). Null si liste vide. */
export function getCurrentAssessment(assessments: Assessment[]): Assessment | null {
  if (!assessments?.length) return null;
  return assessments[assessments.length - 1];
}

/** Compat Chantier 2 — équivalent générique. */
export function getStartingPoint<T extends { date: string }>(items: T[]): T | null {
  if (!items?.length) return null;
  let best = items[0];
  for (const it of items) {
    if (new Date(it.date).getTime() < new Date(best.date).getTime()) best = it;
  }
  return best;
}
export function getCurrentPoint<T extends { date: string }>(items: T[]): T | null {
  if (!items?.length) return null;
  let best = items[0];
  for (const it of items) {
    if (new Date(it.date).getTime() > new Date(best.date).getTime()) best = it;
  }
  return best;
}

/** current - starting (positif si delta croît). null si l'un des 2 invalide. */
export function calculateDelta(
  current: number | null | undefined,
  starting: number | null | undefined,
): number | null {
  if (!isValidNumber(current) || !isValidNumber(starting)) return null;
  return current - starting;
}

/**
 * Poids perdu (start - current). Positif = perte. 0 si données manquantes.
 * Arrondi à 0.1 kg.
 */
export function calculateWeightLost(assessments: Assessment[]): number {
  const start = getStartingAssessment(assessments);
  const current = getCurrentAssessment(assessments);
  const sw = start?.bodyScan?.weight;
  const cw = current?.bodyScan?.weight;
  if (!isValidNumber(sw) || !isValidNumber(cw)) return 0;
  return Math.round((sw - cw) * 10) / 10;
}

/**
 * CM totaux perdus (somme tour de taille + hanches + cuisses + bras).
 * Diff start vs current. 0 si <2 mesures ou que des champs manquants.
 * Plancher 0 (pas de gain affiché ici).
 */
export function calculateTotalCmLost(measurements: Measurement[]): number {
  if (!measurements?.length || measurements.length < 2) return 0;
  const start = measurements[0];
  const current = measurements[measurements.length - 1];
  const sumOf = (m: Measurement) =>
    (m.waist_cm ?? 0) + (m.hips_cm ?? 0) + (m.thigh_cm ?? 0) + (m.arm_cm ?? 0);
  const startTotal = sumOf(start);
  const currentTotal = sumOf(current);
  return Math.max(0, Math.round(startTotal - currentTotal));
}

/** Diff en jours entre maintenant et startDate. >= 0. */
export function getDaysSinceStart(startDate: string): number {
  const start = new Date(startDate).getTime();
  if (Number.isNaN(start)) return 0;
  return Math.max(0, Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24)));
}

/** Diff en jours entre RDV et maintenant (ceil, peut être négatif). */
export function getDaysUntilRdv(scheduledAt: string): number {
  const target = new Date(scheduledAt).getTime();
  if (Number.isNaN(target)) return 0;
  return Math.ceil((target - Date.now()) / (1000 * 60 * 60 * 24));
}

/** Compat Chantier 2 — alias getDaysUntilRdv. */
export function getNextRdvDays(scheduledAt: string): number {
  return getDaysUntilRdv(scheduledAt);
}

/** Format court "JJ/MM" (zero-padded). Vide si date invalide. */
export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Format long "23 avr." (locale fr-FR). Vide si invalide. */
export function formatLongDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
