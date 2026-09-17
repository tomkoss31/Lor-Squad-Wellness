// =============================================================================
// useCreneauxOccupes — où chaque coach est prise, un jour donné.
//
// La source est `creneaux_occupes(coach, du, au)` : suivis, rendez-vous,
// réservations ET rituels — la même que le tunnel du site. C'est ce qui permet
// de proposer un créneau qui est vraiment libre, et pas seulement libre dans
// les trois tables que l'agenda affiche.
// =============================================================================

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../../services/supabaseClient";
import { jourDe, type Plage } from "./agendaClub";

export interface UseCreneauxOccupesResult {
  /** Par coach : les plages occupées ce jour-là, en millisecondes. */
  occupes: Map<string, Plage[]>;
  loading: boolean;
}

export function useCreneauxOccupes(coachIds: readonly string[], jourCle: string, userId?: string | null): UseCreneauxOccupesResult {
  const [occupes, setOccupes] = useState<Map<string, Plage[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const ids = coachIds.join(",");

  useEffect(() => {
    let vivant = true;
    if (!userId || !ids) {
      setOccupes(new Map());
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const du = jourDe(jourCle);
        const au = new Date(du);
        au.setDate(au.getDate() + 1);
        const resultats = await Promise.all(
          ids.split(",").map(async (coach) => {
            const { data } = await sb.rpc("creneaux_occupes", { p_coach: coach, p_du: du.toISOString(), p_au: au.toISOString() });
            const plages: Plage[] = Array.isArray(data)
              ? (data as Array<Record<string, unknown>>)
                  .map((r) => ({ debut: new Date(String(r.debut)).getTime(), fin: new Date(String(r.fin)).getTime() }))
                  .filter((p) => !Number.isNaN(p.debut) && !Number.isNaN(p.fin))
              : [];
            return [coach, plages] as const;
          }),
        );
        if (vivant) setOccupes(new Map(resultats));
      } catch {
        // silent-fail : la liste reste vide, le serveur revérifie de toute façon.
      } finally {
        if (vivant) setLoading(false);
      }
    })();
    return () => {
      vivant = false;
    };
  }, [ids, jourCle, userId]);

  return { occupes, loading };
}
