// =============================================================================
// useManualPvEntries — V3 distri hors-app (chantier 2026-11-07)
// =============================================================================
// Hook qui fetch les entrees manuelles d un viewer pour un mois donne.
// Ecoute l event global pv-breakdown-updated pour refetch automatique apres
// upsert/delete (cf. usePvBreakdowns pour le meme pattern).

import { useCallback, useEffect, useState } from "react";
import { loadManualPvEntries } from "../services/supabaseService";
import type { ManualPvEntry } from "../lib/herbalifeFormulas";
import { PV_BREAKDOWN_UPDATED_EVENT } from "./usePvBreakdowns";

interface UseManualPvEntriesResult {
  entries: ManualPvEntry[];
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useManualPvEntries(
  viewerUserId: string | null,
  month: string,
): UseManualPvEntriesResult {
  const [entries, setEntries] = useState<ManualPvEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!viewerUserId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await loadManualPvEntries(viewerUserId, month);
      setEntries(rows);
    } catch (err) {
      console.warn("[useManualPvEntries] fetch failed", err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [viewerUserId, month]);

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

  return { entries, loading, refetch: fetch };
}
