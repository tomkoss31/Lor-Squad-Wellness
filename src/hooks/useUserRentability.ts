// =============================================================================
// useUserRentability — Phase A Rentabilité (2026-05-05)
//
// Wrap la RPC get_user_rentability(user_id, month) qui retourne la marge
// brute en € pour un distri sur un mois donné, plus :
//   - rang + libellé + margin_pct
//   - revenue brut
//   - nb produits + top 5 programmes
//   - mois précédent (delta)
//   - projection fin de mois (au prorata)
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../services/supabaseClient";

export interface RentabilityProgram {
  product_name: string;
  qty: number;
  revenue: number;
}

export interface RentabilityData {
  user_id: string;
  user_name: string;
  rank: string;
  rank_label: string;
  margin_pct: number;
  revenue_brut: number;
  margin_eur: number;
  products_count: number;
  top_programs: RentabilityProgram[];
  prev_month_eur: number;
  projection_eur: number;
  month_start: string;
  month_end: string;
  days_elapsed: number;
  days_in_month: number;
}

interface UseUserRentabilityResult {
  data: RentabilityData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/** Seuils universels rouge / orange / vert (V1 — Thomas validé 2026-05-05). */
export const RENTABILITY_THRESHOLDS = {
  red: 200, // < 200€ = rouge
  green: 500, // > 500€ = vert
  // Entre 200 et 500€ = orange
} as const;

export type RentabilityZone = "red" | "orange" | "green";

export function rentabilityZone(eur: number): RentabilityZone {
  if (eur < RENTABILITY_THRESHOLDS.red) return "red";
  if (eur >= RENTABILITY_THRESHOLDS.green) return "green";
  return "orange";
}

export function useUserRentability(
  userId: string | null,
  monthIso?: string,
): UseUserRentabilityResult {
  const [data, setData] = useState<RentabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!userId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const sb = await getSupabaseClient();
    if (!sb) {
      setError("Connexion Supabase indisponible");
      setLoading(false);
      return;
    }
    const { data: rows, error: e } = await sb.rpc("get_user_rentability", {
      p_user_id: userId,
      p_month: monthIso ?? null,
    });
    if (e) {
      setError(e.message);
      setData(null);
      setLoading(false);
      return;
    }
    const row = Array.isArray(rows) && rows.length > 0 ? (rows[0] as RentabilityData) : null;
    setData(row);
    setLoading(false);
  }, [userId, monthIso]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
