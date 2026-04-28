// =============================================================================
// useClientVip — Hooks pour le programme Client VIP Herbalife
// =============================================================================
//
// Expose 3 hooks :
//   - useClientVipStatus(clientId) : etat VIP courant (niveau, PV, descendants)
//   - useClientVipTree(clientId)   : arbre recursif des descendants
//   - useClientVipIntentions(clientId) : liste des prospects renseignes (coach view)
//
// Tous ces hooks utilisent la cle Supabase coach (auth.uid()) + RPC SECURITY
// DEFINER. Pour la version client app (token-only), voir useClientVipApp.
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";

// ─── Types ───────────────────────────────────────────────────────────────────

export type VipLevel = "none" | "bronze" | "silver" | "gold" | "ambassador";

export interface VipStatus {
  client_id: string;
  pv_lifetime: number;
  pv_3m: number;
  has_first_order: boolean;
  level: VipLevel;
  discount_pct: number;
  next_threshold: number;
  descendants_count: number;
  direct_referrals_count: number;
  is_ambassador_eligible: boolean;
  computed_at: string;
  /** Ajustement manuel saisi par le coach (myherbalife historique). 2026-04-29. */
  pv_manual_adjustment?: number;
}

export interface VipTreeNode {
  id: string;
  parent_id: string | null;
  depth: number;
  full_name: string;
  vip_status: VipLevel | null;
  pv_personal: number;
  pv_personal_3m: number;
}

export interface VipTree {
  root_client_id: string;
  nodes: VipTreeNode[];
  computed_at: string;
}

export interface VipIntention {
  id: string;
  prospect_first_name: string;
  relationship: string | null;
  notes: string | null;
  status: "pending" | "contacted" | "converted" | "lost";
  created_at: string;
  contacted_at: string | null;
  converted_at: string | null;
}

// ─── Niveaux meta (UI) ───────────────────────────────────────────────────────

export interface VipLevelMeta {
  level: VipLevel;
  label: string;
  badge: string;
  discount: number;
  threshold: number;
  hint: string;
  tone: "neutral" | "bronze" | "silver" | "gold" | "diamond";
  color: string;
}

export const VIP_LEVELS: VipLevelMeta[] = [
  {
    level: "none",
    label: "Pas encore inscrit",
    badge: "🌱",
    discount: 0,
    threshold: 0,
    hint: "Tu n'as pas encore activé ton compte client privilégié",
    tone: "neutral",
    color: "#6B7280",
  },
  {
    level: "bronze",
    label: "Bronze",
    badge: "🥉",
    discount: 15,
    threshold: 1, // 1ère commande
    hint: "Dès ta 1ère commande, -15 % à vie",
    tone: "bronze",
    color: "#B87333",
  },
  {
    level: "silver",
    label: "Silver",
    badge: "🥈",
    discount: 25,
    threshold: 100,
    hint: "100 pts cumulés (toi + tes filleuls)",
    tone: "silver",
    color: "#9CA3AF",
  },
  {
    level: "gold",
    label: "Gold",
    badge: "🥇",
    discount: 35,
    threshold: 500,
    hint: "500 pts cumulés — remise max client privilégié",
    tone: "gold",
    color: "#B8922A",
  },
  {
    level: "ambassador",
    label: "Ambassadeur",
    badge: "💎",
    discount: 42,
    threshold: 1000,
    hint: "1 000 pts en 3 mois — niveau premium absolu",
    tone: "diamond",
    color: "#7C3AED",
  },
];

export function getVipMeta(level: VipLevel): VipLevelMeta {
  return VIP_LEVELS.find((l) => l.level === level) ?? VIP_LEVELS[0];
}

// ─── Hook : status VIP ───────────────────────────────────────────────────────

export function useClientVipStatus(clientId: string | null | undefined) {
  const [data, setData] = useState<VipStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Supabase indisponible");
      const { data: result, error: rpcError } = await sb.rpc(
        "get_client_vip_status",
        { p_client_id: clientId },
      );
      if (rpcError) throw rpcError;
      if (result && (result as { error?: string }).error) {
        throw new Error((result as { error: string }).error);
      }
      setData(result as VipStatus);
    } catch (err) {
      console.warn("[useClientVipStatus] failed:", err);
      setError(err instanceof Error ? err.message : "unknown");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  return { data, loading, error, reload: fetchStatus };
}

