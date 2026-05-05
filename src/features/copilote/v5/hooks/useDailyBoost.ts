// =============================================================================
// useDailyBoost — Phase A Co-pilote V5 (2026-05-05)
//
// Récupère la quote du jour pour le widget Daily Boost, basée sur :
//   - userId (stabilité pour un user donné)
//   - date locale (rotation quotidienne à minuit)
//   - catégorie (issue de useTimeContext, ex. mindset/business/nutrition)
//
// Bonus admin (validation Thomas 2026-05-05) :
//   - Query param `?previewQuoteId=<uuid>` permet à un admin de forcer
//     l'affichage d'une quote spécifique pour preview (avant publication).
//     Active uniquement si currentUser.role === 'admin'.
//
// Cache : la quote est mémoïsée sur (userId + ymdLocal + category). Ne
// re-fetch pas tant qu'on est sur la même journée + même catégorie.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getSupabaseClient } from "../../../../services/supabaseClient";
import { useAppContext } from "../../../../context/AppContext";
import {
  pickQuoteForCategory,
  ymdLocal,
  type DailyQuote,
} from "../lib/pick-quote-of-day";
import type { DailyBoostCategory } from "../../../../lib/time-context";

interface UseDailyBoostResult {
  quote: DailyQuote | null;
  loading: boolean;
  error: string | null;
  /** True si la quote affichée est forcée par ?previewQuoteId admin. */
  isPreview: boolean;
}

export function useDailyBoost(category: DailyBoostCategory): UseDailyBoostResult {
  const { currentUser } = useAppContext();
  const [searchParams] = useSearchParams();
  const previewQuoteId = searchParams.get("previewQuoteId");
  const isAdmin = currentUser?.role === "admin";

  const [allQuotes, setAllQuotes] = useState<DailyQuote[]>([]);
  const [previewQuote, setPreviewQuote] = useState<DailyQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date d'aujourd'hui en YYYYMMDD (stable sur la journée locale)
  const today = useMemo(() => ymdLocal(new Date()), []);

  // ─── Fetch toutes les quotes actives une fois ────────────────────────
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      const sb = await getSupabaseClient();
      if (!sb) {
        if (!cancelled) {
          setError("Connexion Supabase indisponible");
          setLoading(false);
        }
        return;
      }
      const { data, error: e } = await sb
        .from("daily_quotes")
        .select("id, quote, author, category, weight, active")
        .eq("active", true);

      if (cancelled) return;

      if (e) {
        console.error("[useDailyBoost] fetch error:", e);
        setError(e.message);
        setLoading(false);
        return;
      }
      setAllQuotes((data ?? []) as DailyQuote[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Fetch la quote forcée si ?previewQuoteId & admin ────────────────
  useEffect(() => {
    let cancelled = false;
    setPreviewQuote(null);
    if (!previewQuoteId || !isAdmin) return;

    void (async () => {
      const sb = await getSupabaseClient();
      if (!sb) return;
      const { data } = await sb
        .from("daily_quotes")
        .select("id, quote, author, category, weight, active")
        .eq("id", previewQuoteId)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setPreviewQuote(data as DailyQuote);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [previewQuoteId, isAdmin]);

  // ─── Pick la quote du jour (memoïsée sur userId + today + category) ──
  const quote = useMemo<DailyQuote | null>(() => {
    if (previewQuote) return previewQuote;
    if (!currentUser?.id || allQuotes.length === 0) return null;
    return pickQuoteForCategory(allQuotes, category, currentUser.id);
  }, [previewQuote, currentUser?.id, allQuotes, category, today]); // eslint-disable-line react-hooks/exhaustive-deps
  // `today` est dans deps pour rotation à minuit (le memo s'invalide
  // automatiquement dès que la date locale change, même si le hook reste mounted).

  return {
    quote,
    loading,
    error,
    isPreview: previewQuote !== null,
  };
}
