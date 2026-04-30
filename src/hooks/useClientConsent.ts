// useClientConsent (RGPD Phase 1 — 2026-04-30)
// Verifie si un client a deja un consentement enregistre (table client_consents).
// Retourne :
//   hasConsent : true / false / null (loading)
//   markAsConsented : helper pour marquer comme consenti localement (apres
//                     le INSERT du ConsentDialog, evite un re-fetch).

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../services/supabaseClient";

export interface UseClientConsentResult {
  hasConsent: boolean | null;
  loading: boolean;
  markAsConsented: () => void;
  refresh: () => void;
}

export function useClientConsent(clientId: string | null | undefined): UseClientConsentResult {
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!clientId) {
      setHasConsent(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) {
          if (!cancelled) {
            setHasConsent(false);
            setLoading(false);
          }
          return;
        }
        const { data, error } = await sb
          .from("client_consents")
          .select("id")
          .eq("client_id", clientId)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.warn("[useClientConsent] fetch failed:", error.message);
          setHasConsent(false);
        } else {
          setHasConsent(!!data);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId, refreshKey]);

  return {
    hasConsent,
    loading,
    markAsConsented: () => setHasConsent(true),
    refresh: () => setRefreshKey((k) => k + 1),
  };
}
