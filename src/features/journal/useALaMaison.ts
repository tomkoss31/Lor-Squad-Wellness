// =============================================================================
// « À la maison » dans son journal (lot 5 du comptoir, 26/09/2026).
//
// Ce qu'elle a emporté du club, ses jours au club, ce qu'elle a noté et les
// horaires du club : `journal_a_la_maison` (fonction à jeton, comme journal_jour).
// Le calcul est celui de la fiche du club (bbc/caisse/maison.ts). Un plus : s'il
// échoue, le journal marche comme avant, sans compteur ni « tes sachets du club ».
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import type { ReglagesHoraires } from "../bbc/agenda/agendaClub";
import { lireHoraires, lireMaison, type DonneesMaison } from "../bbc/caisse/maison";
import { journalMembre } from "./journalApi";

export interface ALaMaison {
  maison: DonneesMaison | null;
  horaires: ReglagesHoraires | null;
}

/** `actif` = false : aucun appel (l'espace standard, ou pas de petit-déj à noter). */
export function useALaMaison(token: string | undefined, actif: boolean): ALaMaison | null {
  const [donnees, setDonnees] = useState<ALaMaison | null>(null);

  const charger = useCallback(async () => {
    if (!token || !actif) return;
    try {
      const brut = await journalMembre.aLaMaison(token);
      const o = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;
      setDonnees({ maison: lireMaison(o.maison), horaires: lireHoraires(o.horaires) });
    } catch {
      /* un plus : sans lui, le journal marche comme avant */
    }
  }, [token, actif]);

  useEffect(() => {
    void charger();
  }, [charger]);

  // Retour sur l'app : elle a pu passer au club (un achat, un pointage).
  useEffect(() => {
    if (!actif) return;
    const revoir = () => {
      if (document.visibilityState === "visible") void charger();
    };
    document.addEventListener("visibilitychange", revoir);
    return () => document.removeEventListener("visibilitychange", revoir);
  }, [actif, charger]);

  return actif ? donnees : null;
}
