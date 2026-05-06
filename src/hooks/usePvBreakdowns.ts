// =============================================================================
// usePvBreakdowns — V2 fiche RO Herbalife (2026-11-07)
// =============================================================================
//
// Hook leger qui fetch tous les breakdowns PV pour un mois donne, expose un
// helper getForUser() et une fonction refetch(). Volume max ~50 lignes/mois,
// pas besoin de cache complexe.
//
// Utilise par :
//   - TeamMemberDrilldownModal (saisie admin)
//   - RentabilityDetailModal (calcul override par downline)
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { loadPvBreakdownsForMonth } from "../services/supabaseService";
import type { PvMonthlyBreakdown } from "../lib/herbalifeFormulas";

/** Event global dispatched apres chaque save pv_monthly_breakdown.
 *  Toutes les instances usePvBreakdowns ecoutent et refetch. */
export const PV_BREAKDOWN_UPDATED_EVENT = "lor-squad:pv-breakdown-updated";

interface UsePvBreakdownsResult {
  breakdowns: PvMonthlyBreakdown[];
  loading: boolean;
  getForUser: (userId: string) => PvMonthlyBreakdown | null;
  refetch: () => Promise<void>;
}

export function usePvBreakdowns(month: string): UsePvBreakdownsResult {
  const [breakdowns, setBreakdowns] = useState<PvMonthlyBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await loadPvBreakdownsForMonth(month);
      setBreakdowns(rows);
    } catch (err) {
      console.warn("[usePvBreakdowns] fetch failed", err);
      setBreakdowns([]);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  // Refetch automatique quand un autre composant sauve un breakdown.
  // Sans ca, le widget Co-pilote derriere une modale d edition reste a
  // l ancienne valeur jusqu au reload.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      void fetch();
    };
    window.addEventListener(PV_BREAKDOWN_UPDATED_EVENT, handler);
    return () => window.removeEventListener(PV_BREAKDOWN_UPDATED_EVENT, handler);
  }, [fetch]);

  const getForUser = useCallback(
    (userId: string) => breakdowns.find((b) => b.userId === userId) ?? null,
    [breakdowns],
  );

  return { breakdowns, loading, getForUser, refetch: fetch };
}
