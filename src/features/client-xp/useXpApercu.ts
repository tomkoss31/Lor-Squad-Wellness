// =============================================================================
// useXpApercu — le niveau de chaque cliente, vu du coach (24/09/2026).
//
// UN appel (`xp_apercu_coach`, SECURITY INVOKER : le RLS de `clients` décide),
// partagé par la liste des membres, la fiche, le Matin / Co-pilote et
// « Contacter », gardé deux minutes — même recette que useJournalApercu.
// Les XP sont un indicateur de régularité : ils ne touchent jamais la lecture
// prot / eau / kcal du journal.
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { useMaintenant } from "../bbc/agenda/useMaintenant";
import { jourParis } from "../journal/apercuJournal";
import { getSupabaseClient } from "../../services/supabaseClient";

export interface XpApercu {
  clientId: string;
  total: number;
  niveau: number;
  gains7j: number;
  /** Dernier gain (ISO date) — null si aucun. */
  dernier: string | null;
  /** Le jour où le niveau actuel a été atteint (ISO date) — null au niveau 1. */
  monteLe: string | null;
}

const DUREE_CACHE_MS = 2 * 60 * 1000;
let cache: { cle: string; a: number; donnees: Map<string, XpApercu> } | null = null;
let enCours: { cle: string; promesse: Promise<Map<string, XpApercu>> } | null = null;

function normaliser(brut: unknown): Map<string, XpApercu> {
  const m = new Map<string, XpApercu>();
  if (!Array.isArray(brut)) return m;
  for (const r of brut as Array<Record<string, unknown>>) {
    const id = String(r.client_id ?? "");
    if (!id) continue;
    m.set(id, {
      clientId: id,
      total: Number(r.total ?? 0),
      niveau: Number(r.niveau ?? 1),
      gains7j: Number(r.gains_7j ?? 0),
      dernier: r.dernier ? String(r.dernier) : null,
      monteLe: r.monte_le ? String(r.monte_le) : null,
    });
  }
  return m;
}

function charger(cle: string, force: boolean): Promise<Map<string, XpApercu>> {
  if (!force && cache && cache.cle === cle && Date.now() - cache.a < DUREE_CACHE_MS) {
    return Promise.resolve(cache.donnees);
  }
  if (enCours && enCours.cle === cle) return enCours.promesse;
  const promesse = (async () => {
    const sb = await getSupabaseClient();
    if (!sb) throw new Error("Supabase indisponible");
    const { data, error } = await sb.rpc("xp_apercu_coach");
    if (error) throw new Error(error.message);
    const donnees = normaliser(data);
    cache = { cle, a: Date.now(), donnees };
    return donnees;
  })().finally(() => {
    if (enCours?.promesse === promesse) enCours = null;
  });
  enCours = { cle, promesse };
  return promesse;
}

/** Après un geste (+XP donné) : la prochaine lecture retape la base. */
export function invaliderXpApercu(): void {
  cache = null;
}

export function useXpApercu(userId: string | null | undefined) {
  const jour = jourParis(useMaintenant());
  const cle = userId ? `${userId}|${jour}` : "";
  const [etat, setEtat] = useState<{ cle: string; donnees: Map<string, XpApercu> } | null>(() =>
    cache && cle && cache.cle === cle ? { cle, donnees: cache.donnees } : null,
  );
  const [erreur, setErreur] = useState<string | null>(null);

  const recharger = useCallback(
    async (force = false) => {
      if (!cle) return;
      try {
        setErreur(null);
        const donnees = await charger(cle, force);
        setEtat({ cle, donnees });
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "Les XP ne répondent pas pour le moment.");
      }
    },
    [cle],
  );

  useEffect(() => {
    void recharger(false);
  }, [recharger]);

  const donnees = etat && etat.cle === cle ? etat.donnees : null;
  return { donnees, erreur, recharger, jour };
}

/** « ↑ monté lundi » : la montée date de moins de 7 jours. */
export function monteRecemment(x: XpApercu | undefined, jourParisIso: string): boolean {
  if (!x?.monteLe || x.niveau < 2) return false;
  const a = new Date(x.monteLe + "T00:00:00").getTime();
  const b = new Date(jourParisIso + "T00:00:00").getTime();
  return b - a <= 6 * 24 * 60 * 60 * 1000 && b >= a;
}

/** « rien gagné depuis 14 jours » : elle avait des XP, plus rien depuis deux semaines. */
export function silencieuse(x: XpApercu | undefined, jourParisIso: string): boolean {
  if (!x?.dernier) return false;
  const a = new Date(x.dernier + "T00:00:00").getTime();
  const b = new Date(jourParisIso + "T00:00:00").getTime();
  return b - a >= 14 * 24 * 60 * 60 * 1000;
}
