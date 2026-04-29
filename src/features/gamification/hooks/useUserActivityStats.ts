// useUserActivityStats (2026-04-29) — fetch stats activite via RPC.
// Utilise sur la fiche distri admin pour afficher dernière connexion,
// streak, temps passe (today / 7j / 30j), graph 7j et XP daily.

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../../services/supabaseClient";

export interface DailyBreakdownEntry {
  date: string; // YYYY-MM-DD
  seconds: number;
}

export interface UserActivityStats {
  loaded: boolean;
  error: string | null;
  lastActiveAt: Date | null;
  todaySeconds: number;
  last7dSeconds: number;
  last30dSeconds: number;
  dailyBreakdown: DailyBreakdownEntry[];
  lifetimeLoginCount: number;
  streakCount: number;
  streakLastActive: string | null;
  totalSessions: number;
}

const EMPTY: UserActivityStats = {
  loaded: false,
  error: null,
  lastActiveAt: null,
  todaySeconds: 0,
  last7dSeconds: 0,
  last30dSeconds: 0,
  dailyBreakdown: [],
  lifetimeLoginCount: 0,
  streakCount: 0,
  streakLastActive: null,
  totalSessions: 0,
};

export function useUserActivityStats(userId: string | null | undefined): UserActivityStats {
  const [data, setData] = useState<UserActivityStats>(EMPTY);

  useEffect(() => {
    if (!userId) {
      setData(EMPTY);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb || cancelled) return;
        const { data: rows, error } = await sb.rpc("get_user_activity_stats", {
          p_user_id: userId,
        });
        if (cancelled) return;
        if (error) {
          setData({ ...EMPTY, loaded: true, error: error.message });
          return;
        }
        const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
        if (!row) {
          setData({ ...EMPTY, loaded: true });
          return;
        }
        const r = row as {
          last_active_at: string | null;
          today_seconds: number;
          last_7d_seconds: number;
          last_30d_seconds: number;
          daily_breakdown: DailyBreakdownEntry[] | null;
          lifetime_login_count: number;
          streak_count: number;
          streak_last_active: string | null;
          total_sessions: number;
        };
        setData({
          loaded: true,
          error: null,
          lastActiveAt: r.last_active_at ? new Date(r.last_active_at) : null,
          todaySeconds: r.today_seconds ?? 0,
          last7dSeconds: r.last_7d_seconds ?? 0,
          last30dSeconds: r.last_30d_seconds ?? 0,
          dailyBreakdown: Array.isArray(r.daily_breakdown) ? r.daily_breakdown : [],
          lifetimeLoginCount: r.lifetime_login_count ?? 0,
          streakCount: r.streak_count ?? 0,
          streakLastActive: r.streak_last_active ?? null,
          totalSessions: r.total_sessions ?? 0,
        });
      } catch (err) {
        if (cancelled) return;
        setData({
          ...EMPTY,
          loaded: true,
          error: err instanceof Error ? err.message : "unknown",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return data;
}
