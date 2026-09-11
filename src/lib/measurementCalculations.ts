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

// =============================================================================
// mergeLatestPerZone / mergeInitialPerZone — 11/09/2026, cas Catherine DAUMAIL.
//
// `saveSession` écrit UNE LIGNE par commit, avec seulement les zones saisies
// ce jour-là (voulu, documenté dans useMeasurements.ts). Une personne qui
// mesure une zone à la fois, au fil de plusieurs passages, produit donc des
// lignes à 1-2 champs. `getLatestSession()` rendait cette ligne TELLE QUELLE,
// comme si elle portait l'état des 10 zones : le compteur "X/10 zones" ne
// comptait que SES champs, et la modale "Dernière mesure" retombait sur
// `initial[key]` — la toute première session, jamais la vraie dernière.
//
// Chez Daumail (20 lignes, ~2 champs/ligne en moyenne) l'écart sautait aux
// yeux : "Dernière mesure : 42 cm · 07 juin" quand son cou avait été mesuré
// à 40,5 cm le 27/08. Chez les 27 autres clientes qui ont des mensurations,
// le bug était DORMANT, pas absent : elles saisissent presque tout en un
// coup (3,5 à 10 champs/ligne en moyenne mesuré), donc la ligne la plus
// récente contient déjà l'essentiel.
//
// Le fix : ne jamais lire une ligne comme "l'état des 10 zones". Balayer
// l'historique et prendre, PAR ZONE, la première valeur non-nulle trouvée —
// dans un sens pour "la dernière connue", dans l'autre pour "la première".
// =============================================================================

/** Une valeur retrouvée pour une zone, avec la date de la ligne qui la porte. */
export interface ValeurZone {
  value: number | null;
  measuredAt: string | null;
}

function premiereValeurNonNulle(
  sessionsOrdonnees: ClientMeasurement[],
): Record<MeasurementKey, ValeurZone> {
  const result = {} as Record<MeasurementKey, ValeurZone>;
  for (const key of MEASUREMENT_KEYS) {
    const hit = sessionsOrdonnees.find((s) => (s[key] as number | null | undefined) != null);
    result[key] = hit
      ? { value: hit[key] as number, measuredAt: hit.measured_at }
      : { value: null, measuredAt: null };
  }
  return result;
}

/** Pour chaque zone : la valeur non-nulle la plus RÉCENTE + sa date. */
export function mergeLatestPerZone(sessions: ClientMeasurement[]): Record<MeasurementKey, ValeurZone> {
  const parDateDesc = [...sessions].sort(
    (a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime(),
  );
  return premiereValeurNonNulle(parDateDesc);
}

/** Pour chaque zone : la valeur non-nulle la plus ANCIENNE + sa date — le
 *  vrai point de départ, même si la toute première session n'avait pas
 *  cette zone-là. */
export function mergeInitialPerZone(sessions: ClientMeasurement[]): Record<MeasurementKey, ValeurZone> {
  const parDateAsc = [...sessions].sort(
    (a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime(),
  );
  return premiereValeurNonNulle(parDateAsc);
}

/** Aplatit un résultat de `mergeLatestPerZone`/`mergeInitialPerZone` en
 *  `Partial<ClientMeasurement>` — compatible tel quel avec `countFilledKeys`,
 *  `calculateTotalCmLost` et `getZoneDelta`, qui n'ont pas eu à changer. */
export function zonesToSnapshot(parZone: Record<MeasurementKey, ValeurZone>): Partial<ClientMeasurement> {
  const snap: Partial<ClientMeasurement> = {};
  for (const key of MEASUREMENT_KEYS) (snap as Record<string, number | null>)[key] = parZone[key].value;
  return snap;
}
