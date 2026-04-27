// Chantier Academy polish K (2026-04-28).
// Hook qui fetch les 4 compteurs anonymes de progression Academy via la
// RPC get_academy_team_stats. Cache simple en memoire (pas de re-fetch
// au mount si deja resolu < 5 min).

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../../services/supabaseClient";

export interface AcademyTeamStats {
  loaded: boolean;
  totalStarted: number;
  totalCompleted: number;
  completedThisMonth: number;
  startedThisWeek: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
let cached: { data: AcademyTeamStats; at: number } | null = null;

export function useAcademyTeamStats(): AcademyTeamStats {
  const [stats, setStats] = useState<AcademyTeamStats>(() => {
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return cached.data;
    }
    return {
      loaded: false,
      totalStarted: 0,
      totalCompleted: 0,
      completedThisMonth: 0,
      startedThisWeek: 0,
    };
  });

  useEffect(() => {
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      setStats(cached.data);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const { data, error } = await sb.rpc("get_academy_team_stats");
        if (cancelled) return;
        if (error) {
          console.warn("[useAcademyTeamStats] RPC failed:", error.message);
          return;
        }
        const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
        if (!row) return;
        const next: AcademyTeamStats = {
          loaded: true,
          totalStarted: (row as { total_started?: number }).total_started ?? 0,
          totalCompleted: (row as { total_completed?: number }).total_completed ?? 0,
          completedThisMonth: (row as { completed_this_month?: number }).completed_this_month ?? 0,
          startedThisWeek: (row as { started_this_week?: number }).started_this_week ?? 0,
        };
        cached = { data: next, at: Date.now() };
        setStats(next);
      } catch (err) {
        console.warn("[useAcademyTeamStats] exception:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return stats;
}
