// Chantier Team Tree Lineage (2026-04-25).
// Hook fetch arbre + stats + classement via les 3 RPCs SQL déployées
// (migration 20260425230000). Les calculs côté front sont remplacés par
// des requêtes agrégées côté DB — perf O(1) au changement de distri.
//
// Tolérant aux environnements sans RPCs (dev local sans migration
// appliquée) : on expose un `error` que le composant peut utiliser pour
// afficher un fallback ou un bandeau.

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../services/supabaseClient";

export type Period = "week" | "month" | "year";

export interface TeamTreeRow {
  user_id: string;
  parent_id: string | null;
  depth: number;
  name: string;
  email: string;
  role: string;
  title: string;
  active: boolean;
  created_at: string;
  clients_count: number;
  active_clients_count: number;
  prospects_count: number;
  subteam_count: number;
}

export interface DistributorStatsRpc {
  active_clients_count: number;
  active_clients_delta: number;
  prospects_count: number;
  prospects_hot_count: number;
  subteam_count: number;
  retention_prospects_pct: number | null;
  retention_prospects_converted: number;
  retention_prospects_total: number;
  retention_clients_pct: number | null;
  retention_clients_still_active: number;
  retention_clients_total: number;
}

export interface TeamRankingEntry {
  user_id: string;
  name: string;
  clients_delta: number;
  prospects_period: number;
  retention_prospects_pct: number | null;
  retention_clients_pct: number | null;
  score: number;
}

export function getPeriodStart(period: Period): Date {
  const d = new Date();
  if (period === "week") {
    const day = d.getDay() || 7; // Lundi = 1
    d.setDate(d.getDate() - (day - 1));
    d.setHours(0, 0, 0, 0);
  } else if (period === "month") {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
  } else {
    d.setMonth(0, 1);
    d.setHours(0, 0, 0, 0);
  }
  return d;
}

// ─── Hook principal ───────────────────────────────────────────────────────
export function useTeamTree(rootUserId: string | null) {
  const [rows, setRows] = useState<TeamTreeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!rootUserId) return;
    setLoading(true);
    setError(null);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Supabase indisponible.");
      const { data, error: err } = await sb.rpc("get_team_tree", {
        root_user_id: rootUserId,
      });
      if (err) throw err;
      setRows((data ?? []) as TeamTreeRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [rootUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { rows, loading, error, reload: load };
}

export function useDistributorStats(
  userId: string | null,
  period: Period,
) {
  const [stats, setStats] = useState<DistributorStatsRpc | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const periodStart = useMemo(() => getPeriodStart(period).toISOString(), [period]);

  useEffect(() => {
    if (!userId) {
      setStats(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) throw new Error("Supabase indisponible.");
        const { data, error: err } = await sb
          .rpc("get_distributor_stats", {
            p_user_id: userId,
            p_period_start: periodStart,
          })
          .maybeSingle();
        if (err) throw err;
        if (!cancelled) setStats((data as DistributorStatsRpc) ?? null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, periodStart]);

  return { stats, loading, error };
}

export function useTeamRanking(
  rootUserId: string | null,
  period: Period,
  limit = 3,
) {
  const [ranking, setRanking] = useState<TeamRankingEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const periodStart = useMemo(() => getPeriodStart(period).toISOString(), [period]);

  useEffect(() => {
    if (!rootUserId) {
      setRanking([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) throw new Error("Supabase indisponible.");
        const { data, error: err } = await sb.rpc("get_team_ranking", {
          p_root_user_id: rootUserId,
          p_period_start: periodStart,
          p_limit: limit,
        });
        if (err) throw err;
        if (!cancelled) setRanking((data ?? []) as TeamRankingEntry[]);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rootUserId, periodStart, limit]);

  return { ranking, loading, error };
}
