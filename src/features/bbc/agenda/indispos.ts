// =============================================================================
// « Pas dispo » — poser et libérer une plage où l'on ne cale rien.
//
// Table `coach_unavailabilities` (18/09/2026). Pas de fonction en base ici, à
// la différence de « caler » et « qualifier » : il n'y a aucun invariant à
// tenir (deux « pas dispo » qui se chevauchent ne gênent personne), et les
// policies disent déjà tout — dans le club, chacune pose ou libère, pour elle
// ou pour une autre (Thomas, 17/09 : « comme TimeTree »).
//
// Ce que ça change ailleurs, sans une ligne de plus ici : `creneaux_occupes`
// ne propose plus ces heures, `caler_rdv_club` les refuse, et le site retire
// une place par coach absente.
// =============================================================================

import { getSupabaseClient } from "../../../services/supabaseClient";

export type ResultatIndispo = { ok: true } | { ok: false; message: string };

const REFUS = "Impossible d'enregistrer — vérifie ta connexion, puis réessaie.";

export async function poserIndispo(d: { coachId: string; debut: Date; fin: Date; note?: string | null }): Promise<ResultatIndispo> {
  try {
    const sb = await getSupabaseClient();
    if (!sb) return { ok: false, message: REFUS };
    const { error } = await sb.from("coach_unavailabilities").insert({
      user_id: d.coachId,
      starts_at: d.debut.toISOString(),
      ends_at: d.fin.toISOString(),
      note: d.note?.trim() || null,
    });
    if (error) return { ok: false, message: REFUS };
    return { ok: true };
  } catch {
    return { ok: false, message: REFUS };
  }
}

export async function libererIndispo(id: string): Promise<ResultatIndispo> {
  try {
    const sb = await getSupabaseClient();
    if (!sb) return { ok: false, message: REFUS };
    // `select()` : un DELETE refusé par le RLS répond « 0 ligne » sans erreur
    // (règle 4 de l'audit du 29/07) — on ne dit « libéré » que si une ligne est partie.
    const { data, error } = await sb.from("coach_unavailabilities").delete().eq("id", id).select("id");
    if (error || !Array.isArray(data) || data.length === 0) return { ok: false, message: "Impossible de libérer ce créneau — réessaie." };
    return { ok: true };
  } catch {
    return { ok: false, message: "Impossible de libérer ce créneau — réessaie." };
  }
}
