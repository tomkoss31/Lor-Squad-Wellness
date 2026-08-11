// =============================================================================
// useCrmBadge — compteur léger de leads "à traiter" pour le badge sidebar 🎯
// CRM et l'action Leads de la routine du jour (wagon 2 chantiers 1+2,
// 2026-06-10).
//
// 4 requêtes COUNT head-only (zéro ligne transférée) sur les sources du
// pipeline : nouveaux + relances dues. Refetch au retour d'onglet
// (visibilitychange) avec un débounce de 60s pour ne pas spammer.
// RLS filtre par coach comme dans useCrmLeads.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "../services/supabaseClient";

// ── Mémoire partagée entre les montages (2026-08-11) ────────────────────────
//
// Ce hook est monté DEUX fois : `AppLayout` (barre latérale) et `BottomNav`
// (nav du bas, mobile). Chacun lançait ses 4 COUNT → 8 requêtes à chaque
// ouverture de l'app, pour afficher le MÊME chiffre au même moment.
//
// On mutualise ici plutôt que dans un contexte React : l'API du hook ne bouge
// pas, donc aucun appelant à modifier, et le jour où un 3e écran l'affiche il
// en profite sans rien faire.
//
//   • une réponse de moins de 60 s est réutilisée telle quelle ;
//   • deux montages simultanés partagent la MÊME requête en vol ;
//   • quand elle revient, tous les abonnés sont mis à jour ensemble.
const CACHE_MS = 60_000;
type Etat = { valeur: number; at: number };
const cache = new Map<string, Etat>();
const enVol = new Map<string, Promise<number>>();
const abonnes = new Map<string, Set<(n: number) => void>>();

function diffuser(cle: string, valeur: number) {
  cache.set(cle, { valeur, at: Date.now() });
  abonnes.get(cle)?.forEach((f) => f(valeur));
}

export function useCrmBadge(userId: string | null, enabled: boolean = true, includeUnassigned: boolean = false) {
  const [count, setCount] = useState(0);
  const lastFetchRef = useRef(0);

  const cle = `${userId ?? ""}|${enabled}|${includeUnassigned}`;

  const fetchCounts = useCallback(async (forcer = false) => {
    if (!enabled || !userId) {
      setCount(0);
      return;
    }
    const connu = cache.get(cle);
    if (!forcer && connu && Date.now() - connu.at < CACHE_MS) {
      setCount(connu.valeur);
      return;
    }
    // Une requête déjà en route pour la même clé : on l'attend au lieu d'en
    // lancer une deuxième. C'est le cas exact des deux montages simultanés.
    const dejaEnRoute = enVol.get(cle);
    if (dejaEnRoute) { setCount(await dejaEnRoute); return; }

    lastFetchRef.current = Date.now();
    const travail: Promise<number> = (async () => {
      const sb = await getSupabaseClient();
      // Pas de client : on renvoie le dernier chiffre connu plutôt que 0, pour
      // ne pas faire clignoter le badge à zéro pendant une coupure.
      if (!sb) return cache.get(cle)?.valeur ?? 0;
      const nowIso = new Date().toISOString();
      // Scopé sur MOI (2026-06-16) : on ne compte que MES leads (propriétaire =
      // moi) → fini le badge fantôme qui additionnait toute l'équipe pour un
      // admin. Owner : online_bilans=coach/assigned, prospect_leads=referrer/
      // assigned, referrals=coach_id. (Intentions hors badge — visibles au CRM.)
      // includeUnassigned (admin) : on compte aussi les leads non attribués
      // (coach/referrer null) — sinon un lien /bilan-online sans slug = lead perdu.
      const bilanOwner = `coach_user_id.eq.${userId},assigned_to_user_id.eq.${userId}${includeUnassigned ? ",coach_user_id.is.null" : ""}`;
      const prospectOwner = `referrer_user_id.eq.${userId},assigned_to_user_id.eq.${userId}${includeUnassigned ? ",referrer_user_id.is.null" : ""}`;
      const [bilansNew, bilansRelance, prospects, referrals] = await Promise.all([
        sb
          .from("online_bilans")
          .select("id", { count: "exact", head: true })
          .eq("lead_status", "new")
          .or(bilanOwner),
        sb
          .from("online_bilans")
          .select("id", { count: "exact", head: true })
          .lte("relance_due_at", nowIso)
          .is("relance_done_at", null)
          .or(bilanOwner),
        sb
          .from("prospect_leads")
          .select("id", { count: "exact", head: true })
          .eq("status", "new")
          .or(prospectOwner),
        sb
          .from("client_referrals")
          .select("id", { count: "exact", head: true })
          .eq("status", "new")
          .eq("coach_id", userId),
      ]);
      return (bilansNew.count ?? 0)
        + (bilansRelance.count ?? 0)
        + (prospects.count ?? 0)
        + (referrals.count ?? 0);
    })();

    enVol.set(cle, travail);
    try {
      const total = await travail;
      diffuser(cle, total);
    } catch {
      // Badge best-effort : on garde la dernière valeur connue.
    } finally {
      enVol.delete(cle);
    }
  }, [enabled, userId, includeUnassigned, cle]);

  useEffect(() => {
    if (!enabled || !userId) return;
    // On s'abonne AVANT de demander : si l'autre montage a déjà lancé la
    // requête, on recevra sa réponse sans en produire une seconde.
    let set = abonnes.get(cle);
    if (!set) { set = new Set(); abonnes.set(cle, set); }
    set.add(setCount);
    void fetchCounts();

    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - lastFetchRef.current > CACHE_MS) {
        void fetchCounts();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      set?.delete(setCount);
      if (set && set.size === 0) abonnes.delete(cle);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchCounts, cle, enabled, userId]);

  // `refetch` force le rafraîchissement : un appelant qui vient de traiter un
  // lead veut le nouveau chiffre, pas celui d'il y a 40 secondes.
  const refetch = useCallback(() => fetchCounts(true), [fetchCounts]);

  return { count, refetch };
}
