// =============================================================================
// useCoachsDuClub — qui travaille dans mon club, lu en base.
//
// Une seule source pour « le club » (agenda partagé, étape 1, 17/09/2026) :
// la RPC `coachs_du_club()`, qui rend les coachs RATTACHÉS au club plus son
// propriétaire. Avant, le front lisait `settings.discovery.coach_user_ids` —
// la liste des coachs qui prennent les réservations du site — et Romane, qui a
// 7 rendez-vous à venir, n'apparaissait nulle part dans « Le club ».
//
// La RPC rend aussi le NOM : `users` n'est pas lisible par une distributrice,
// donc sans ça les collègues de Romane s'appelleraient tous « Coach ».
// =============================================================================

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";

export interface CoachRattache {
  id: string;
  prenom: string;
  nom: string;
  proprietaire: boolean;
}

export interface UseCoachsDuClubResult {
  coachs: CoachRattache[];
  loading: boolean;
}

export function useCoachsDuClub(userId?: string | null): UseCoachsDuClubResult {
  const [coachs, setCoachs] = useState<CoachRattache[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let vivant = true;
    if (!userId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const { data } = await sb.rpc("coachs_du_club");
        if (!vivant || !Array.isArray(data)) return;
        setCoachs(
          (data as Array<Record<string, unknown>>).map((r) => ({
            id: String(r.id),
            prenom: String(r.prenom ?? "Coach"),
            nom: String(r.nom ?? "Coach"),
            proprietaire: Boolean(r.proprietaire),
          })),
        );
      } catch {
        // silent-fail : la liste reste vide, la portée retombe sur le réglage.
      } finally {
        if (vivant) setLoading(false);
      }
    })();
    return () => {
      vivant = false;
    };
  }, [userId]);

  return { coachs, loading };
}
