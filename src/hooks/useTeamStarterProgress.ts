// =============================================================================
// useTeamStarterProgress — progression « La Base Académie » (cockpit onboarding)
// par membre d'équipe, pour la grille Apprentissage (admin/référent).
//
// Lit distributor_starter_progress (RLS : self + downline + admin) et calcule,
// par user : nb d'étapes franchies (sur les 6 traçables) + « activé·e » (les 5
// portes serveur). Léger, best-effort. Cf. cockpit useSalleOps / academyLessons.
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../services/supabaseClient";

/** Les 6 étapes traçables du cockpit (S'équiper → 1er pack). */
const COCKPIT_KEYS = [
  "commande_250pv",
  "liste_50",
  "premiere_story",
  "premier_bilan",
  "premier_hom",
  "premier_pv_pack",
] as const;

/** Les 5 portes d'activation (= « lancé·e » quand toutes faites). */
const GATE_KEYS = ["liste_50", "premiere_story", "premier_bilan", "premier_hom", "premier_pv_pack"];

export interface MemberStarter {
  done: number;
  total: number;
  activated: boolean;
}

export function useTeamStarterProgress(): {
  byUser: Record<string, MemberStarter>;
  loading: boolean;
  refetch: () => Promise<void>;
} {
  const [byUser, setByUser] = useState<Record<string, MemberStarter>>({});
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) {
        setLoading(false);
        return;
      }
      const { data, error } = await sb
        .from("distributor_starter_progress")
        .select("user_id, task_key, status");
      if (error || !Array.isArray(data)) {
        setByUser({});
        setLoading(false);
        return;
      }

      // user_id → set des clés 'done'.
      const doneByUser: Record<string, Set<string>> = {};
      for (const row of data as { user_id: string; task_key: string; status: string }[]) {
        if (row.status !== "done") continue;
        (doneByUser[row.user_id] ??= new Set()).add(row.task_key);
      }

      const out: Record<string, MemberStarter> = {};
      for (const [uid, set] of Object.entries(doneByUser)) {
        out[uid] = {
          done: COCKPIT_KEYS.filter((k) => set.has(k)).length,
          total: COCKPIT_KEYS.length,
          activated: GATE_KEYS.every((k) => set.has(k)),
        };
      }
      setByUser(out);
    } catch {
      setByUser({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { byUser, loading, refetch: fetch };
}
