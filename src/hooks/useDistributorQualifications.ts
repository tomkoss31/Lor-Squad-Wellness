// =============================================================================
// useDistributorQualifications — fenêtres glissantes Herbalife (2026-05-18)
// =============================================================================
//
// Appelle la RPC `get_distributor_qualifications(user_id, as_of_month)` pour
// récupérer les PV personnels d'un distri sur les 4 fenêtres glissantes
// pertinentes (2 / 3 / 6 / 12 mois) et les booleans qualif associés.
//
// Source unique pour la jauge Progression (ProgressionRangBlock) et tout
// composant qui veut afficher la qualif d'un distri à un mois donné.
//
// Refetch automatique sur l'event `lor-squad:pv-breakdown-updated` (déjà
// dispatché par les composants de saisie PV).
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { PV_BREAKDOWN_UPDATED_EVENT } from "./usePvBreakdowns";
import { fetchDistributorQualifications } from "../services/supabaseService";
import { currentMonthIso } from "../lib/herbalifeFormulas";

export interface DistributorQualifications {
  pv_2m: number;
  pv_3m: number;
  pv_6m: number;
  pv_12m: number;
  qualified_senior_consultant: boolean;
  qualified_success_builder: boolean;
  qualified_qp: boolean;
  qualified_supervisor: boolean;
  /** Rang max calculé d'après les PV perso sur les fenêtres. Parmi :
   *  distributor_25 / senior_consultant_35 / success_builder_42 / supervisor_50.
   *  Les paliers structurels (world_team_50+) ne sont jamais calculés ici. */
  rank_calculated: string;
}

interface UseDistributorQualificationsResult {
  qualifications: DistributorQualifications | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useDistributorQualifications(
  userId: string | null | undefined,
  asOfMonth?: string,
): UseDistributorQualificationsResult {
  const month = asOfMonth ?? currentMonthIso();
  const [qualifications, setQualifications] =
    useState<DistributorQualifications | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!userId) {
      setQualifications(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const row = await fetchDistributorQualifications(userId, month);
      setQualifications(row);
    } catch (err) {
      console.warn("[useDistributorQualifications] fetch failed", err);
      setQualifications(null);
    } finally {
      setLoading(false);
    }
  }, [userId, month]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      void fetch();
    };
    window.addEventListener(PV_BREAKDOWN_UPDATED_EVENT, handler);
    return () => window.removeEventListener(PV_BREAKDOWN_UPDATED_EVENT, handler);
  }, [fetch]);

  return { qualifications, loading, refetch: fetch };
}
