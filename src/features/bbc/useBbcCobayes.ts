// =============================================================================
// useBbcCobayes — compteur cobayes du jour, persisté (chantier BBC Lot 2).
// Lit outreach_messages (RLS : own rows), expose le count du jour + logCobaye
// qui INSÈRE une ligne réelle. Silent-fail si migration absente → count 0.
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";

const DEFAULT_TARGET = 20;

function startOfTodayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export interface UseBbcCobayesResult {
  count: number;
  target: number;
  loading: boolean;
  logCobaye: (templateKey: string, contactLabel: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useBbcCobayes(userId: string | null | undefined, target = DEFAULT_TARGET): UseBbcCobayesResult {
  const [count, setCount] = useState(0);
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
      const { count: c } = await sb
        .from("outreach_messages")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("sent_at", startOfTodayISO());
      if (typeof c === "number") setCount(c);
    } catch {
      // Silent-fail — reste à 0.
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const logCobaye = useCallback(
    async (templateKey: string, contactLabel: string) => {
      // Optimiste : le compteur monte tout de suite.
      setCount((n) => n + 1);
      if (!userId) return;
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const { error } = await sb.from("outreach_messages").insert({
          user_id: userId,
          template_key: templateKey || null,
          contact_label: contactLabel || null,
          channel: "whatsapp",
        });
        if (error) {
          // Rollback optimiste si l'insert échoue.
          setCount((n) => Math.max(0, n - 1));
        } else {
          void refetch();
        }
      } catch {
        setCount((n) => Math.max(0, n - 1));
      }
    },
    [userId, refetch],
  );

  return { count, target, loading, logCobaye, refetch };
}
