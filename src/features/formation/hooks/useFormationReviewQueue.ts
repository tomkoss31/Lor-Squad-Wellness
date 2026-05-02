// =============================================================================
// useFormationReviewQueue — file pending_review_sponsor (Phase B)
//
// Liste des progressions en attente de validation pour le user courant
// (en tant que sponsor d une recrue de sa lignee descendante).
//
// Auto-refresh : 60s + reload manuel apres action.
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { useAppContext } from "../../../context/AppContext";
import { fetchPendingReviewQueue } from "../service";
import type { FormationPendingReviewRow } from "../types-db";

const REFRESH_INTERVAL_MS = 60_000; // 1 min

export interface UseFormationReviewQueueResult {
  queue: FormationPendingReviewRow[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  /** Nombre de modules en attente (pratique pour badge sidebar). */
  pendingCount: number;
}

export function useFormationReviewQueue(): UseFormationReviewQueueResult {
  const { currentUser } = useAppContext();
  const [queue, setQueue] = useState<FormationPendingReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentUser) {
      setQueue([]);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const data = await fetchPendingReviewQueue();
      setQueue(data);
    } catch (err) {
      console.warn("[useFormationReviewQueue] load failed:", err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    void load();
    if (!currentUser) return;
    const id = window.setInterval(() => void load(), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [load, currentUser]);

  return {
    queue,
    loading,
    error,
    reload: load,
    pendingCount: queue.length,
  };
}
