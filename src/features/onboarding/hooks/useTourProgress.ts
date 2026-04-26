// Chantier Refactor onboarding additif (2026-04-26).
// Hook generique de progression de tour. Branche sur les tables
// public.user_tour_progress et public.user_tour_reminder_dismissals
// (migration 20260426140000_academy_foundation.sql).
//
// Pattern aligne sur useOnboardingState :
//   - localStorage-first (instantane, offline-safe)
//   - sync DB en arriere-plan (non-bloquante)
//   - silent fail si la table n existe pas encore (pre-migration)

import { useCallback, useEffect, useState } from "react";
import { useAppContext } from "../../../context/AppContext";
import { getSupabaseClient } from "../../../services/supabaseClient";

const LS_PREFIX = "lorsquad-tour-";

export interface TourProgressState {
  loaded: boolean;
  startedAt: string | null;
  completedAt: string | null;
  skippedAt: string | null;
  lastStep: number;
}

interface DbRow {
  user_id: string;
  tour_key: string;
  last_step: number | null;
  completed_at: string | null;
  skipped_at: string | null;
  started_at: string | null;
  updated_at: string | null;
}

function todayIsoDate(): string {
  // YYYY-MM-DD basé sur l heure locale (la colonne dismissed_on est de
  // type DATE avec default current_date — alignement local pour eviter
  // les decalages timezone).
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function lsKey(tourKey: string, userId: string): string {
  return `${LS_PREFIX}${tourKey}-${userId}`;
}

function readLocal(tourKey: string, userId: string): Partial<TourProgressState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(lsKey(tourKey, userId));
    if (!raw) return {};
    return JSON.parse(raw) as Partial<TourProgressState>;
  } catch {
    return {};
  }
}

function writeLocal(
  tourKey: string,
  userId: string,
  patch: Partial<TourProgressState>,
) {
  if (typeof window === "undefined") return;
  try {
    const current = readLocal(tourKey, userId);
    const next = { ...current, ...patch };
    window.localStorage.setItem(lsKey(tourKey, userId), JSON.stringify(next));
  } catch {
    // quota / mode prive
  }
}

const NOOP = () => {
  /* no-op */
};

const EMPTY_STATE: TourProgressState = {
  loaded: false,
  startedAt: null,
  completedAt: null,
  skippedAt: null,
  lastStep: 0,
};

