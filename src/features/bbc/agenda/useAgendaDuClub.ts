// =============================================================================
// useAgendaDuClub — les rendez-vous du club sur une fenêtre, lus en base.
//
// UNE seule requête, la RPC `agenda_du_club(du, au)` : trois tables réunies
// côté serveur, avec les seuls champs d'un agenda. Le hook ne filtre rien —
// c'est la fonction qui décide de ce que le lecteur a le droit de voir.
// Fenêtre bornée à 92 jours par la fonction elle-même.
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../../../services/supabaseClient";
import { versRdvClub, type RdvClub } from "./agendaClub";

export interface UseAgendaDuClubResult {
  rdvs: RdvClub[];
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useAgendaDuClub(du: Date, au: Date, userId?: string | null): UseAgendaDuClubResult {
  const [rdvs, setRdvs] = useState<RdvClub[]>([]);
  const [loading, setLoading] = useState(true);
  const duIso = du.toISOString();
  const auIso = au.toISOString();

  const refetch = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const sb = await getSupabaseClient();
      if (!sb) return;
      const { data } = await sb.rpc("agenda_du_club", { du: duIso, au: auIso });
      if (Array.isArray(data)) {
        const out: RdvClub[] = [];
        for (const r of data as Array<Record<string, unknown>>) {
          const x = versRdvClub(r);
          if (x) out.push(x);
        }
        setRdvs(out);
      }
    } catch {
      // silent-fail : l'écran garde ce qu'il avait, le bandeau global couvre les pannes.
    } finally {
      setLoading(false);
    }
  }, [userId, duIso, auIso]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { rdvs, loading, refetch };
}
