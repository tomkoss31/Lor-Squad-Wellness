// =============================================================================
// useAudience — la lecture des compteurs.
//
// SELECT direct plutôt que RPC : le RLS des deux tables filtre déjà par coach
// (admin voit tout, un distri voit ses liens et les liens génériques). Passer
// par une fonction `security definer` obligerait à réécrire ce contrôle à la
// main — c'est-à-dire à créer une occasion de le rater.
//
// Le volume reste petit par construction (une ligne par jour × page, pas par
// visite) : ~40 pages × 90 jours = 3 600 lignes au pire, agrégées ici. Si un
// jour « Total » devient lourd, c'est le signe qu'il faut une vue matérialisée
// — pas qu'il faut lever la limite.
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import { fenetreDe, type ClePeriode } from "./periodes";

export interface LignePage {
  cle: string;
  vues: number;
  visites: number;
  sorties: number;
  dureeMs: number;
  dureeN: number;
}

export interface LigneClic {
  cle: string;
  n: number;
}

export interface EtapeTunnel {
  tunnel: string;
  etape: string;
  rang: number;
  n: number;
}

export interface Audience {
  pages: LignePage[];
  clics: LigneClic[];
  etapes: EtapeTunnel[];
  totalVues: number;
  totalVisites: number;
  /** Moyenne, en ms — chaque vue étant déjà plafonnée à 10 min côté base. */
  dureeMoyenne: number;
  /** Vues de la période précédente, pour le « vs période d'avant ».
   *  `null` sur « Total », où la comparaison n'a pas de sens. */
  precedent: { vues: number; visites: number; dureeMoyenne: number } | null;
}

const VIDE: Audience = {
  pages: [], clics: [], etapes: [],
  totalVues: 0, totalVisites: 0, dureeMoyenne: 0, precedent: null,
};

interface RowPage {
  type: string; cle: string; vues: number; visites: number;
  sorties: number; duree_ms: number; duree_n: number;
}
interface RowEtape { tunnel: string; etape: string; rang: number; n: number }

function agreger(rows: RowPage[]) {
  const pages = new Map<string, LignePage>();
  const clics = new Map<string, LigneClic>();
  for (const r of rows) {
    if (r.type === "clic") {
      const c = clics.get(r.cle) ?? { cle: r.cle, n: 0 };
      c.n += r.vues ?? 0;
      clics.set(r.cle, c);
      continue;
    }
    const p = pages.get(r.cle) ?? { cle: r.cle, vues: 0, visites: 0, sorties: 0, dureeMs: 0, dureeN: 0 };
    p.vues += r.vues ?? 0;
    p.visites += r.visites ?? 0;
    p.sorties += r.sorties ?? 0;
    p.dureeMs += r.duree_ms ?? 0;
    p.dureeN += r.duree_n ?? 0;
    pages.set(r.cle, p);
  }
  return {
    pages: [...pages.values()].sort((a, b) => b.vues - a.vues),
    clics: [...clics.values()].sort((a, b) => b.n - a.n),
  };
}

export function useAudience(periode: ClePeriode, mesLiensSeulement: boolean, moi: string | null) {
  const [data, setData] = useState<Audience>(VIDE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Une seule lecture de l'horloge par chargement : deux appels à `new Date()`
  // à cheval sur minuit compareraient deux fenêtres décalées.
  const fenetre = useMemo(() => fenetreDe(periode, new Date()), [periode]);

  const charger = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sb = await getSupabaseClient();
      if (!sb) { setError("Service indisponible."); return; }

      let q = sb.from("audience_daily")
        .select("type, cle, vues, visites, sorties, duree_ms, duree_n");
      if (fenetre.debut) q = q.gte("jour", fenetre.debut);
      // « Mes liens » = ceux attribués à ce coach. Les liens génériques
      // (coach null) ne sont l'œuvre de personne en particulier : les compter
      // dans « mes liens » gonflerait le chiffre de chacun.
      if (mesLiensSeulement && moi) q = q.eq("coach_user_id", moi);

      let qe = sb.from("audience_funnel_daily").select("tunnel, etape, rang, n");
      if (fenetre.debut) qe = qe.gte("jour", fenetre.debut);
      if (mesLiensSeulement && moi) qe = qe.eq("coach_user_id", moi);

      let qp = fenetre.precedent
        ? sb.from("audience_daily")
            .select("type, cle, vues, visites, sorties, duree_ms, duree_n")
            .gte("jour", fenetre.precedent.debut)
            .lte("jour", fenetre.precedent.fin)
        : null;
      if (qp && mesLiensSeulement && moi) qp = qp.eq("coach_user_id", moi);

      const [res, resE, resP] = await Promise.all([q, qe, qp ?? Promise.resolve({ data: [], error: null })]);
      if (res.error) { setError(res.error.message); return; }

      const { pages, clics } = agreger((res.data ?? []) as RowPage[]);
      const totalVues = pages.reduce((n, p) => n + p.vues, 0);
      const totalVisites = pages.reduce((n, p) => n + p.visites, 0);
      const dureeN = pages.reduce((n, p) => n + p.dureeN, 0);
      const dureeMs = pages.reduce((n, p) => n + p.dureeMs, 0);

      let precedent: Audience["precedent"] = null;
      if (fenetre.precedent && !resP.error) {
        const a = agreger((resP.data ?? []) as RowPage[]);
        const n = a.pages.reduce((s, p) => s + p.dureeN, 0);
        precedent = {
          vues: a.pages.reduce((s, p) => s + p.vues, 0),
          visites: a.pages.reduce((s, p) => s + p.visites, 0),
          dureeMoyenne: n > 0 ? a.pages.reduce((s, p) => s + p.dureeMs, 0) / n : 0,
        };
      }

      const etapes = new Map<string, EtapeTunnel>();
      for (const r of ((resE.data ?? []) as RowEtape[])) {
        const k = `${r.tunnel}|${r.etape}`;
        const e = etapes.get(k) ?? { tunnel: r.tunnel, etape: r.etape, rang: r.rang, n: 0 };
        e.n += r.n ?? 0;
        etapes.set(k, e);
      }

      setData({
        pages, clics,
        etapes: [...etapes.values()].sort((a, b) => a.tunnel.localeCompare(b.tunnel) || a.rang - b.rang),
        totalVues, totalVisites,
        dureeMoyenne: dureeN > 0 ? dureeMs / dureeN : 0,
        precedent,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, [fenetre, mesLiensSeulement, moi]);

  useEffect(() => { void charger(); }, [charger]);

  return { data, loading, error, recharger: charger };
}
