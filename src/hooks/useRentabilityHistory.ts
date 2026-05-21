// =============================================================================
// useRentabilityHistory — wrap RPC get_user_rentability_history.
// Retourne les N derniers mois (margin_eur).
// Chantier Rentabilité Premium V2 (2026-05-20).
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../services/supabaseClient";

export interface MonthHistoryPoint {
  month: string;       // YYYY-MM-DD (premier jour du mois)
  margin_eur: number;
}

interface UseRentabilityHistoryResult {
  data: MonthHistoryPoint[];
  loading: boolean;
  error: string | null;
}

export function useRentabilityHistory(
  userIds: string[] | null,
  months: number = 12,
): UseRentabilityHistoryResult {
  const [data, setData] = useState<MonthHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const idsKey = useMemo(
    () => (userIds ?? []).slice().sort().join(","),
    [userIds],
  );

  useEffect(() => {
    let cancelled = false;
    async function fetchHistory() {
      if (!userIds || userIds.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      const sb = await getSupabaseClient();
      if (!sb) {
        setError("Supabase indisponible");
        setLoading(false);
        return;
      }
      const { data: rows, error: e } = await sb.rpc("get_user_rentability_history", {
        p_user_ids: userIds,
        p_months: months,
      });
      if (cancelled) return;
      if (e) {
        console.error("[useRentabilityHistory] RPC error:", e);
        setError(e.message);
        setData([]);
      } else {
        const points = ((rows as Array<{ month_start: string; margin_eur: number }>) ?? []).map((r) => ({
          month: r.month_start,
          margin_eur: Number(r.margin_eur) || 0,
        }));
        setData(points);
      }
      setLoading(false);
    }
    void fetchHistory();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, months]);

  return { data, loading, error };
}
