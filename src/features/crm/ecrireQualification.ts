// =============================================================================
// ecrireQualification — un seul endroit qui écrit « et alors ? » en base.
//
// La feuille est posée à TROIS endroits (Co-pilote au retour du message, ligne
// du CRM, fiche du lead). Trois copies de l'écriture, c'est trois occasions de
// diverger — et la divergence ici ne se voit pas : elle se traduit par
// quelqu'un qui ne remonte jamais.
//
// ⚠️ Seules `prospect_leads` et `online_bilans` portent les colonnes de
// relance. Les recos et intentions clients n'ont pas d'échéance : elles se
// qualifient encore par leur statut, et la feuille ne leur est pas proposée.
// =============================================================================

import { getSupabaseClient } from "../../services/supabaseClient";
import { ecritureFor, type Reponse } from "./qualification";

export type TableQualifiable = "prospect_leads" | "online_bilans";

export function estQualifiable(table: string): table is TableQualifiable {
  return table === "prospect_leads" || table === "online_bilans";
}

/**
 * Les valeurs de statut réellement acceptées en base, par table. Vérifiées
 * dans `pg_constraint` — pas devinées.
 *
 * ⚠️ Les deux tables ne parlent PAS la même langue, et c'est ce qui a cassé :
 *   · `online_bilans` n'a même pas de colonne `status` (elle s'appelle
 *     `lead_status`) et dit « contact », pas « contacted ».
 *   · `prospect_leads` n'accepte pas « qualified » du tout.
 * Un statut hors liste fait rejeter TOUT l'update — donc la date de relance
 * avec. La personne semble qualifiée à l'écran et ne revient jamais.
 */
const STATUTS_ACCEPTES: Record<TableQualifiable, readonly string[]> = {
  prospect_leads: ["new", "contacted", "to_recontact", "converted", "lost"],
  online_bilans: ["new", "contact", "qualified", "to_recontact", "relance", "lost"],
};

/** Traduit un statut de la feuille vers le vocabulaire de la table. */
export function statutPour(table: TableQualifiable, statut: string): string {
  if (table === "online_bilans") {
    return statut === "contacted" ? "contact" : statut;
  }
  // prospect_leads ne connaît pas « qualified » : un RDV calé s'y range en
  // « contacted » (c'est déjà ce que fait le menu de statut du CRM).
  return statut === "qualified" ? "contacted" : statut;
}

/** La colonne qui porte le statut dans cette table. */
export function colonneStatut(table: TableQualifiable): "status" | "lead_status" {
  return table === "online_bilans" ? "lead_status" : "status";
}

export function statutAccepte(table: TableQualifiable, statut: string): boolean {
  return STATUTS_ACCEPTES[table].includes(statut);
}

/** Le patch exact envoyé à Supabase. Séparé de l'appel réseau pour être testé. */
export function patchQualification(
  table: TableQualifiable,
  reponse: Reponse,
  maintenant: Date,
): Record<string, unknown> {
  const { status, ...reste } = ecritureFor(reponse, maintenant);
  return { ...reste, [colonneStatut(table)]: statutPour(table, status) };
}

/**
 * Écrit la qualification. Rend `null` si tout s'est bien passé, sinon le
 * message d'erreur — l'appelant décide quoi en faire (toast, rollback).
 *
 * ⚠️ LE `.select()` N'EST PAS DÉCORATIF (revue d'avant-prod, 31/08).
 * Un `update` que la RLS refuse ne renvoie AUCUNE erreur : il touche zéro
 * ligne, et PostgREST répond 204. Sans `.select()`, l'app affichait donc
 * « Marie revient mardi » sur une écriture qui n'avait jamais eu lieu — et
 * Marie ne revenait jamais. C'est très exactement le trou que ce chantier
 * ferme partout ailleurs. Le seul moyen de le voir est de demander la ligne
 * en retour et de compter ce qu'on récupère.
 */
export async function ecrireQualification(
  table: TableQualifiable,
  id: string,
  reponse: Reponse,
  maintenant: Date = new Date(),
): Promise<string | null> {
  try {
    const sb = await getSupabaseClient();
    if (!sb) return "Service indisponible.";
    const { data, error } = await sb
      .from(table)
      .update(patchQualification(table, reponse, maintenant))
      .eq("id", id)
      .select("id");
    if (error) return error.message;
    if (!data || data.length === 0) {
      return "Cette fiche n'a pas été modifiée — elle ne t'appartient peut-être plus. Recharge la page.";
    }
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Écriture impossible.";
  }
}
