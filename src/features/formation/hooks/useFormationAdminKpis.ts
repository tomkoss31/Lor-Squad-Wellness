// =============================================================================
// useFormationAdminKpis — KPIs admin Formation (Phase D, 2026-11-01)
//
// Lit la RPC get_formation_admin_kpis (admin only). Refresh 60s.
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { useAppContext } from "../../../context/AppContext";
import { getSupabaseClient } from "../../../services/supabaseClient";

const REFRESH_INTERVAL_MS = 60_000;

export interface FormationSponsorDropoff {
  sponsor_id: string;
  sponsor_name: string;
  stuck_count: number;
  oldest_pending: string;
}

export interface FormationAdminKpis {
  active_distri_count: number;
  pending_sponsor_count: number;
  admin_relay_count: number;
  validated_total: number;
  validated_today: number;
  sponsor_dropoffs: FormationSponsorDropoff[];
  computed_at: string;
}

export interface UseFormationAdminKpisResult {
  data: FormationAdminKpis | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  isAdmin: boolean;
}

export function useFormationAdminKpis(): UseFormationAdminKpisResult {
  const { currentUser } = useAppContext();
  const isAdmin = currentUser?.role === "admin";
  const [data, setData] = useState<FormationAdminKpis | null>(null);
  const [loading, setLoading] = useState(isAdmin);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAdmin) {
      setData(null);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Supabase indisponible");
      const { data: result, error: rpcErr } = await sb.rpc("get_formation_admin_kpis");
      if (rpcErr) throw rpcErr;
      setData(result as FormationAdminKpis);
    } catch (err) {
      console.warn("[useFormationAdminKpis] load failed:", err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void load();
    if (!isAdmin) return;
    const id = window.setInterval(() => void load(), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [load, isAdmin]);

  return { data, loading, error, reload: load, isAdmin };
}
