// =============================================================================
// useContactsDuJour — le compteur « 20 par jour » et les « déjà fait » (livraison B).
//
// Table `bbc_contacts` (migration 20261215530000) : une ligne par « et alors ? ».
// - `count`  : MES contacts du jour (le compteur est personnel).
// - `faits`  : les cibles déjà traitées aujourd'hui, par moi OU par une coach du
//              club — si Mélanie a appelé Camille, Thomas ne la voit plus à faire.
// - `noter`  : écrit la ligne, met le compteur à jour tout de suite (optimiste).
// Remplace l'usage de `outreach_messages` (ex-Cobayes du jour) de la livraison A.
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";

export const OBJECTIF_CONTACTS = 20;

export interface ContactFait {
  cible: string;
  prenom: string;
  raison: string;
  reponse: string;
  faitAt: string;
  parMoi: boolean;
}

export interface UseContactsDuJourResult {
  count: number;
  target: number;
  faits: Map<string, ContactFait>;
  loading: boolean;
  noter: (c: { cible: string; prenom: string; raison: string; reponse: string }) => Promise<string | null>;
  refetch: () => Promise<void>;
}

function debutDuJourISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function useContactsDuJour(userId: string | null | undefined, target = OBJECTIF_CONTACTS): UseContactsDuJourResult {
  const [count, setCount] = useState(0);
  const [faits, setFaits] = useState<Map<string, ContactFait>>(new Map());
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    try {
      const sb = await getSupabaseClient();
      if (!sb) { setLoading(false); return; }
      const { data, error } = await sb
        .from("bbc_contacts")
        .select("user_id, cible, prenom, raison, reponse, fait_at")
        .gte("fait_at", debutDuJourISO())
        .order("fait_at", { ascending: false });
      if (error || !Array.isArray(data)) return;
      const m = new Map<string, ContactFait>();
      let mien = 0;
      for (const r of data as Array<{ user_id: string; cible: string; prenom: string; raison: string; reponse: string; fait_at: string }>) {
        const parMoi = r.user_id === userId;
        if (parMoi) mien += 1;
        if (!m.has(r.cible)) m.set(r.cible, { cible: r.cible, prenom: r.prenom, raison: r.raison, reponse: r.reponse, faitAt: r.fait_at, parMoi });
      }
      setFaits(m);
      setCount(mien);
    } catch {
      // Silencieux : le compteur reste tel quel, l'écran ne casse pas.
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void refetch(); }, [refetch]);

  const noter = useCallback(
    async (c: { cible: string; prenom: string; raison: string; reponse: string }): Promise<string | null> => {
      if (!userId) return "Pas connecté·e.";
      setCount((n) => n + 1);
      setFaits((prev) => new Map(prev).set(c.cible, { ...c, faitAt: new Date().toISOString(), parMoi: true }));
      try {
        const sb = await getSupabaseClient();
        if (!sb) return "Service indisponible.";
        const { error } = await sb.from("bbc_contacts").insert({ user_id: userId, cible: c.cible, prenom: c.prenom, raison: c.raison, reponse: c.reponse.slice(0, 60) });
        if (error) {
          setCount((n) => Math.max(0, n - 1));
          setFaits((prev) => { const m = new Map(prev); m.delete(c.cible); return m; });
          return error.message;
        }
        void refetch();
        return null;
      } catch (e) {
        setCount((n) => Math.max(0, n - 1));
        return e instanceof Error ? e.message : "Erreur inconnue.";
      }
    },
    [userId, refetch],
  );

  return { count, target, faits, loading, noter, refetch };
}
