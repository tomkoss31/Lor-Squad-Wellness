// =============================================================================
// useBbcFormationProgress — les modules Formation BBC réellement déroulés.
//
// L'écran affichait « 3 / 9 fait » en dur et proposait de « reprendre » le
// module 03 à vie, pour tout le monde. Un indicateur de progression qui ne
// bouge jamais apprend à l'utilisateur à ignorer l'écran.
//
// Calqué ligne à ligne sur `useBbcPrelaunch` (optimiste + rollback), même geste
// pour le coach dans tout le mode BBC : il COCHE, l'app ne coche pas à sa
// place. Ouvrir une fiche ≠ l'avoir déroulée — un auto-marquage à l'ouverture
// rendrait le compteur faux dans l'autre sens.
//
// ⚠️ `available` : tant que la migration `bbc_formation_progress` n'est pas
// poussée, la lecture échoue et on n'affiche NI compteur NI case à cocher.
// Mieux vaut pas de compteur du tout qu'un « 0 / 9 » qui ne bougera jamais —
// c'est exactement le défaut qu'on corrige.
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";

export interface UseBbcFormationProgressResult {
  /**
   * Coché par module, indexé sur `BbcFormationModule.key` — le SLUG stable
   * (« ebe », « bilan10»…), jamais sur le numéro affiché.
   *
   * ⚠️ Le stockage a changé le 2026-07-28, quand le parcours a été réordonné
   * (le modèle économique est passé de 00 à 09). Indexée sur le numéro, la
   * case cochée d'un coach aurait silencieusement suivi le module qui a pris
   * sa place. Les anciennes lignes '00'…'08' restent en base et deviennent des
   * clés orphelines : sans conséquence, justement parce que le COMPTE se fait
   * côté vue à partir du registre des modules, et pas en comptant les lignes.
   */
  done: Record<string, boolean>;
  loading: boolean;
  /** false = table absente / RLS / pas de session → l'UI n'affiche rien. */
  available: boolean;
  toggle: (moduleKey: string) => Promise<void>;
}

export function useBbcFormationProgress(userId?: string | null): UseBbcFormationProgressResult {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) return;

      // Même raison que dans useBbcRole : la vue est montée sans props, le hook
      // résout donc lui-même la session. Le paramètre reste ouvert pour le jour
      // où BbcApp passera l'identité.
      let me = userId ?? null;
      if (!me) {
        const { data: auth } = await sb.auth.getUser();
        me = auth?.user?.id ?? null;
      }
      if (!me) return;

      const { data, error } = await sb
        .from("bbc_formation_progress")
        .select("module_key, done_at")
        .eq("user_id", me);
      if (error || !Array.isArray(data)) return;

      const map: Record<string, boolean> = {};
      for (const r of data as Array<Record<string, unknown>>) {
        map[String(r.module_key)] = Boolean(r.done_at);
      }
      setDone(map);
      setAvailable(true);
    } catch {
      // silent-fail → available reste false, l'UI n'affiche pas de compteur.
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const toggle = useCallback(
    async (moduleKey: string) => {
      if (!available) return;
      const next = !done[moduleKey];
      setDone((prev) => ({ ...prev, [moduleKey]: next })); // optimiste
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const { error } = await sb.rpc("bbc_toggle_formation", { p_module_key: moduleKey, p_done: next });
        if (error) setDone((prev) => ({ ...prev, [moduleKey]: !next })); // rollback
      } catch {
        setDone((prev) => ({ ...prev, [moduleKey]: !next }));
      }
    },
    [done, available],
  );

  return { done, loading, available, toggle };
}