// ─── Hook : arbre référral ───────────────────────────────────────────────────

export function useClientVipTree(clientId: string | null | undefined) {
  const [data, setData] = useState<VipTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTree = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Supabase indisponible");
      const { data: result, error: rpcError } = await sb.rpc(
        "get_client_referral_tree",
        { p_client_id: clientId },
      );
      if (rpcError) throw rpcError;
      if (result && (result as { error?: string }).error) {
        throw new Error((result as { error: string }).error);
      }
      setData(result as VipTree);
    } catch (err) {
      console.warn("[useClientVipTree] failed:", err);
      setError(err instanceof Error ? err.message : "unknown");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void fetchTree();
  }, [fetchTree]);

  return { data, loading, error, reload: fetchTree };
}

// ─── Hook : intentions / prospects ──────────────────────────────────────────

export function useClientVipIntentions(clientId: string | null | undefined) {
  const [data, setData] = useState<VipIntention[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIntentions = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Supabase indisponible");
      const { data: result, error: rpcError } = await sb.rpc(
        "list_client_referral_intentions",
        { p_client_id: clientId },
      );
      if (rpcError) throw rpcError;
      setData((result ?? []) as VipIntention[]);
    } catch (err) {
      console.warn("[useClientVipIntentions] failed:", err);
      setError(err instanceof Error ? err.message : "unknown");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void fetchIntentions();
  }, [fetchIntentions]);

  return { data, loading, error, reload: fetchIntentions };
}

// ─── Hook : status VIP par token (cote client app) ─────────────────────────

export function useClientVipStatusByToken(token: string | null | undefined) {
  const [data, setData] = useState<VipStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Supabase indisponible");
      const { data: result, error: rpcError } = await sb.rpc(
        "get_client_vip_status_by_token",
        { p_token: token },
      );
      if (rpcError) throw rpcError;
      if (result && (result as { error?: string }).error) {
        throw new Error((result as { error: string }).error);
      }
      setData(result as VipStatus);
    } catch (err) {
      console.warn("[useClientVipStatusByToken] failed:", err);
      setError(err instanceof Error ? err.message : "unknown");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  return { data, loading, error, reload: fetchStatus };
}

// ─── Helper : update intention status (cote coach) ─────────────────────────

export async function updateIntentionStatus(
  intentionId: string,
  newStatus: VipIntention["status"],
  convertedClientId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const sb = await getSupabaseClient();
    if (!sb) return { success: false, error: "no_supabase" };
    const { data, error } = await sb.rpc("update_referral_intention_status", {
      p_intention_id: intentionId,
      p_new_status: newStatus,
      p_converted_client_id: convertedClientId ?? null,
    });
    if (error) return { success: false, error: error.message };
    const payload = (data ?? {}) as { success?: boolean; error?: string };
    if (payload.error) return { success: false, error: payload.error };
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

// ─── Helper : record intention (cote client app) ────────────────────────────

export async function recordVipIntention(
  token: string,
  firstName: string,
  relationship?: string,
  notes?: string,
): Promise<{ success: boolean; intentionId?: string; error?: string }> {
  if (!token || !firstName.trim()) {
    return { success: false, error: "missing_input" };
  }
  try {
    const sb = await getSupabaseClient();
    if (!sb) return { success: false, error: "no_supabase" };
    const { data, error } = await sb.rpc("record_client_referral_intention", {
      p_token: token,
      p_first_name: firstName.trim(),
      p_relationship: relationship ?? null,
      p_notes: notes ?? null,
    });
    if (error) return { success: false, error: error.message };
    const payload = (data ?? {}) as {
      success?: boolean;
      intention_id?: string;
      error?: string;
    };
    if (payload.error) return { success: false, error: payload.error };
    return { success: true, intentionId: payload.intention_id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}
