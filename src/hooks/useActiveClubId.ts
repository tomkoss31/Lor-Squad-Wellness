// =============================================================================
// useActiveClubId — id du club actif, résolu de façon admin-safe.
// La policy `clubs_owner_manage` autorise la lecture au propriétaire OU à tout
// admin → fonctionne pour un admin en mode classique (Mélanie) qui n'est pas
// propriétaire du club, là où `useBbcMode`/`useClubSettings` (scopés owner)
// renvoient null. Un seul club aujourd'hui ("La Base Nutrition"). Silencieux.
// =============================================================================

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../services/supabaseClient";

export function useActiveClubId(): string | null {
  const [clubId, setClubId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const { data } = await sb
          .from("clubs")
          .select("id")
          .eq("active", true)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (alive && data?.id) setClubId(data.id as string);
      } catch {
        // silencieux : pas de club lisible = pas de widget, jamais d'écran cassé.
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return clubId;
}
