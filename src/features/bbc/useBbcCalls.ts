// =============================================================================
// useBbcCalls — inscriptions aux rituels + suivi (chantier BBC).
// Les occurrences viennent de la config du club (getNextCalls) ; les
// inscriptions vivent dans club_call_registrations. Après l'appel : pointer la
// présence, puis la « patate chaude » (suivi dans les 10 min).
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import { getNextCalls, type NextCall } from "./data/bbcCalls";
import type { ClubSettings } from "../../types/domain";

export interface CallRegistration {
  id: string;
  clientId: string;
  clientName: string;
  callKey: string;
  scheduledAt: string;
  attended: boolean | null;
  followedUpAt: string | null;
}

export interface UseBbcCallsResult {
  nextCalls: NextCall[];
  registrations: CallRegistration[];
  /** Inscrits d'une occurrence précise. */
  forOccurrence: (callKey: string, at: Date) => CallRegistration[];
  /** Appels passés dont la présence ou le suivi reste à traiter. */
  toProcess: CallRegistration[];
  loading: boolean;
  register: (clientId: string, callKey: string, at: Date) => Promise<boolean>;
  setAttendance: (id: string, attended: boolean) => Promise<void>;
  markFollowUp: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useBbcCalls(userId?: string | null, settings?: ClubSettings | null): UseBbcCallsResult {
  const [rows, setRows] = useState<CallRegistration[]>([]);
  const [loading, setLoading] = useState(true);

  const nextCalls = useMemo(() => getNextCalls(settings), [settings]);

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
      // Fenêtre : 30 jours en arrière (suivis en retard) → 30 jours en avant.
      const from = new Date();
      from.setDate(from.getDate() - 30);
      const [regRes, clientsRes] = await Promise.all([
        sb
          .from("club_call_registrations")
          .select("id, client_id, call_key, scheduled_at, attended, followed_up_at")
          .eq("coach_user_id", userId)
          .gte("scheduled_at", from.toISOString())
          .order("scheduled_at", { ascending: true }),
        sb.from("clients").select("id, first_name, last_name").eq("distributor_id", userId).eq("ebe_bbc", true),
      ]);

      const nameMap: Record<string, string> = {};
      if (Array.isArray(clientsRes.data)) {
        for (const c of clientsRes.data as Array<Record<string, unknown>>) {
          nameMap[String(c.id)] = `${String(c.first_name ?? "").trim()} ${String(c.last_name ?? "").trim()}`.trim() || "—";
        }
      }
      if (Array.isArray(regRes.data)) {
        setRows(
          (regRes.data as Array<Record<string, unknown>>).map((r) => ({
            id: String(r.id),
            clientId: String(r.client_id),
            clientName: nameMap[String(r.client_id)] ?? "—",
            callKey: String(r.call_key),
            scheduledAt: String(r.scheduled_at),
            attended: (r.attended as boolean | null) ?? null,
            followedUpAt: (r.followed_up_at as string | null) ?? null,
          })),
        );
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

  const register = useCallback(
    async (clientId: string, callKey: string, at: Date): Promise<boolean> => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return false;
        const { error } = await sb.rpc("bbc_register_call", {
          p_client_id: clientId,
          p_call_key: callKey,
          p_scheduled_at: at.toISOString(),
        });
        if (error) return false;
        await refetch();
        return true;
      } catch {
        return false;
      }
    },
    [refetch],
  );

  const setAttendance = useCallback(
    async (id: string, attended: boolean) => {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, attended } : r)));
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const { error } = await sb.from("club_call_registrations").update({ attended }).eq("id", id);
        if (error) void refetch();
      } catch {
        void refetch();
      }
    },
    [refetch],
  );

  const markFollowUp = useCallback(
    async (id: string) => {
      const now = new Date().toISOString();
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, followedUpAt: now } : r)));
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const { error } = await sb.from("club_call_registrations").update({ followed_up_at: now }).eq("id", id);
        if (error) void refetch();
      } catch {
        void refetch();
      }
    },
    [refetch],
  );

  const forOccurrence = useCallback(
    (callKey: string, at: Date) => {
      const t = at.getTime();
      return rows.filter((r) => r.callKey === callKey && Math.abs(new Date(r.scheduledAt).getTime() - t) < 60_000);
    },
    [rows],
  );

  // Passés : présence non pointée, ou présent sans suivi fait.
  const toProcess = useMemo(() => {
    const now = Date.now();
    return rows.filter((r) => {
      const past = new Date(r.scheduledAt).getTime() < now;
      if (!past) return false;
      return r.attended === null || (r.attended === true && !r.followedUpAt);
    });
  }, [rows]);

  return { nextCalls, registrations: rows, forOccurrence, toProcess, loading, register, setAttendance, markFollowUp, refetch };
}
