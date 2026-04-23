// Chantier Migration RLS app client → Edge Function (2026-04-26).
// Hook qui fetch les données live du client via l'Edge Function
// `client-app-data` (architecture Option C). Remplace les 3 SELECT
// directs qui ne marchaient plus depuis la drop des policies self-select
// du 25/04 (frayeur cast ::uuid).
//
// Fonctionnement :
//   - mount : 1 fetch initial
//   - window focus : refetch si dernière fetch > 5s (debounce anti-spam)
//   - erreur : log console uniquement, laisse le fallback snapshot jouer

import { useCallback, useEffect, useRef, useState } from "react";

export interface ClientLiveData {
  client: {
    current_program: string | null;
    notes: string | null;
  } | null;
  next_follow_up: {
    id: string;
    due_date: string | null; // ISO 8601
    status: string;
    type: string | null;
  } | null;
  current_products: Array<{
    id: string;
    product_id: string;
    product_name: string;
    quantite_label: string | null;
    price_public_per_unit: number | null;
    pv_per_unit: number | null;
    note_metier: string | null;
    start_date: string | null;
    active: boolean;
  }>;
  fetched_at: string;
}

const FOCUS_DEBOUNCE_MS = 5000;

export function useClientLiveData(token: string | null | undefined) {
  const [liveData, setLiveData] = useState<ClientLiveData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);

  const fetchLiveData = useCallback(
    async (opts?: { force?: boolean }) => {
      if (!token) return;
      const now = Date.now();
      if (!opts?.force && now - lastFetchRef.current < FOCUS_DEBOUNCE_MS) {
        // Debounce : focus multiples (Safari ↔ PWA) déclenchés à <5s
        // ne re-fetchent pas. Évite le spam de l'edge function.
        return;
      }
      lastFetchRef.current = now;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
      if (!supabaseUrl || !anonKey) {
        setError("Supabase environment non configuré.");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${supabaseUrl}/functions/v1/client-app-data?token=${encodeURIComponent(token)}`,
          {
            headers: {
              // Anon key requis par l'API gateway Supabase. L'auth réelle
              // se fait via le ?token= validé dans l'edge function.
              Authorization: `Bearer ${anonKey}`,
            },
          },
        );
        if (!res.ok) {
          throw new Error(`status ${res.status}`);
        }
        const json = (await res.json()) as ClientLiveData;
        setLiveData(json);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn("[useClientLiveData] fetch failed, fallback snapshot:", msg);
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  // Fetch initial au mount + token change
  useEffect(() => {
    if (!token) return;
    // Premier fetch : force = true (bypass debounce au mount)
    void fetchLiveData({ force: true });
  }, [token, fetchLiveData]);

  // Refresh on window focus (debounced 5s)
  useEffect(() => {
    if (!token) return;
    const handler = () => void fetchLiveData();
    window.addEventListener("focus", handler);
    document.addEventListener("visibilitychange", handler);
    return () => {
      window.removeEventListener("focus", handler);
      document.removeEventListener("visibilitychange", handler);
    };
  }, [token, fetchLiveData]);

  return { liveData, loading, error, refetch: () => fetchLiveData({ force: true }) };
}
