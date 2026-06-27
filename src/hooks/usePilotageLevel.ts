// =============================================================================
// usePilotageLevel — niveau de pilotage dérivé d'un distributeur (PR3).
// Lit get_pilotage_level(userId) ; permet aux admins de poser/retirer un
// override via set_pilotage_override. Silent-fail si migration PR2 absente.
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../services/supabaseClient";

export type PilotageLevel = "nouveau" | "actif" | "ambassadeur" | "leader" | "dort";

export const PILOTAGE_LEVELS: PilotageLevel[] = [
  "nouveau",
  "actif",
  "ambassadeur",
  "leader",
  "dort",
];

interface UsePilotageLevelResult {
  level: PilotageLevel | null;
  loading: boolean;
  /** Admin only : pose (level) ou retire (null = retour calcul auto) l'override. */
  setOverride: (level: PilotageLevel | null) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function usePilotageLevel(userId: string | null | undefined): UsePilotageLevelResult {
  const [level, setLevel] = useState<PilotageLevel | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) {
        setLoading(false);
        return;
      }
      const { data, error } = await sb.rpc("get_pilotage_level", { p_user_id: userId });
      if (!error && typeof data === "string") {
        setLevel(data as PilotageLevel);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const setOverride = useCallback(
    async (lvl: PilotageLevel | null): Promise<boolean> => {
      if (!userId) return false;
      try {
        const sb = await getSupabaseClient();
        if (!sb) return false;
        const { error } = await sb.rpc("set_pilotage_override", {
          p_user_id: userId,
          p_level: lvl,
        });
        if (error) return false;
        await refetch();
        return true;
      } catch {
        return false;
      }
    },
    [userId, refetch],
  );

  return { level, loading, setOverride, refetch };
}

/** Métadonnées d'affichage par niveau (emoji + libellé + couleur token). */
export const PILOTAGE_META: Record<PilotageLevel, { emoji: string; label: string; color: string }> = {
  nouveau: { emoji: "🌱", label: "Nouveau", color: "var(--ls-text-muted)" },
  actif: { emoji: "⚡", label: "Actif", color: "var(--ls-teal)" },
  ambassadeur: { emoji: "⭐", label: "Ambassadeur", color: "var(--ls-gold)" },
  leader: { emoji: "👑", label: "Leader", color: "var(--ls-purple)" },
  dort: { emoji: "😴", label: "En sommeil", color: "var(--ls-coral)" },
};
