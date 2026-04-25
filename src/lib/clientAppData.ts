// Helpers purs pour l'app client (Chantier Refonte Accueil + Évolution v2).
// Aucun side-effect, signatures stables, exploités par ClientHomeTab,
// ClientAppPage (onglet Évolution) et les composants ClientApp* dédiés.

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

/** Item le plus ancien par date asc. Null si liste vide. */
export function getStartingPoint<T extends { date: string }>(items: T[]): T | null {
  if (!items || items.length === 0) return null;
  let best = items[0];
  for (const it of items) {
    if (new Date(it.date).getTime() < new Date(best.date).getTime()) {
      best = it;
    }
  }
  return best;
}

/** Item le plus récent par date desc. Null si liste vide. */
export function getCurrentPoint<T extends { date: string }>(items: T[]): T | null {
  if (!items || items.length === 0) return null;
  let best = items[0];
  for (const it of items) {
    if (new Date(it.date).getTime() > new Date(best.date).getTime()) {
      best = it;
    }
  }
  return best;
}

/** current - starting, ou null si l'un des deux n'est pas un number valide. */
export function calculateDelta(
  current: number | null | undefined,
  starting: number | null | undefined,
): number | null {
  if (!isValidNumber(current) || !isValidNumber(starting)) return null;
  return current - starting;
}

/** Diff en jours arrondi entre maintenant et startDate. >= 0. */
export function getDaysSinceStart(startDate: string): number {
  const start = new Date(startDate).getTime();
  if (Number.isNaN(start)) return 0;
  const diffMs = Date.now() - start;
  return Math.max(0, Math.round(diffMs / (24 * 60 * 60 * 1000)));
}

/** Diff en jours arrondi entre scheduledAt et maintenant (peut être négatif). */
export function getNextRdvDays(scheduledAt: string): number {
  const target = new Date(scheduledAt).getTime();
  if (Number.isNaN(target)) return 0;
  const diffMs = target - Date.now();
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}
