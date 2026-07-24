// =============================================================================
// useBbcHearts — le système de cœurs, données réelles (chantier BBC).
// S'appuie sur client_referrals (RLS : coach_id = auth.uid()). Chaîne :
//   le membre saisit une reco (client_referrals.status='new')
//   → le coach VALIDE : 'started' (= 1 cœur, la personne a démarré) ou 'lost'
//   → paliers 2 / 3 / 5 calculés depuis le nombre de cœurs par membre.
// Aucune migration : on réutilise la table + son statut texte.
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";

const STARTED = "started";
const LOST = "lost";
export const HEART_PALIERS = [2, 3, 5];

export interface HeartReferral {
  id: string;
  fromClientId: string;
  fromClientName: string;
  referredName: string;
  referredContact: string;
  status: string;
}
export interface HeartMember {
  key: string;
  name: string;
  hearts: number;
  pending: number;
}
export interface UseBbcHeartsResult {
  members: HeartMember[];
  pending: HeartReferral[];
  loading: boolean;
  validate: (id: string, started: boolean) => Promise<void>;
  refetch: () => Promise<void>;
}

export function nextPalier(hearts: number): number | null {
  return HEART_PALIERS.find((p) => p > hearts) ?? null;
}

export function useBbcHearts(userId?: string | null): UseBbcHeartsResult {
  const [rows, setRows] = useState<HeartReferral[]>([]);
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
      const { data } = await sb
        .from("client_referrals")
        .select("id, from_client_id, from_client_name, referred_name, referred_contact, status")
        .order("created_at", { ascending: false });
      if (Array.isArray(data)) {
        setRows(
          data.map((r: Record<string, unknown>) => ({
            id: String(r.id),
            fromClientId: String(r.from_client_id ?? ""),
            fromClientName: String(r.from_client_name ?? "—"),
            referredName: String(r.referred_name ?? ""),
            referredContact: String(r.referred_contact ?? ""),
            status: String(r.status ?? "new"),
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

  const validate = useCallback(
    async (id: string, started: boolean) => {
      const nextStatus = started ? STARTED : LOST;
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: nextStatus } : r)));
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const { error } = await sb.from("client_referrals").update({ status: nextStatus }).eq("id", id);
        if (error) void refetch();
      } catch {
        void refetch();
      }
    },
    [refetch],
  );

  const { members, pending } = useMemo(() => {
    const byMember = new Map<string, HeartMember>();
    for (const r of rows) {
      const key = r.fromClientId || r.fromClientName;
      const m = byMember.get(key) ?? { key, name: r.fromClientName, hearts: 0, pending: 0 };
      if (r.status === STARTED) m.hearts += 1;
      else if (r.status !== LOST) m.pending += 1;
      byMember.set(key, m);
    }
    return {
      members: Array.from(byMember.values()).sort((a, b) => b.hearts - a.hearts),
      pending: rows.filter((r) => r.status !== STARTED && r.status !== LOST),
    };
  }, [rows]);

  return { members, pending, loading, validate, refetch };
}
