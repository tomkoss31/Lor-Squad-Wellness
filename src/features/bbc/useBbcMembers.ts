// =============================================================================
// useBbcMembers — les membres BBC du coach + leur récap (chantier BBC).
// Membre BBC = client ebe_bbc du coach. Agrège : infos fiche + visites (RPC)
// + cœurs (client_referrals). RLS-safe (clients/refs du coach, RPC own rows).
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";

export interface BbcMember {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  objective?: string;
  program?: string;
  lifecycleStatus?: string;
  started: boolean;
  startDate?: string | null;
  nextFollowUp?: string | null;
  visits: number;
  hearts: number;
  pendingHearts: number;
}

export interface UseBbcMembersResult {
  members: BbcMember[];
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useBbcMembers(userId?: string | null): UseBbcMembersResult {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [hearts, setHearts] = useState<Record<string, { done: number; pending: number }>>({});
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const sb = await getSupabaseClient();
      if (!sb) {
        setLoading(false);
        return;
      }
      const [clientsRes, countsRes, refsRes] = await Promise.all([
        sb
          .from("clients")
          .select("id, first_name, last_name, phone, email, objective, current_program, lifecycle_status, started, start_date, next_follow_up")
          .eq("distributor_id", userId)
          .eq("ebe_bbc", true)
          .order("first_name"),
        sb.rpc("bbc_visit_counts"),
        sb.from("client_referrals").select("from_client_id, status"),
      ]);
      if (Array.isArray(clientsRes.data)) setRows(clientsRes.data as Record<string, unknown>[]);
      if (Array.isArray(countsRes.data)) {
        const m: Record<string, number> = {};
        for (const r of countsRes.data as Array<Record<string, unknown>>) m[String(r.client_id)] = Number(r.cnt) || 0;
        setCounts(m);
      }
      if (Array.isArray(refsRes.data)) {
        const h: Record<string, { done: number; pending: number }> = {};
        for (const r of refsRes.data as Array<Record<string, unknown>>) {
          const k = String(r.from_client_id);
          const s = String(r.status);
          h[k] = h[k] ?? { done: 0, pending: 0 };
          if (s === "started") h[k].done += 1;
          else if (s !== "lost") h[k].pending += 1;
        }
        setHearts(h);
      }
    } catch {
      // silent-fail
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const members = useMemo(
    () =>
      rows.map((r) => {
        const id = String(r.id);
        const h = hearts[id] ?? { done: 0, pending: 0 };
        return {
          id,
          name: `${String(r.first_name ?? "").trim()} ${String(r.last_name ?? "").trim()}`.trim() || "—",
          phone: (r.phone as string) || undefined,
          email: (r.email as string) || undefined,
          objective: (r.objective as string) || undefined,
          program: (r.current_program as string) || undefined,
          lifecycleStatus: (r.lifecycle_status as string) || undefined,
          started: Boolean(r.started),
          startDate: (r.start_date as string | null) ?? null,
          nextFollowUp: (r.next_follow_up as string | null) ?? null,
          visits: counts[id] ?? 0,
          hearts: h.done,
          pendingHearts: h.pending,
        } as BbcMember;
      }),
    [rows, counts, hearts],
  );

  return { members, loading, refetch };
}
