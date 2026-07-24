// =============================================================================
// useBbcVisits — pointage des visites, données réelles (chantier BBC).
// Membres = clients du coach ; compteur via RPC bbc_visit_counts (RLS-safe).
// addVisit insère une ligne club_visits (RLS : coach_user_id = auth.uid()).
// Alerte : 7-9 = orange (bientôt bilan), 10+ = rouge (bilan des 10 à faire).
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";

export type VisitLevel = "ok" | "warn" | "bilan";

export function visitLevel(v: number): VisitLevel {
  if (v >= 10) return "bilan";
  if (v >= 7) return "warn";
  return "ok";
}

export interface VisitMember {
  id: string;
  name: string;
  visits: number;
}
export interface UseBbcVisitsResult {
  members: VisitMember[];
  loading: boolean;
  addVisit: (clientId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useBbcVisits(userId?: string | null): UseBbcVisitsResult {
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const sb = await getSupabaseClient();
      if (!sb) {
        setLoading(false);
        return;
      }
      const [clientsRes, countsRes] = await Promise.all([
        // Seuls les MEMBRES BBC (ceux qui ont pris une carte = ebe_bbc) entrent
        // dans l'environnement BBC. Un client classique n'apparaît jamais ici.
        sb.from("clients").select("id, first_name, last_name").eq("distributor_id", userId).eq("ebe_bbc", true).order("first_name"),
        sb.rpc("bbc_visit_counts"),
      ]);
      if (Array.isArray(clientsRes.data)) {
        setClients(
          clientsRes.data.map((c: Record<string, unknown>) => ({
            id: String(c.id),
            name: `${String(c.first_name ?? "").trim()} ${String(c.last_name ?? "").trim()}`.trim() || "—",
          })),
        );
      }
      if (Array.isArray(countsRes.data)) {
        const map: Record<string, number> = {};
        for (const row of countsRes.data as Array<Record<string, unknown>>) {
          map[String(row.client_id)] = Number(row.cnt) || 0;
        }
        setCounts(map);
      }
    } catch {
      // silent-fail
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const addVisit = useCallback(
    async (clientId: string) => {
      setCounts((prev) => ({ ...prev, [clientId]: (prev[clientId] ?? 0) + 1 }));
      if (!userId) return;
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const { error } = await sb.from("club_visits").insert({ coach_user_id: userId, client_id: clientId });
        if (error) setCounts((prev) => ({ ...prev, [clientId]: Math.max(0, (prev[clientId] ?? 1) - 1) }));
      } catch {
        setCounts((prev) => ({ ...prev, [clientId]: Math.max(0, (prev[clientId] ?? 1) - 1) }));
      }
    },
    [userId],
  );

  const members = useMemo(
    () => clients.map((c) => ({ ...c, visits: counts[c.id] ?? 0 })).sort((a, b) => b.visits - a.visits),
    [clients, counts],
  );

  return { members, loading, addVisit, refetch };
}
