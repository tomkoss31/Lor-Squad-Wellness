// =============================================================================
// La lecture étroite : QUAND un collègue est pris, jamais AVEC QUI.
//
// Mesuré le 01/09 en simulant le jeton de Maria (rôle « distributor ») : elle
// lit 1 utilisateur (elle-même), 0 client de Mélanie, 0 prospect, 0 rendez-vous.
// Elle ne peut donc RIEN voir aujourd'hui — le mur n'est pas à l'écran, il est
// dans les droits.
//
// On n'élargit PAS ces droits : ces tables portent des noms, des motifs de
// rendez-vous, des objectifs de perte de poids. Ouvrir l'agenda ne doit pas
// ouvrir les dossiers. Deux fonctions serveur répondent donc à deux questions
// précises et à rien d'autre (migration 20261215290000) :
//   · `coachs_joignables()`  → id + PRÉNOM des coachs actifs
//   · `creneaux_occupes(...)` → des couples [début, fin], sans une seule autre
//     colonne : ni nom, ni motif, ni type de rendez-vous.
//
// Règle de Thomas, mot pour mot : « les coachs voient bien les créneaux libres,
// les créneaux avec RDV, mais PAS l'info du lead ! »
// =============================================================================

import { getSupabaseClient } from "../supabaseClient";
import type { Plage } from "../../features/agenda/creneauxLibres";

export interface CoachJoignable {
  id: string;
  prenom: string;
}

/** Les coachs à qui l'on peut proposer un rendez-vous. Liste vide si indisponible. */
export async function lireCoachsJoignables(): Promise<CoachJoignable[]> {
  try {
    const sb = await getSupabaseClient();
    if (!sb) return [];
    const { data, error } = await sb.rpc("coachs_joignables");
    if (error) {
      console.warn("[agenda] coachs joignables indisponibles :", error.message);
      return [];
    }
    return ((data ?? []) as Array<{ id: string; prenom: string }>).map((r) => ({
      id: r.id,
      prenom: r.prenom,
    }));
  } catch (e) {
    console.warn("[agenda] coachs joignables indisponibles :", e);
    return [];
  }
}

/**
 * Les plages où ce coach est pris, entre deux dates.
 *
 * ⚠️ EN CAS D'ÉCHEC, ON REND `null`, PAS UN TABLEAU VIDE. La différence est
 * tout sauf cosmétique : une liste vide veut dire « sa journée est libre » et
 * ferait proposer des créneaux au hasard sur l'agenda de quelqu'un d'autre.
 * `null` veut dire « je ne sais pas », et l'écran doit alors refuser de
 * proposer quoi que ce soit.
 */
export async function lireCreneauxOccupes(
  coachId: string,
  du: Date,
  au: Date,
): Promise<Plage[] | null> {
  try {
    const sb = await getSupabaseClient();
    if (!sb) return null;
    const { data, error } = await sb.rpc("creneaux_occupes", {
      p_coach: coachId,
      p_du: du.toISOString(),
      p_au: au.toISOString(),
    });
    if (error) {
      console.warn("[agenda] créneaux occupés indisponibles :", error.message);
      return null;
    }
    return ((data ?? []) as Array<{ debut: string; fin: string }>)
      .map((r) => ({ debut: new Date(r.debut), fin: new Date(r.fin) }))
      .filter((p) => !Number.isNaN(p.debut.getTime()) && !Number.isNaN(p.fin.getTime()));
  } catch (e) {
    console.warn("[agenda] créneaux occupés indisponibles :", e);
    return null;
  }
}
