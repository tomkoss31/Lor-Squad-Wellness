// =============================================================================
// useAdminAnalytics — fetch des metriques admin (Chantier D, 2026-04-29)
// =============================================================================
//
// Hook qui appelle la RPC public.get_admin_analytics() et expose les
// donnees pour la page /analytics. Refresh manuel via reload() + auto
// refresh toutes les 5 min.
//
// Le payload est typed cote front pour le confort d edition. La RPC
// renvoie un jsonb monolithe pour minimiser les round-trips.
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../services/supabaseClient";

export interface AnalyticsKpi {
  bilans_mois: number;
  bilans_prev_mois: number;
  bilans_delta_pct: number | null;
  clients_actifs: number;
  clients_actifs_prev: number;
  pv_mois: number;
  conversion_pct: number;
}

export interface AnalyticsFunnel {
  bilans: number;
  inscrits: number;
  actifs: number;
  actifs_30d: number;
}

export interface AnalyticsProduct {
  name: string;
  quantity: number;
  total_pv: number;
}

export interface AnalyticsDistri {
  name: string;
  bilans: number;
}

export interface AnalyticsTendance {
  month_start: string;
  bilans: number;
}

export interface AnalyticsAlertes {
  distri_sans_bilan_14j: number;
  clients_pause_60j: number;
}

export interface AdminAnalyticsPayload {
  kpi: AnalyticsKpi;
  funnel: AnalyticsFunnel;
  top_produits: AnalyticsProduct[];
  top_distri: AnalyticsDistri[];
  tendance_12_mois: AnalyticsTendance[];
  alertes: AnalyticsAlertes;
  computed_at: string;
}

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 min

export function useAdminAnalytics() {
  const [data, setData] = useState<AdminAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setError(null);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Supabase indisponible");
      const { data: result, error: rpcError } = await sb.rpc("get_admin_analytics");
      if (rpcError) throw rpcError;
      setData(result as AdminAnalyticsPayload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      console.error("[useAdminAnalytics] fetch failed:", err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    const id = window.setInterval(fetchAnalytics, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [fetchAnalytics]);

  return {
    data,
    loading,
    error,
    reload: fetchAnalytics,
  };
}