export function useTourProgress(tourKey: string) {
  const { currentUser } = useAppContext();
  const userId = currentUser?.id ?? null;

  const [state, setState] = useState<TourProgressState>(() => {
    if (!userId) return EMPTY_STATE;
    const local = readLocal(tourKey, userId);
    return {
      loaded: false,
      startedAt: local.startedAt ?? null,
      completedAt: local.completedAt ?? null,
      skippedAt: local.skippedAt ?? null,
      lastStep: local.lastStep ?? 0,
    };
  });

  const [hasDismissedToday, setHasDismissedToday] = useState<boolean>(false);

  // ─── Lecture initiale DB ───────────────────────────────────────────────
  useEffect(() => {
    if (!userId) {
      setState(EMPTY_STATE);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) {
          if (!cancelled) setState((s) => ({ ...s, loaded: true }));
          return;
        }
        const [progressRes, dismissalRes] = await Promise.all([
          sb
            .from("user_tour_progress")
            .select("user_id, tour_key, last_step, completed_at, skipped_at, started_at, updated_at")
            .eq("user_id", userId)
            .eq("tour_key", tourKey)
            .maybeSingle(),
          sb
            .from("user_tour_reminder_dismissals")
            .select("user_id")
            .eq("user_id", userId)
            .eq("tour_key", tourKey)
            .eq("dismissed_on", todayIsoDate())
            .maybeSingle(),
        ]);

        if (cancelled) return;

        const row = (progressRes.data as DbRow | null) ?? null;
        if (row) {
          const next: TourProgressState = {
            loaded: true,
            startedAt: row.started_at ?? null,
            completedAt: row.completed_at ?? null,
            skippedAt: row.skipped_at ?? null,
            lastStep: row.last_step ?? 0,
          };
          setState(next);
          writeLocal(tourKey, userId, {
            startedAt: next.startedAt,
            completedAt: next.completedAt,
            skippedAt: next.skippedAt,
            lastStep: next.lastStep,
          });
        } else {
          setState((s) => ({ ...s, loaded: true }));
        }

        setHasDismissedToday(!!dismissalRes.data);
      } catch (err) {
        // Table inexistante (pre-migration) ou autre erreur reseau :
        // on continue en localStorage-only.
        console.warn("[useTourProgress] DB read failed, localStorage-only:", err);
        if (!cancelled) setState((s) => ({ ...s, loaded: true }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, tourKey]);

  // ─── Persistance progression ───────────────────────────────────────────
  const persist = useCallback(
    async (patch: {
      lastStep?: number;
      completedAt?: string | null;
      skippedAt?: string | null;
      startedAt?: string | null;
    }) => {
      if (!userId) return;

      // Update local state immediatement
      setState((s) => ({
        ...s,
        startedAt: patch.startedAt !== undefined ? patch.startedAt : s.startedAt,
        completedAt: patch.completedAt !== undefined ? patch.completedAt : s.completedAt,
        skippedAt: patch.skippedAt !== undefined ? patch.skippedAt : s.skippedAt,
        lastStep: patch.lastStep ?? s.lastStep,
      }));
      writeLocal(tourKey, userId, patch);

      // Sync DB en arriere-plan (non-bloquant)
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const nowIso = new Date().toISOString();
        const upsertRow: Record<string, unknown> = {
          user_id: userId,
          tour_key: tourKey,
          updated_at: nowIso,
        };
        if (patch.lastStep !== undefined) upsertRow.last_step = patch.lastStep;
        if (patch.completedAt !== undefined) upsertRow.completed_at = patch.completedAt;
        if (patch.skippedAt !== undefined) upsertRow.skipped_at = patch.skippedAt;
        // started_at est defini une seule fois (premier upsert), apres on
        // laisse la DB conserver la valeur. On ne le set explicitement que
        // si patch.startedAt est fourni.
        if (patch.startedAt !== undefined && patch.startedAt !== null) {
          upsertRow.started_at = patch.startedAt;
        }

        await sb
          .from("user_tour_progress")
          .upsert(upsertRow, { onConflict: "user_id,tour_key" });
      } catch (err) {
        console.warn("[useTourProgress] DB upsert failed:", err);
      }
    },
    [userId, tourKey],
  );

  const markStep = useCallback(
    (step: number) => {
      // Au premier step (0 ou 1), on initialise startedAt si pas encore set.
      const startedAt =
        state.startedAt ?? new Date().toISOString();
      void persist({
        lastStep: step,
        startedAt: state.startedAt ? undefined : startedAt,
      });
    },
    [persist, state.startedAt],
  );

  const markCompleted = useCallback(() => {
    void persist({ completedAt: new Date().toISOString() });
  }, [persist]);

  const markSkipped = useCallback(() => {
    void persist({ skippedAt: new Date().toISOString() });
  }, [persist]);

  const markDismissedToday = useCallback(() => {
    if (!userId) return;
    setHasDismissedToday(true);
    void (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        await sb
          .from("user_tour_reminder_dismissals")
          .upsert(
            {
              user_id: userId,
              tour_key: tourKey,
              dismissed_on: todayIsoDate(),
            },
            { onConflict: "user_id,tour_key,dismissed_on", ignoreDuplicates: true },
          );
      } catch (err) {
        console.warn("[useTourProgress] dismiss upsert failed:", err);
      }
    })();
  }, [userId, tourKey]);

  const resetForReplay = useCallback(() => {
    if (!userId) return;
    // Reset localStorage uniquement (pas la DB) — coherent avec
    // useOnboardingState.resetForReplay : la DB conserve la trace
    // d usage, le front relance le tuto.
    try {
      window.localStorage.removeItem(lsKey(tourKey, userId));
    } catch {
      // mode prive / quota
    }
    setState((s) => ({ ...s, lastStep: 0 }));
  }, [userId, tourKey]);

  // ─── No-op si pas de user (currentUser null) ───────────────────────────
  if (!userId) {
    return {
      state: EMPTY_STATE,
      markStep: NOOP as (step: number) => void,
      markCompleted: NOOP,
      markSkipped: NOOP,
      markDismissedToday: NOOP,
      hasDismissedToday: false,
      resetForReplay: NOOP,
    };
  }

  return {
    state,
    markStep,
    markCompleted,
    markSkipped,
    markDismissedToday,
    hasDismissedToday,
    resetForReplay,
  };
}
