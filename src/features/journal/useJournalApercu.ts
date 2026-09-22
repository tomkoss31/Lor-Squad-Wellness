// =============================================================================
// useJournalApercu — qui tient son journal, vu du coach (22/09/2026).
//
// Partagé par la carte du Co-pilote et l'écran « Co-pilote › Journal » : UN
// appel pour les deux, gardé deux minutes (carte → écran → retour sans retaper
// la base, qui tourne sur un Nano). Le cache est rattaché à la personne
// connectée ET au jour de Paris :
//   · un changement de compte dans le même onglet ne montre jamais les
//     clientes de l'autre ;
//   · un écran resté ouvert la nuit recharge au changement de jour (l'heure
//     doit être vivante, cf. useMaintenant) — sinon les cases de la semaine
//     glisseraient d'un cran sur des chiffres de la veille.
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { useMaintenant } from "../bbc/agenda/useMaintenant";
import { journalCoach } from "./journalApi";
import { jourParis, normaliserApercu, type ApercuJournal } from "./apercuJournal";

const DUREE_CACHE_MS = 2 * 60 * 1000;
let cache: { cle: string; a: number; donnees: ApercuJournal[] } | null = null;
let enCours: { cle: string; promesse: Promise<ApercuJournal[]> } | null = null;

function charger(cle: string, force: boolean): Promise<ApercuJournal[]> {
  if (!force && cache && cache.cle === cle && Date.now() - cache.a < DUREE_CACHE_MS) {
    return Promise.resolve(cache.donnees);
  }
  if (enCours && enCours.cle === cle) return enCours.promesse;
  const promesse = journalCoach
    .apercu()
    .then((brut) => {
      const donnees = normaliserApercu(brut);
      cache = { cle, a: Date.now(), donnees };
      return donnees;
    })
    .finally(() => {
      if (enCours?.promesse === promesse) enCours = null;
    });
  enCours = { cle, promesse };
  return promesse;
}

export function useJournalApercu(userId: string | null | undefined) {
  const jour = jourParis(useMaintenant());
  const cle = userId ? `${userId}|${jour}` : "";
  const [etat, setEtat] = useState<{ cle: string; donnees: ApercuJournal[] } | null>(() =>
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
        setErreur(e instanceof Error ? e.message : "Le journal ne répond pas pour le moment.");
      }
    },
    [cle],
  );

  useEffect(() => {
    void recharger(false);
  }, [recharger]);

  // Des données d'une autre personne ou de la veille ne s'affichent jamais, même une seconde.
  const donnees = etat && etat.cle === cle ? etat.donnees : null;
  return { donnees, erreur, recharger, jour };
}
