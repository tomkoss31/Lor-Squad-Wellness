// =============================================================================
// pick-quote-of-day — Phase A Co-pilote V5 (2026-05-05)
//
// Pure function (testable). Sélectionne 1 quote stable pour un user un jour
// donné, avec random pondéré par `weight` :
//
//   1. Construit un array "weighted" où chaque quote apparaît `weight` fois.
//   2. Hash deterministique de (userId + dateYYYYMMDD).
//   3. Modulo length de l'array → index → quote choisie.
//
// Stable sur la journée (même user, même date → même quote). Change le
// lendemain. Pondère naturellement les quotes signature Lor'Squad qui ont
// weight=2 (apparaissent 2× dans l'array virtuel).
// =============================================================================

export interface DailyQuote {
  id: string;
  quote: string;
  author: string | null;
  category: string;
  weight: number;
  active: boolean;
}

/**
 * Hash 32-bit deterministic d'une string (FNV-1a like, simple et rapide).
 * Pas crypto-secure mais suffisant pour distribuer une sélection.
 */
function hashString(input: string): number {
  let hash = 0x811c9dc5; // FNV-1a 32-bit offset basis
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // Multiply by FNV prime (0x01000193) avec arithmétique 32-bit forcée
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0; // unsigned 32-bit
}

/**
 * Format YYYYMMDD à partir d'une Date locale (heure du device).
 * Stable sur la journée pour un même user, change à minuit local.
 */
export function ymdLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/**
 * Sélectionne UNE quote stable pour (userId, date) avec random pondéré.
 *
 * @param quotes Liste des quotes candidates (déjà filtrées par catégorie).
 * @param userId ID du user (sert au hash, garantit même quote pour un user).
 * @param date Date pour laquelle générer la quote (default = today local).
 * @returns La quote choisie, ou null si la liste est vide.
 */
export function pickQuoteOfTheDay(
  quotes: DailyQuote[],
  userId: string,
  date: Date = new Date(),
): DailyQuote | null {
  const active = quotes.filter((q) => q.active);
  if (active.length === 0) return null;

  // Construit l'array pondéré : [q1, q1, q2, q3, q3, q3] si weight=2,1,3.
  const weighted: DailyQuote[] = [];
  for (const q of active) {
    const w = Math.max(1, Math.floor(q.weight ?? 1));
    for (let i = 0; i < w; i++) {
      weighted.push(q);
    }
  }

  if (weighted.length === 0) return active[0]; // safety fallback

  const seed = `${userId}-${ymdLocal(date)}`;
  const h = hashString(seed);
  const index = h % weighted.length;
  return weighted[index];
}

/**
 * Variante : pré-filtre par catégorie avant de picker. Utile depuis le
 * hook useDailyBoost qui reçoit la catégorie depuis useTimeContext.
 */
export function pickQuoteForCategory(
  quotes: DailyQuote[],
  category: string,
  userId: string,
  date: Date = new Date(),
): DailyQuote | null {
  const filtered = quotes.filter((q) => q.category === category);
  // Si aucune quote dans la catégorie demandée, fallback sur l'ensemble
  // (évite l'écran vide si admin a tout désactivé sur 1 catégorie).
  const pool = filtered.length > 0 ? filtered : quotes;
  return pickQuoteOfTheDay(pool, userId, date);
}
