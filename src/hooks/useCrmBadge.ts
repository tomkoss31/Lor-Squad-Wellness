// =============================================================================
// useCrmBadge — compteur léger de leads "à traiter" pour le badge sidebar 🎯
// CRM et l'action Leads de la routine du jour (wagon 2 chantiers 1+2,
// 2026-06-10).
//
// 4 requêtes COUNT head-only (zéro ligne transférée) sur les sources du
// pipeline : nouveaux + relances dues. Refetch au retour d'onglet
// (visibilitychange) avec un débounce de 60s pour ne pas spammer.
// RLS filtre par coach comme dans useCrmLeads.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "../services/supabaseClient";

export function useCrmBadge(enabled: boolean = true) {
  const [count, setCount] = useState(0);
  const lastFetchRef = useRef(0);

  const fetchCounts = useCallback(async () => {
    if (!enabled) return;
    lastFetchRef.current = Date.now();
    try {
      const sb = await getSupabaseClient();
      if (!sb) return;
      const nowIso = new Date().toISOString();
      const [bilansNew, bilansRelance, prospects, referrals, intentions] = await Promise.all([
        sb
          .from("online_bilans")
          .select("id", { count: "exact", head: true })
          .eq("lead_status", "new"),
        sb
          .from("online_bilans")
          .select("id", { count: "exact", head: true })
          .lte("relance_due_at", nowIso)
          .is("relance_done_at", null),
        sb
          .from("prospect_leads")
          .select("id", { count: "exact", head: true })
          .eq("status", "new"),
        sb
          .from("client_referrals")
          .select("id", { count: "exact", head: true })
          .eq("status", "new"),
        sb
          .from("client_referral_intentions")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
      ]);
      setCount(
        (bilansNew.count ?? 0) +
          (bilansRelance.count ?? 0) +
          (prospects.count ?? 0) +
          (referrals.count ?? 0) +
          (intentions.count ?? 0),
      );
    } catch {
      // Badge best-effort : on garde la dernière valeur connue.
    }
  }, [enabled]);

  useEffect(() => {
    void fetchCounts();
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - lastFetchRef.current > 60_000) {
        void fetchCounts();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchCounts]);

  return { count, refetch: fetchCounts };
}
