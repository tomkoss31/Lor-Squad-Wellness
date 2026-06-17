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

export function useCrmBadge(userId: string | null, enabled: boolean = true, includeUnassigned: boolean = false) {
  const [count, setCount] = useState(0);
  const lastFetchRef = useRef(0);

  const fetchCounts = useCallback(async () => {
    if (!enabled || !userId) {
      setCount(0);
      return;
    }
    lastFetchRef.current = Date.now();
    try {
      const sb = await getSupabaseClient();
      if (!sb) return;
      const nowIso = new Date().toISOString();
      // Scopé sur MOI (2026-06-16) : on ne compte que MES leads (propriétaire =
      // moi) → fini le badge fantôme qui additionnait toute l'équipe pour un
      // admin. Owner : online_bilans=coach/assigned, prospect_leads=referrer/
      // assigned, referrals=coach_id. (Intentions hors badge — visibles au CRM.)
      // includeUnassigned (admin) : on compte aussi les leads non attribués
      // (coach/referrer null) — sinon un lien /bilan-online sans slug = lead perdu.
      const bilanOwner = `coach_user_id.eq.${userId},assigned_to_user_id.eq.${userId}${includeUnassigned ? ",coach_user_id.is.null" : ""}`;
      const prospectOwner = `referrer_user_id.eq.${userId},assigned_to_user_id.eq.${userId}${includeUnassigned ? ",referrer_user_id.is.null" : ""}`;
      const [bilansNew, bilansRelance, prospects, referrals] = await Promise.all([
        sb
          .from("online_bilans")
          .select("id", { count: "exact", head: true })
          .eq("lead_status", "new")
          .or(bilanOwner),
        sb
          .from("online_bilans")
          .select("id", { count: "exact", head: true })
          .lte("relance_due_at", nowIso)
          .is("relance_done_at", null)
          .or(bilanOwner),
        sb
          .from("prospect_leads")
          .select("id", { count: "exact", head: true })
          .eq("status", "new")
          .or(prospectOwner),
        sb
          .from("client_referrals")
          .select("id", { count: "exact", head: true })
          .eq("status", "new")
          .eq("coach_id", userId),
      ]);
      setCount(
        (bilansNew.count ?? 0) +
          (bilansRelance.count ?? 0) +
          (prospects.count ?? 0) +
          (referrals.count ?? 0),
      );
    } catch {
      // Badge best-effort : on garde la dernière valeur connue.
    }
  }, [enabled, userId, includeUnassigned]);

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
