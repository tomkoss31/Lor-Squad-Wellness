// =============================================================================
// usePvActionPlan — fetch du plan du jour PV (Strategie PV — 2026-04-28)
// =============================================================================
//
// Appelle la RPC get_pv_action_plan(user_id) qui retourne :
//   - target_pv / current_pv / prorata_pv / delta_pv / ratio / status
//   - top_dormant[] : top consumers historiques sans commande recente
//   - restock_due[] : produits actifs en fin de cure
//   - silent_active[] : clients actifs sans message recent
//   - expected_gain : PV potentiels gagnes en relancant
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../services/supabaseClient";
import { FRAICHEUR, cleDuJour, lireAvecFraicheur } from "../lib/cacheFraicheur";

export type PvStatus = "delayed" | "on_track" | "ahead";

export interface PvDormantClient {
  client_id: string;
  client_name: string;
  monthly_avg_pv: number;
  days_since: number;
}

export interface PvRestockClient {
  client_id: string;
  client_name: string;
  product_name: string;
  days_left: number;
  pv_estimated: number;
}

export interface PvSilentClient {
  client_id: string;
  client_name: string;
  days_silent: number;
}

export interface PvActionPlan {
  target_pv: number;
  current_pv: number;
  prorata_pv: number;
  delta_pv: number;
  ratio: number;
  status: PvStatus;
  day_of_month: number;
  days_in_month: number;
  days_left: number;
  top_dormant: PvDormantClient[];
  restock_due: PvRestockClient[];
  silent_active: PvSilentClient[];
  expected_gain: number;
  computed_at: string;
}

interface UsePvActionPlanResult {
  data: PvActionPlan | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * @param options.fraisALOuverture  à poser sur la PAGE PV DÉDIÉE uniquement.
 *   Ailleurs (Co-pilote), le plan est relu une fois par jour : Thomas l'a
 *   tranché le 2026-08-12 — « PV du mois, clients dormants, c'est une fois par
 *   jour ou à l'ouverture de l'onglet dédié ».
 */
export function usePvActionPlan(
  userId: string | null | undefined,
  options?: { fraisALOuverture?: boolean },
): UsePvActionPlanResult {
  const [data, setData] = useState<PvActionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const frais = options?.fraisALOuverture ?? false;

  const fetchPlan = useCallback(async (forcer = false) => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      // Deux composants du Co-pilote appellent cette RPC en même temps
      // (l'alerte et la carte) : le cache partagé n'en laisse partir qu'une.
      // La clé est DATÉE — un cache de 24 h glissantes chargé le 31 à 23 h
      // afficherait encore le PV du mois écoulé le 1er au matin.
      const result = await lireAvecFraicheur<PvActionPlan>(
        cleDuJour(`plan-pv:${userId}`),
        FRAICHEUR.JOUR,
        async () => {
          const sb = await getSupabaseClient();
          if (!sb) throw new Error("Supabase indisponible");
          const { data: r, error: rpcError } = await sb.rpc("get_pv_action_plan", {
            p_user_id: userId,
          });
          if (rpcError) throw rpcError;
          return r as PvActionPlan;
        },
        { forcer: forcer || frais },
      );
      setData(result);
    } catch (err) {
      // Extraction d erreur robuste — PostgrestError n est PAS une instance
      // d Error donc err.message etait toujours undefined → "Erreur inconnue"
      // Hotfix 2026-04-30 : on sniff toutes les formes possibles.
      const errObj = err as { message?: string; details?: string; hint?: string; code?: string } | null;
      const msg =
        (errObj && typeof errObj.message === "string" && errObj.message.trim()) ||
        (errObj && typeof errObj.details === "string" && errObj.details.trim()) ||
        (errObj && typeof errObj.hint === "string" && errObj.hint.trim()) ||
        (errObj && typeof errObj.code === "string" && `Code ${errObj.code}`) ||
        "Service indisponible — réessaie dans 30s.";
      console.warn("[usePvActionPlan] fetch failed:", err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [userId, frais]);

  useEffect(() => {
    void fetchPlan();
  }, [fetchPlan]);

  // Le rechargement automatique toutes les 5 minutes est RETIRÉ (2026-08-12).
  // Le PV du mois ne bouge que lorsque le coach saisit une commande — et dans
  // ce cas c'est lui qui recharge. Douze requêtes par heure et par onglet
  // ouvert, sur une base qui a déjà gelé une fois faute de mémoire, pour une
  // donnée dont Thomas dit qu'une lecture par jour suffit.

  const reload = useCallback(() => fetchPlan(true), [fetchPlan]);

  return { data, loading, error, reload };
}
