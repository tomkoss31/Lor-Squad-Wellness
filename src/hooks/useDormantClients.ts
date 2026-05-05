// =============================================================================
// useDormantClients — Phase B (2026-05-05)
//
// Wrap la RPC get_dormant_clients(distributor_id, threshold_days). Retourne
// les clients sans commande depuis > threshold (default 60j) avec PV
// potentiel et niveau d'urgence.
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../services/supabaseClient";

export type DormantUrgency = "never" | "high" | "medium" | "recent";

export interface DormantClient {
  client_id: string;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  lifecycle_status: "active" | "paused";
  last_order_date: string | null;
  days_since_last_order: number;
  urgency: DormantUrgency;
  pv_potential: number;
  last_program_name: string | null;
}

interface UseDormantClientsResult {
  clients: DormantClient[];
  totalPv: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const URGENCY_META: Record<DormantUrgency, { label: string; color: string; emoji: string; subText: string }> = {
  never: {
    label: "Jamais commandé",
    color: "var(--ls-coral)",
    emoji: "⚪",
    subText: "Encore aucune cure démarrée",
  },
  high: {
    label: "Très dormant",
    color: "var(--ls-coral)",
    emoji: "🔴",
    subText: "150+ jours sans commande",
  },
  medium: {
    label: "Dormant",
    color: "var(--ls-gold)",
    emoji: "🟡",
    subText: "90 à 149 jours",
  },
  recent: {
    label: "Récemment dormant",
    color: "var(--ls-teal)",
    emoji: "🟢",
    subText: "60 à 89 jours",
  },
};

export function useDormantClients(
  distributorId: string | null,
  thresholdDays = 60,
): UseDormantClientsResult {
  const [clients, setClients] = useState<DormantClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!distributorId) {
      setClients([]);
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
    const { data, error: e } = await sb.rpc("get_dormant_clients", {
      p_distributor_id: distributorId,
      p_threshold_days: thresholdDays,
    });
    if (e) {
      setError(e.message);
      setClients([]);
      setLoading(false);
      return;
    }
    setClients((data ?? []) as DormantClient[]);
    setLoading(false);
  }, [distributorId, thresholdDays]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const totalPv = clients.reduce((sum, c) => sum + (c.pv_potential ?? 0), 0);

  return { clients, totalPv, loading, error, refetch: fetch };
}
