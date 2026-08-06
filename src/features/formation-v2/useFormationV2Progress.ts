// =============================================================================
// useFormationV2Progress — progression des micro-leçons (2026-08-04).
//
// Lot 3 : localStorage seul (rapide, hors-ligne, par utilisateur).
// Lot 4 : + PERSISTANCE SERVEUR durable et cross-appareil, SANS migration.
//   On réutilise `user_tour_progress` (table générique « plusieurs tours par
//   user », cf. 20260426140000) avec `tour_key='formation_v2'`. Le parcours
//   étant séquentiel, `last_step = nombre de leçons faites` suffit à
//   reconstruire lesquelles (les N premières).
//   ⚠️ Ni get_user_xp ni get_academy_leaderboard ne lisent ce tour_key (ils
//   filtrent 'academy') → aucune pollution de l'XP global ni du classement.
//
// Le localStorage reste le cache d'affichage instantané et le repli si le
// réseau tombe. Le serveur est la source durable : au montage on réconcilie
// (on adopte le plus avancé des deux, on repousse si le local est en avance).
//
// La série (« streak ») reste locale : il n'existe pas de série formation
// côté serveur (celle du login est un autre système, users.streak_count).
// =============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { getSupabaseClient } from "../../services/supabaseClient";
import { FORMATION_V2_LESSONS } from "./content";

const TOUR_KEY = "formation_v2";
const TOTAL = FORMATION_V2_LESSONS.length;

interface StoredV2 {
  done: string[];
  streakDays: string[]; // dates (jour local) où une leçon a été validée
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

/** Les slugs des `n` premières leçons — le parcours est séquentiel. */
function firstNSlugs(n: number): string[] {
  return FORMATION_V2_LESSONS.slice(0, Math.max(0, Math.min(TOTAL, n))).map((l) => l.slug);
}

/** Nombre de jours consécutifs finissant aujourd'hui ou hier. */
function computeStreak(days: string[]): number {
  if (!days.length) return 0;
  const set = new Set(days);
  const dayMs = 86_400_000;
  const today = new Date();
  today.setHours(12, 0, 0, 0); // midi local : à l'abri des sauts d'heure d'été
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

/** Écrit la progression sur le serveur (best-effort, jamais bloquant). */
async function pushStep(userId: string, step: number) {
  if (!userId || userId === "anon") return;
  try {
    const sb = await getSupabaseClient();
    if (!sb) return;
    await sb.from("user_tour_progress").upsert(
      {
        user_id: userId,
        tour_key: TOUR_KEY,
        last_step: step,
        completed_at: step >= TOTAL ? new Date().toISOString() : null,
      },
      { onConflict: "user_id,tour_key" },
    );
  } catch {
    /* hors-ligne : le localStorage garde le fil, on repoussera au prochain montage */
  }
}

export function useFormationV2Progress() {
  const { currentUser } = useAppContext();
  const uid = currentUser?.id ?? "anon";
  const [state, setState] = useState<StoredV2>(() => read(uid));
  // On ne pousse pas vers le serveur AVANT d'avoir réconcilié au montage :
  // sinon un local frais (0) écraserait une vraie progression serveur.
  const hydrated = useRef(false);

  // ── Réconciliation serveur au montage (durable + cross-appareil) ──────────
  useEffect(() => {
    if (!currentUser?.id) return;
    const userId = currentUser.id;
    let cancelled = false;
    void (async () => {
      let serverStep = 0;
      try {
        const sb = await getSupabaseClient();
        if (sb) {
          const { data } = await sb
            .from("user_tour_progress")
            .select("last_step")
            .eq("user_id", userId)
            .eq("tour_key", TOUR_KEY)
            .maybeSingle();
          serverStep = data?.last_step ?? 0;
        }
      } catch {
        /* réseau KO : on reste sur le local */
      }
      if (cancelled) return;
      setState((prev) => {
        const localStep = prev.done.length;
        // Le serveur est en avance (leçons faites sur un autre appareil) → on adopte.
        if (serverStep > localStep) {
          const next = { done: firstNSlugs(serverStep), streakDays: prev.streakDays };
          try {
            window.localStorage.setItem(keyFor(userId), JSON.stringify(next));
          } catch {
            /* quota */
          }
          return next;
        }
        // Le local est en avance → on repousse vers le serveur.
        if (localStep > serverStep) void pushStep(userId, localStep);
        return prev;
      });
      hydrated.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  // Une fois réconcilié, toute avancée locale est répercutée sur le serveur.
  useEffect(() => {
    if (!hydrated.current || !currentUser?.id) return;
    void pushStep(currentUser.id, state.done.length);
  }, [state.done.length, currentUser?.id]);

  const markDone = useCallback(
    (slug: string) => {
      setState((prev) => {
        if (prev.done.includes(slug)) return prev;
        const done = [...prev.done, slug];
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

  /** Une leçon a-t-elle été validée AUJOURD'HUI ? (pour l'objectif du jour) */
  const doneToday = useMemo(
    () => state.streakDays.includes(localDay(new Date())),
    [state.streakDays],
  );

  /** Slug de la 1ʳᵉ leçon non faite (le point « actif » du chemin). */
  const activeSlug = useMemo(
    () => FORMATION_V2_LESSONS.find((l) => !doneSet.has(l.slug))?.slug ?? null,
    [doneSet],
  );

  return { doneSet, doneCount, streak, doneToday, activeSlug, markDone, xp: doneCount * 15 };
}
