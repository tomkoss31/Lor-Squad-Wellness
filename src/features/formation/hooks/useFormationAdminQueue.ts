// =============================================================================
// useFormationAdminQueue — file admin_relay (Phase B, admin only)
//
// Liste des progressions escaladees en pending_review_admin (>48h sans
// action sponsor). Visible uniquement par les admins via RLS.
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { useAppContext } from "../../../context/AppContext";
import { fetchAdminRelayQueue } from "../service";
import type { FormationAdminRelayRow } from "../types-db";

const REFRESH_INTERVAL_MS = 60_000;

export interface UseFormationAdminQueueResult {
  queue: FormationAdminRelayRow[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  isAdmin: boolean;
  relayCount: number;
}

export function useFormationAdminQueue(): UseFormationAdminQueueResult {
  const { currentUser } = useAppContext();
  const isAdmin = currentUser?.role === "admin";
  const [queue, setQueue] = useState<FormationAdminRelayRow[]>([]);
  const [loading, setLoading] = useState(isAdmin);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAdmin) {
      setQueue([]);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const data = await fetchAdminRelayQueue();
      setQueue(data);
    } catch (err) {
      console.warn("[useFormationAdminQueue] load failed:", err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void load();
    if (!isAdmin) return;
    const id = window.setInterval(() => void load(), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [load, isAdmin]);

  return {
    queue,
    loading,
    error,
    reload: load,
    isAdmin,
    relayCount: queue.length,
  };
}
