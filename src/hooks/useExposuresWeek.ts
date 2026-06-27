// =============================================================================
// useExposuresWeek — readout de la métrique-reine « expositions cette semaine ».
// Chantier Moteur d'équipe PR3 (2026-06-27).
//
// Appelle get_team_exposures_weekly(self, lundi) → renvoie ma ligne (perso)
// + ma downline, avec breakdown par type. Expose aussi logExposure (hom/video).
// Silent-fail si la migration PR2 n'est pas encore appliquée.
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { getSupabaseClient } from "../services/supabaseClient";

/** Cible hebdo d'expositions par défaut = 1/jour (aligné Success Formula Club).
 *  Tunable plus tard (plan FLEX / réglage perso). */
export const WEEKLY_EXPOSURE_TARGET = 7;

export interface ExposureRow {
  user_id: string;
  name: string;
  exposures: number;
  exp_bilan: number;
  exp_rdv: number;
  exp_hom: number;
  exp_video: number;
  recruits_activated: number;
}

export type ManualExposureType = "hom" | "video_outil";

interface UseExposuresWeekResult {
  mine: ExposureRow | null;
  downline: ExposureRow[];
  target: number;
  loading: boolean;
  logExposure: (type: ManualExposureType, prospectLabel?: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

/** Date du jour au format YYYY-MM-DD (le serveur fait le date_trunc('week')). */
function todayISO(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function useExposuresWeek(): UseExposuresWeekResult {
  const { currentUser } = useAppContext();
  const [rows, setRows] = useState<ExposureRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) {
        setLoading(false);
        return;
      }
      const { data, error } = await sb.rpc("get_team_exposures_weekly", {
        p_root: currentUser.id,
        p_week_start: todayISO(),
      });
      if (!error && Array.isArray(data)) {
        setRows(data as ExposureRow[]);
      }
    } catch {
      // Silent fail (migration PR2 peut ne pas être appliquée)
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const logExposure = useCallback(
    async (type: ManualExposureType, prospectLabel?: string): Promise<boolean> => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return false;
        const { error } = await sb.rpc("log_exposure", {
          p_type: type,
          p_prospect_label: prospectLabel?.trim() ? prospectLabel.trim() : null,
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

  const mine = useMemo(
    () => rows.find((r) => r.user_id === currentUser?.id) ?? null,
    [rows, currentUser?.id],
  );
  const downline = useMemo(
    () => rows.filter((r) => r.user_id !== currentUser?.id),
    [rows, currentUser?.id],
  );

  return {
    mine,
    downline,
    target: WEEKLY_EXPOSURE_TARGET,
    loading,
    logExposure,
    refetch,
  };
}
