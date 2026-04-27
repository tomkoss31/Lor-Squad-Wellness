// Chantier Academy direction 7 (2026-04-28).
// Hook qui fetch le leaderboard Academy via RPC get_academy_leaderboard.
// Reserve aux admins (la RPC throw access denied si non-admin).

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../../services/supabaseClient";

export interface LeaderboardRow {
  userId: string;
  userName: string;
  userRole: string;
  lastStep: number;
  totalSections: number;
  percentComplete: number;
  startedAt: Date | null;
  completedAt: Date | null;
  skippedAt: Date | null;
  lastActiveAt: Date | null;
}

export interface AcademyLeaderboardData {
  loading: boolean;
  error: string | null;
  rows: LeaderboardRow[];
}

interface RpcRow {
  user_id: string;
  user_name: string;
  user_role: string;
  last_step: number;
  total_sections: number;
  percent_complete: number;
  started_at: string | null;
  completed_at: string | null;
  skipped_at: string | null;
  last_active_at: string | null;
}

export function useAcademyLeaderboard(): AcademyLeaderboardData {
  const [data, setData] = useState<AcademyLeaderboardData>({
    loading: true,
    error: null,
    rows: [],
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) {
          if (!cancelled) {
            setData({ loading: false, error: "supabase_unavailable", rows: [] });
          }
          return;
        }
        const { data: rows, error } = await sb.rpc("get_academy_leaderboard");
        if (cancelled) return;
        if (error) {
          console.warn("[useAcademyLeaderboard] RPC failed:", error.message);
          setData({ loading: false, error: error.message, rows: [] });
          return;
        }
        const list = Array.isArray(rows) ? (rows as RpcRow[]) : [];
        const mapped: LeaderboardRow[] = list.map((r) => ({
          userId: r.user_id,
          userName: r.user_name,
          userRole: r.user_role,
          lastStep: r.last_step ?? 0,
          totalSections: r.total_sections ?? 8,
          percentComplete: r.percent_complete ?? 0,
          startedAt: r.started_at ? new Date(r.started_at) : null,
          completedAt: r.completed_at ? new Date(r.completed_at) : null,
          skippedAt: r.skipped_at ? new Date(r.skipped_at) : null,
          lastActiveAt: r.last_active_at ? new Date(r.last_active_at) : null,
        }));
        setData({ loading: false, error: null, rows: mapped });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "unknown";
        setData({ loading: false, error: message, rows: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
