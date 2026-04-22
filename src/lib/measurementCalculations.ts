// Chantier Module Mensurations (2026-04-24).
// Helpers de calcul sur les sessions de mesures.

import { MEASUREMENT_KEYS, type MeasurementKey } from "../data/measurementGuides";

export interface ClientMeasurement {
  id: string;
  client_id: string;
  neck: number | null;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  thigh_left: number | null;
  thigh_right: number | null;
  arm_left: number | null;
  arm_right: number | null;
  calf_left: number | null;
  calf_right: number | null;
  measured_at: string;
  measured_by_type: "coach" | "client";
  measured_by_user_id: string | null;
  notes: string | null;
  created_at: string;
}

/**
 * Calcule le total cm perdus (positif = a perdu) sur toutes les zones
 * dont l'initial ET l'actuel sont renseignés.
 */
export function calculateTotalCmLost(
  initial: Partial<ClientMeasurement> | null,
  current: Partial<ClientMeasurement> | null,
): number {
  if (!initial || !current) return 0;
  return MEASUREMENT_KEYS.reduce((total, key) => {
    const init = initial[key] as number | null | undefined;
    const curr = current[key] as number | null | undefined;
    if (init != null && curr != null) {
      return total + (init - curr);
    }
    return total;
  }, 0);
}

/**
 * Nombre de zones renseignées dans une session (sur 10).
 */
export function countFilledKeys(row: Partial<ClientMeasurement> | null): number {
  if (!row) return 0;
  return MEASUREMENT_KEYS.filter((k) => (row[k] as number | null | undefined) != null).length;
}

/**
 * Parse un input cm utilisateur : accepte `78`, `78.5`, `78,5`.
 * Retourne null si invalide, 0-300 bornes raisonnables sinon.
 */
export function parseMeasurementInput(input: string): number | null {
  const normalized = input.trim().replace(",", ".");
  if (!normalized) return null;
  const n = Number.parseFloat(normalized);
  if (!Number.isFinite(n)) return null;
  if (n <= 0 || n > 300) return null;
  return Math.round(n * 100) / 100; // 2 décimales max
}

/**
 * Retourne la session la plus récente (measured_at DESC).
 */
export function getLatestSession(
  sessions: ClientMeasurement[],
): ClientMeasurement | null {
  if (!sessions.length) return null;
  return [...sessions].sort(
    (a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime(),
  )[0];
}

/**
 * Retourne la session la plus ancienne (première mesure = référence initiale).
 */
export function getInitialSession(
  sessions: ClientMeasurement[],
): ClientMeasurement | null {
  if (!sessions.length) return null;
  return [...sessions].sort(
    (a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime(),
  )[0];
}

/**
 * Retourne le delta cm pour une zone donnée (négatif = a perdu ; positif = a pris).
 * null si l'une des 2 valeurs manque.
 */
export function getZoneDelta(
  initial: Partial<ClientMeasurement> | null,
  current: Partial<ClientMeasurement> | null,
  key: MeasurementKey,
): number | null {
  const init = initial?.[key] as number | null | undefined;
  const curr = current?.[key] as number | null | undefined;
  if (init == null || curr == null) return null;
  return curr - init;
}
