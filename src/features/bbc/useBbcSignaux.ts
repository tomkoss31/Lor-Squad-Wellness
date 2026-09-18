// =============================================================================
// useBbcSignaux — ce que la base sait des visites de chaque membre (livraison B) :
// la dernière visite et le nombre de visites sur 30 jours. RPC
// `bbc_dernieres_visites()` (migration 20261215530000), même périmètre que le
// pointage : mes membres, ou ceux du club dont je suis coach.
// Sert aux règles « absente depuis 6 jours » et « contente depuis 3 semaines ».
// =============================================================================

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";

export interface SignalVisites {
  derniereVisite: string | null;
  visites30j: number;
}

export function useBbcSignaux(userId?: string | null): { signaux: Map<string, SignalVisites>; loading: boolean } {
  const [signaux, setSignaux] = useState<Map<string, SignalVisites>>(new Map());
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let annule = false;
    (async () => {
      if (!userId) { setLoading(false); return; }
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const { data } = await sb.rpc("bbc_dernieres_visites");
        if (annule || !Array.isArray(data)) return;
        const m = new Map<string, SignalVisites>();
        for (const r of data as Array<{ client_id: string; derniere_visite: string | null; visites_30j: number | string }>) {
          m.set(r.client_id, { derniereVisite: r.derniere_visite, visites30j: Number(r.visites_30j) || 0 });
        }
        setSignaux(m);
      } catch {
        // Sans signaux, les règles « absente » et « contente » ne s'appliquent pas — l'écran reste juste.
      } finally {
        if (!annule) setLoading(false);
      }
    })();
    return () => { annule = true; };
  }, [userId]);
  return { signaux, loading };
}
