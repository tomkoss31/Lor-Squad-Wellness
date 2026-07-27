// =============================================================================
// useBbcPrelaunch — progression du pré-lancement 6 semaines (chantier BBC).
// Lit/écrit bbc_prelaunch_progress (RLS : chacun la sienne). Les « portes »
// non négociables décident si le club est prêt à ouvrir.
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import { PRELAUNCH_TASKS, PRELAUNCH_GATES, PRELAUNCH_WEEKS } from "./data/bbcPrelaunch";

export interface UseBbcPrelaunchResult {
  done: Record<string, boolean>;
  loading: boolean;
  toggle: (taskKey: string) => Promise<void>;
  /** Avancement global 0-100. */
  percent: number;
  /** Portes non négociables encore ouvertes. */
  gatesLeft: string[];
  readyToOpen: boolean;
  /** Avancement par semaine : { [week]: { done, total } }. */
  byWeek: Record<number, { done: number; total: number }>;
  /** Première semaine non terminée (celle à travailler). */
  currentWeek: number;
}

export function useBbcPrelaunch(userId?: string | null): UseBbcPrelaunchResult {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const sb = await getSupabaseClient();
      if (!sb) return;
      const { data } = await sb
        .from("bbc_prelaunch_progress")
        .select("task_key, done_at")
        .eq("user_id", userId);
      if (Array.isArray(data)) {
        const map: Record<string, boolean> = {};
        for (const r of data as Array<Record<string, unknown>>) {
          map[String(r.task_key)] = Boolean(r.done_at);
        }
        setDone(map);
      }
    } catch {
      // silent-fail
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const toggle = useCallback(
    async (taskKey: string) => {
      const next = !done[taskKey];
      setDone((prev) => ({ ...prev, [taskKey]: next })); // optimiste
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const { error } = await sb.rpc("bbc_toggle_prelaunch", { p_task_key: taskKey, p_done: next });
        if (error) setDone((prev) => ({ ...prev, [taskKey]: !next })); // rollback
      } catch {
        setDone((prev) => ({ ...prev, [taskKey]: !next }));
      }
    },
    [done],
  );

  const { percent, gatesLeft, byWeek, currentWeek } = useMemo(() => {
    const total = PRELAUNCH_TASKS.length;
    const nbDone = PRELAUNCH_TASKS.filter((t) => done[t.key]).length;
    const gl = PRELAUNCH_GATES.filter((k) => !done[k]);
    const bw: Record<number, { done: number; total: number }> = {};
    for (const w of PRELAUNCH_WEEKS) {
      const tasks = PRELAUNCH_TASKS.filter((t) => t.week === w.week);
      bw[w.week] = { done: tasks.filter((t) => done[t.key]).length, total: tasks.length };
    }
    const cw = PRELAUNCH_WEEKS.find((w) => bw[w.week].done < bw[w.week].total)?.week ?? PRELAUNCH_WEEKS.length;
    return {
      percent: total ? Math.round((nbDone / total) * 100) : 0,
      gatesLeft: gl,
      byWeek: bw,
      currentWeek: cw,
    };
  }, [done]);

  return { done, loading, toggle, percent, gatesLeft, readyToOpen: gatesLeft.length === 0, byWeek, currentWeek };
}
