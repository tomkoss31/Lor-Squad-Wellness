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

// ─── Hook couple : fusionne 2 arbres en un seul ─────────────────────────
// Chantier Team Couple Display (2026-04-26).
// Thomas et Mélanie partagent leur descendance → on fetch les 2 trees
// (un par membre) via get_team_tree puis on merge/dedup côté client.
// Returns des rows cohérentes avec TeamTreeRow + un flag `couple` dans
// la row racine pour l'affichage de la card fusionnée.
export function useCoupleTeamTree(memberIds: string[]) {
  const [rows, setRows] = useState<TeamTreeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memberKey = memberIds.slice().sort().join("|");

  const load = useCallback(async () => {
    if (memberIds.length === 0) {
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Supabase indisponible.");
      const results = await Promise.all(
        memberIds.map((id) =>
          sb.rpc("get_team_tree", { root_user_id: id }).then((r) => ({ id, data: r.data, err: r.error }))
        )
      );
      // Dedup par user_id (si un distri est "double-parrainé" côté DB)
      const byId = new Map<string, TeamTreeRow>();
      for (const res of results) {
        if (res.err) throw res.err;
        for (const row of (res.data ?? []) as TeamTreeRow[]) {
          // Priorité au premier rencontré (plus stable quand on re-render)
          if (!byId.has(row.user_id)) byId.set(row.user_id, row);
        }
      }
      setRows(Array.from(byId.values()));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberKey]);

  useEffect(() => {
    void load();
  }, [load]);

  return { rows, loading, error, reload: load };
}

// ─── Stats + ranking agrégés pour le couple ─────────────────────────────
// On fetch stats individuelles puis on somme. Les retention % sont
// recalculés depuis les nominateurs/dénominateurs (pas une moyenne
// pondérée basique pour éviter de fausser les ratios).
export function useCoupleDistributorStats(memberIds: string[], period: Period) {
  const [stats, setStats] = useState<DistributorStatsRpc | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const periodStart = useMemo(() => getPeriodStart(period).toISOString(), [period]);
  const memberKey = memberIds.slice().sort().join("|");

  useEffect(() => {
    if (memberIds.length === 0) {
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
        const results = await Promise.all(
          memberIds.map((id) =>
            sb
              .rpc("get_distributor_stats", { p_user_id: id, p_period_start: periodStart })
              .maybeSingle()
              .then((r) => ({ data: r.data as DistributorStatsRpc | null, err: r.error }))
          )
        );
        let agg: DistributorStatsRpc = {
          active_clients_count: 0,
          active_clients_delta: 0,
          prospects_count: 0,
          prospects_hot_count: 0,
          subteam_count: 0,
          retention_prospects_pct: null,
          retention_prospects_converted: 0,
          retention_prospects_total: 0,
          retention_clients_pct: null,
          retention_clients_still_active: 0,
          retention_clients_total: 0,
        };
        for (const res of results) {
          if (res.err) throw res.err;
          const s = res.data;
          if (!s) continue;
          agg = {
            ...agg,
            active_clients_count: agg.active_clients_count + s.active_clients_count,
            active_clients_delta: agg.active_clients_delta + s.active_clients_delta,
            prospects_count: agg.prospects_count + s.prospects_count,
            prospects_hot_count: agg.prospects_hot_count + s.prospects_hot_count,
            subteam_count: agg.subteam_count + s.subteam_count,
            retention_prospects_converted:
              agg.retention_prospects_converted + s.retention_prospects_converted,
            retention_prospects_total:
              agg.retention_prospects_total + s.retention_prospects_total,
            retention_clients_still_active:
              agg.retention_clients_still_active + s.retention_clients_still_active,
            retention_clients_total: agg.retention_clients_total + s.retention_clients_total,
          };
        }
        agg.retention_prospects_pct =
          agg.retention_prospects_total > 0
            ? Math.round((agg.retention_prospects_converted / agg.retention_prospects_total) * 100)
            : null;
        agg.retention_clients_pct =
          agg.retention_clients_total > 0
            ? Math.round((agg.retention_clients_still_active / agg.retention_clients_total) * 100)
            : null;
        if (!cancelled) setStats(agg);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberKey, periodStart]);

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
