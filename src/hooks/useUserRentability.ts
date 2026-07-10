// =============================================================================
// useUserRentability — V2 (2026-05-05)
//
// Wrap la RPC get_users_rentability(user_ids[], month).
// Détecte automatiquement le mode couple (Thomas + Mélanie même ID Herbalife)
// et passe les 2 IDs à la RPC pour agrégation. Sinon passe 1 seul ID.
//
// Retourne :
//   - Total revenue + marge agrégée
//   - Split Public vs VIP (revenue + marge + nb clients distincts)
//   - Top clients (group by client_id, pas par produit ; jusqu'à 50 depuis 2026-06-13)
//   - Mois précédent + projection fin de mois
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../services/supabaseClient";
import { useAppContext } from "../context/AppContext";
import { resolveCoupleUserIds, isCoupleUser } from "../config/teamConfig";
import { listConsumptionOrders } from "../services/supabaseService";

export interface RentabilityTopClient {
  client_id: string;
  client_name: string;
  vip_status: string | null;
  vip_discount_pct: number;
  is_vip: boolean;
  revenue: number;
  /** Marge nette distri sur ce client (calculée par tier dans la RPC). */
  margin: number;
  items_count: number;
  products: string[];
}

export interface RentabilityData {
  scope_user_ids: string[];
  scope_label: string;
  rank: string;
  rank_label: string;
  margin_pct: number;
  // Total agrégé
  revenue_brut: number;
  margin_eur: number;
  // Public split
  revenue_public: number;
  margin_public_eur: number;
  clients_public_count: number;
  // VIP split
  revenue_vip: number;
  margin_vip_eur: number;
  clients_vip_count: number;
  // Top clients
  top_clients: RentabilityTopClient[];
  // Compteurs / projection / mois précédent
  products_count: number;
  prev_month_eur: number;
  projection_eur: number;
  month_start: string;
  month_end: string;
  days_elapsed: number;
  days_in_month: number;
  // Ventes comptoir (consumption_orders) fusionnées côté hook (2026-07-10) :
  // le CA + la marge sont AJOUTÉS à revenue_brut / margin_eur ci-dessus ; ces
  // champs exposent le détail pour une ligne « dont comptoir » transparente.
  conso_revenue?: number;
  conso_margin?: number;
  conso_pv?: number;
  conso_count?: number;
}

interface UseUserRentabilityResult {
  data: RentabilityData | null;
  loading: boolean;
  error: string | null;
  /** True si le hook a fusionné Thomas + Mélanie. */
  isCoupleAggregated: boolean;
  refetch: () => Promise<void>;
}

export const RENTABILITY_THRESHOLDS = {
  red: 200,
  green: 500,
} as const;

export type RentabilityZone = "red" | "orange" | "green";

export function rentabilityZone(eur: number): RentabilityZone {
  if (eur < RENTABILITY_THRESHOLDS.red) return "red";
  if (eur >= RENTABILITY_THRESHOLDS.green) return "green";
  return "orange";
}

/**
 * Hook rentabilité.
 *
 * - Si `userId` correspond à un membre du couple admin (Thomas ou Mélanie),
 *   on agrège automatiquement les 2 (même ID Herbalife).
 * - Sinon on prend juste le user passé.
 */
export function useUserRentability(
  userId: string | null,
  monthIso?: string,
): UseUserRentabilityResult {
  const { users } = useAppContext();
  const [data, setData] = useState<RentabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Si le user demandé est un membre du couple, on prend les 2 IDs
  const userIds = useMemo<string[]>(() => {
    if (!userId) return [];
    if (isCoupleUser(userId, users)) {
      return resolveCoupleUserIds(users);
    }
    return [userId];
  }, [userId, users]);

  const isCoupleAggregated = userIds.length > 1;

  const fetch = useCallback(async () => {
    if (!userId || userIds.length === 0) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const sb = await getSupabaseClient();
    if (!sb) {
      setError("Connexion Supabase indisponible");
      setLoading(false);
      return;
    }
    const { data: rows, error: e } = await sb.rpc("get_users_rentability", {
      p_user_ids: userIds,
      p_month: monthIso ?? null,
    });
    if (e) {
      // Log explicite pour diagnostic (si la RPC plante côté SQL on doit le voir)
      console.error("[useUserRentability] RPC error:", e, { userIds, monthIso });
      setError(e.message);
      setData(null);
      setLoading(false);
      return;
    }
    const row = Array.isArray(rows) && rows.length > 0 ? (rows[0] as RentabilityData) : null;
    if (!row) {
      console.warn("[useUserRentability] RPC returned empty rows", { userIds, monthIso });
    }

    // ── Ventes comptoir (consumption_orders) : on AJOUTE CA + marge au total,
    // et on expose le détail. Marge conso = CA × tier% du distri (même barème
    // que la vente directe). Aucune formule PV/paliers touchée. Best-effort :
    // si la table n'est pas dispo, la rentabilité s'affiche sans conso.
    if (row) {
      try {
        const monthKey = /^\d{4}-\d{2}/.test(row.month_start ?? "")
          ? row.month_start.slice(0, 7)
          : /^\d{4}-\d{2}/.test(monthIso ?? "")
            ? (monthIso as string).slice(0, 7)
            : new Date().toISOString().slice(0, 7);
        const perUser = await Promise.all(
          userIds.map((uid) => listConsumptionOrders({ distributorId: uid, monthIso: monthKey })),
        );
        const all = perUser.flat();
        const consoRevenue = all.reduce((a, o) => a + o.totalPrice, 0);
        const consoPv = all.reduce((a, o) => a + o.totalPv, 0);
        const consoMargin = consoRevenue * ((row.margin_pct ?? 0) / 100);
        row.conso_revenue = consoRevenue;
        row.conso_pv = consoPv;
        row.conso_margin = consoMargin;
        row.conso_count = all.length;
        row.revenue_brut = (row.revenue_brut ?? 0) + consoRevenue;
        row.margin_eur = (row.margin_eur ?? 0) + consoMargin;
      } catch (consoErr) {
        console.warn("[useUserRentability] conso merge skipped:", consoErr);
      }
    }

    setData(row);
    setLoading(false);
  }, [userId, userIds, monthIso]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { data, loading, error, isCoupleAggregated, refetch: fetch };
}
