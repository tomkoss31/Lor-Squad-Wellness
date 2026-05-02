// =============================================================================
// useMyFormationProgress — progressions du user courant (Phase B)
//
// Lit toutes les progressions du distri courant. Self-scoped via RLS.
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { useAppContext } from "../../../context/AppContext";
import { fetchMyProgress } from "../service";
import type { FormationProgressRow } from "../types-db";

export interface UseMyFormationProgressResult {
  rows: FormationProgressRow[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  /** Helper : retrouve la progression d un module precis. */
  getByModuleId: (moduleId: string) => FormationProgressRow | undefined;
}

export function useMyFormationProgress(): UseMyFormationProgressResult {
  const { currentUser } = useAppContext();
  const [rows, setRows] = useState<FormationProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentUser) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyProgress();
      setRows(data);
    } catch (err) {
      console.warn("[useMyFormationProgress] load failed:", err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    void load();
  }, [load]);

  const getByModuleId = useCallback(
    (moduleId: string) => rows.find((r) => r.module_id === moduleId),
    [rows],
  );

  return { rows, loading, error, reload: load, getByModuleId };
}
