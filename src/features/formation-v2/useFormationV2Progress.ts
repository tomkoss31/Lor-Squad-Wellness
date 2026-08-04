// =============================================================================
// useFormationV2Progress — progression des micro-leçons (2026-08-04).
//
// Lot 1 : persistance LÉGÈRE en localStorage (par utilisateur). Suffisant pour
// éprouver l'expérience ; le passage en base (formation_user_progress) se fera
// dans un lot ultérieur, sans changer cette interface.
//
// La série (« streak ») compte les JOURS distincts où au moins une leçon a été
// terminée — même logique simple que useFormationStreak.
// =============================================================================

import { useCallback, useMemo, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { FORMATION_V2_LESSONS } from "./content";

interface StoredV2 {
  done: string[];
  streakDays: string[]; // dates ISO (jour) où une leçon a été validée
}

function keyFor(userId: string) {
  return `ls-formation-v2-${userId}`;
}

/**
 * Jour LOCAL au format YYYY-MM-DD. On n'utilise PAS toISOString() (qui renvoie
 * de l'UTC) : à 11 h en France, minuit local retombe la veille en UTC, et la
 * série se comparait à un mauvais jour → toujours 0. On lit l'heure locale.
 */
function localDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function read(userId: string): StoredV2 {
  if (typeof window === "undefined") return { done: [], streakDays: [] };
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    if (!raw) return { done: [], streakDays: [] };
    const parsed = JSON.parse(raw) as Partial<StoredV2>;
    return { done: parsed.done ?? [], streakDays: parsed.streakDays ?? [] };
  } catch {
    return { done: [], streakDays: [] };
  }
}

/** Nombre de jours consécutifs finissant aujourd'hui ou hier. */
function computeStreak(days: string[]): number {
  if (!days.length) return 0;
  const set = new Set(days);
  const dayMs = 86_400_000;
  const today = new Date();
  today.setHours(12, 0, 0, 0); // midi local : à l'abri des sauts d'heure d'été
  // La série reste valide si la dernière activité est aujourd'hui OU hier.
  let cursor = new Date(today);
  if (!set.has(localDay(cursor))) {
    cursor = new Date(today.getTime() - dayMs);
    if (!set.has(localDay(cursor))) return 0;
  }
  let streak = 0;
  while (set.has(localDay(cursor))) {
    streak++;
    cursor = new Date(cursor.getTime() - dayMs);
  }
  return streak;
}

export function useFormationV2Progress() {
  const { currentUser } = useAppContext();
  const uid = currentUser?.id ?? "anon";
  const [state, setState] = useState<StoredV2>(() => read(uid));

  const markDone = useCallback(
    (slug: string) => {
      setState((prev) => {
        const done = prev.done.includes(slug) ? prev.done : [...prev.done, slug];
        const today = localDay(new Date());
        const streakDays = prev.streakDays.includes(today)
          ? prev.streakDays
          : [...prev.streakDays, today];
        const next = { done, streakDays };
        try {
          window.localStorage.setItem(keyFor(uid), JSON.stringify(next));
        } catch {
          /* quota plein : on garde l'état en mémoire */
        }
        return next;
      });
    },
    [uid],
  );

  const doneSet = useMemo(() => new Set(state.done), [state.done]);
  const doneCount = useMemo(
    () => FORMATION_V2_LESSONS.filter((l) => doneSet.has(l.slug)).length,
    [doneSet],
  );
  const streak = useMemo(() => computeStreak(state.streakDays), [state.streakDays]);

  /** Slug de la 1ʳᵉ leçon non faite (le point « actif » du chemin). */
  const activeSlug = useMemo(
    () => FORMATION_V2_LESSONS.find((l) => !doneSet.has(l.slug))?.slug ?? null,
    [doneSet],
  );

  return { doneSet, doneCount, streak, activeSlug, markDone, xp: doneCount * 15 };
}
