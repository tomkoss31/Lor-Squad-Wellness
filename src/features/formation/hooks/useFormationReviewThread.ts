// =============================================================================
// useFormationReviewThread — discussion d une progression (Phase B)
//
// Liste les messages d un thread sponsor↔distri↔admin pour une progression
// donnee. Auto-refresh 30s + reload apres ajout de message.
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { fetchReviewThread } from "../service";
import type { FormationThreadRow } from "../types-db";

const REFRESH_INTERVAL_MS = 30_000;

export interface UseFormationReviewThreadResult {
  messages: FormationThreadRow[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useFormationReviewThread(
  progressId: string | null | undefined,
): UseFormationReviewThreadResult {
  const [messages, setMessages] = useState<FormationThreadRow[]>([]);
  const [loading, setLoading] = useState(Boolean(progressId));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!progressId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const data = await fetchReviewThread(progressId);
      setMessages(data);
    } catch (err) {
      console.warn("[useFormationReviewThread] load failed:", err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [progressId]);

  useEffect(() => {
    void load();
    if (!progressId) return;
    const id = window.setInterval(() => void load(), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [load, progressId]);

  return { messages, loading, error, reload: load };
}
