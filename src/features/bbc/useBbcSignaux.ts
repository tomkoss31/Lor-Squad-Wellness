// =============================================================================
// useBbcSignaux — ce que la base sait des visites de chaque membre (livraison B) :
// la dernière visite et le nombre de visites sur 30 jours. RPC
// `bbc_dernieres_visites()` (migration 20261215530000), même périmètre que le
// pointage : mes membres, ou ceux du club dont je suis coach.
// Sert aux règles « absente depuis 6 jours » et « contente depuis 3 semaines ».
// + le journal (bloc B, 8, 21/09/2026) : RPC `journal_signaux_club()` (migration
// 20261215630000, le RLS de la coach) pour « elle a lâché son journal ».
// + « à la maison » (comptoir, lot 2, 26/09) : RPC `club_maison()` — ce que chaque
// membre a emporté et ses jours au club, avec les horaires du club — pour
// « son F1 arrive au bout ».
// =============================================================================

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import type { ReglagesHoraires } from "./agenda/agendaClub";
import { lireMaisonClub, type DonneesMaison } from "./caisse/maison";

export interface SignalJournal {
  /** Le dernier jour où ELLE a noté (AAAA-MM-JJ, heure de Paris) ; le shake pré-rempli du club ne compte pas. */
  derniereLigne: string;
  /** Les jours notés dans les 7 jours qui finissent à cette ligne. */
  joursNotes: number;
  /** Déjà relancée pour son journal depuis cette ligne (avant aujourd'hui). */
  dejaRelancee: boolean;
}

export interface SignalVisites {
  derniereVisite: string | null;
  visites30j: number;
  journal?: SignalJournal;
}

export function useBbcSignaux(userId?: string | null): {
  signaux: Map<string, SignalVisites>;
  maison: Map<string, DonneesMaison>;
  horaires: ReglagesHoraires | null;
  loading: boolean;
} {
  const [signaux, setSignaux] = useState<Map<string, SignalVisites>>(new Map());
  const [maison, setMaison] = useState<{ membres: Map<string, DonneesMaison>; horaires: ReglagesHoraires | null }>({ membres: new Map(), horaires: null });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let annule = false;
    (async () => {
      if (!userId) { setLoading(false); return; }
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const [visites, journal, aLaMaison] = await Promise.all([
          sb.rpc("bbc_dernieres_visites"),
          sb.rpc("journal_signaux_club"),
          sb.rpc("club_maison"),
        ]);
        // « À la maison » : une panne ici n'enlève rien aux autres signaux.
        if (!annule && !aLaMaison.error) setMaison(lireMaisonClub(aLaMaison.data));
        const data = visites.data;
        if (annule || !Array.isArray(data)) return;
        const m = new Map<string, SignalVisites>();
        for (const r of data as Array<{ client_id: string; derniere_visite: string | null; visites_30j: number | string }>) {
          m.set(r.client_id, { derniereVisite: r.derniere_visite, visites30j: Number(r.visites_30j) || 0 });
        }
        // Le journal : une panne ici n'enlève rien aux signaux de visites.
        if (Array.isArray(journal.data)) {
          for (const r of journal.data as Array<{ client_id: string; derniere_ligne: string; jours_notes: number | string; deja_relancee: boolean }>) {
            const s = m.get(r.client_id) ?? { derniereVisite: null, visites30j: 0 };
            m.set(r.client_id, { ...s, journal: { derniereLigne: r.derniere_ligne, joursNotes: Number(r.jours_notes) || 0, dejaRelancee: !!r.deja_relancee } });
          }
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
  return { signaux, maison: maison.membres, horaires: maison.horaires, loading };
}
