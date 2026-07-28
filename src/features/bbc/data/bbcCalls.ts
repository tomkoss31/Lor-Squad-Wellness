// =============================================================================
// bbcCalls — les rituels du club (Appel Ambassadeur / Atelier Cœurs / Academy).
// Lus depuis clubs.settings.calls (config par club) — JAMAIS en dur : les
// horaires ne sont pas tranchés (20h vs 20h30 = décision orga). Les valeurs
// ci-dessous ne servent que de repli si un club n'a pas encore sa config.
// =============================================================================

import type { ClubSettings } from "../../../types/domain";

const DAY_INDEX: Record<string, number> = {
  dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6,
};

const LABELS: Record<string, string> = {
  appel_ambassadeur: "Appel Ambassadeur",
  atelier_coeurs: "Atelier Cœurs",
  coach_academy: "Coach Academy",
};

const FALLBACK: NonNullable<ClubSettings["calls"]> = {
  appel_ambassadeur: { days: ["lundi", "jeudi"], time: "20:00" },
  atelier_coeurs: { days: ["mardi", "samedi"], time: "20:00" },
  coach_academy: { days: ["mercredi"], time: "19:00" },
};

export interface NextCall {
  key: string;
  label: string;
  /** Date/heure de la prochaine occurrence. */
  at: Date;
  /** true si c'est aujourd'hui. */
  isToday: boolean;
  /** ex. « aujourd'hui · 20h00 » ou « lundi · 20h00 ». */
  when: string;
}

/** Prochaines occurrences des rituels, triées (la plus proche d'abord). */
export function getNextCalls(settings?: ClubSettings | null, now = new Date()): NextCall[] {
  const calls = settings?.calls ?? FALLBACK;
  const out: NextCall[] = [];

  for (const [key, cfg] of Object.entries(calls)) {
    if (!cfg?.days?.length || !cfg.time) continue;
    const [h, m] = cfg.time.split(":").map((v) => parseInt(v, 10));
    if (Number.isNaN(h)) continue;

    for (const day of cfg.days) {
      const target = DAY_INDEX[day.toLowerCase()];
      if (target === undefined) continue;
      const at = new Date(now);
      at.setHours(h, m || 0, 0, 0);
      let delta = (target - now.getDay() + 7) % 7;
      // Occurrence du jour déjà passée → semaine suivante.
      if (delta === 0 && at.getTime() <= now.getTime()) delta = 7;
      at.setDate(at.getDate() + delta);

      const isToday = delta === 0;
      const time = `${String(h).padStart(2, "0")}h${String(m || 0).padStart(2, "0")}`;
      out.push({
        key,
        label: LABELS[key] ?? key,
        at,
        isToday,
        when: `${isToday ? "aujourd'hui" : at.toLocaleDateString("fr-FR", { weekday: "long" })} · ${time}`,
      });
    }
  }

  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/**
 * Toutes les occurrences des rituels DANS une semaine donnée (« La semaine du
 * club », 2026-07-28).
 *
 * `getNextCalls` ne sert pas ici : il regarde vers l'AVANT et repousse à la
 * semaine suivante une occurrence déjà passée dans la journée. Parfait pour un
 * « prochain appel », faux pour un agenda — l'atelier de mardi soir aurait
 * disparu de la semaine dès mercredi matin, alors que le coach a justement
 * besoin de le revoir pour faire ses suivis.
 *
 * La fonction vit ici, et pas dans la vue, pour que les libellés, le repli et
 * la lecture de la config restent partagés avec le reste du mode BBC.
 *
 * @param weekStart lundi 00:00 de la semaine voulue.
 */
export function getCallsForWeek(settings: ClubSettings | null | undefined, weekStart: Date): NextCall[] {
  const calls = settings?.calls ?? FALLBACK;
  const today = new Date();
  const out: NextCall[] = [];

  for (const [key, cfg] of Object.entries(calls)) {
    if (!cfg?.days?.length || !cfg.time) continue;
    const [h, m] = cfg.time.split(":").map((v) => parseInt(v, 10));
    if (Number.isNaN(h)) continue;

    for (const day of cfg.days) {
      const target = DAY_INDEX[day.toLowerCase()];
      if (target === undefined) continue;
      // `weekStart` est un lundi : dimanche (index 0) est le 7e jour, pas le 1er.
      const offset = (target + 6) % 7;
      const at = new Date(weekStart);
      at.setDate(at.getDate() + offset);
      at.setHours(h, m || 0, 0, 0);

      const isToday = at.toDateString() === today.toDateString();
      const time = `${String(h).padStart(2, "0")}h${String(m || 0).padStart(2, "0")}`;
      out.push({
        key,
        label: LABELS[key] ?? key,
        at,
        isToday,
        when: `${isToday ? "aujourd'hui" : at.toLocaleDateString("fr-FR", { weekday: "long" })} · ${time}`,
      });
    }
  }

  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}
