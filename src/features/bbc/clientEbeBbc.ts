// =============================================================================
// clientEbeBbc — lecture/écriture du drapeau clients.ebe_bbc (chantier BBC).
// Isolé : n'utilise PAS AppContext (fichier sacré). Écrit directement via le
// client supabase authentifié du coach (RLS : le coach gère ses clients, même
// chemin que les toggles fragile / suivi libre existants).
// =============================================================================

import { getSupabaseClient } from "../../services/supabaseClient";

export async function getClientEbeBbc(clientId: string): Promise<boolean> {
  try {
    const sb = await getSupabaseClient();
    if (!sb) return false;
    const { data } = await sb.from("clients").select("ebe_bbc").eq("id", clientId).maybeSingle();
    return Boolean((data as { ebe_bbc?: boolean } | null)?.ebe_bbc);
  } catch {
    return false;
  }
}

/**
 * Passe un client en membre BBC (ou l'en retire).
 *
 * Rattache AUSSI le client au club du coach : sans `clients.club_id`, un membre
 * existe sans club — la carte du bar, les réglages et Noaly n'ont alors aucune
 * config à lire. Le drapeau et le rattachement vont donc ensemble, toujours.
 */
export async function setClientEbeBbc(clientId: string, value: boolean): Promise<boolean> {
  const sb = await getSupabaseClient();
  if (!sb) throw new Error("Supabase indisponible");

  let clubId: string | null = null;
  if (value) {
    const { data: auth } = await sb.auth.getUser();
    const uid = auth?.user?.id;
    if (uid) {
      // Le club qu'on POSSÈDE d'abord.
      const { data: club } = await sb
        .from("clubs")
        .select("id")
        .eq("owner_user_id", uid)
        .eq("active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      clubId = (club as { id?: string } | null)?.id ?? null;

      // Sinon celui où l'on TRAVAILLE (`users.club_id`, migration du 17/08).
      // Sans ce repli, un coach qui ne possède pas le club — Mélanie, sur le
      // seul club de l'équipe — créait des membres sans `club_id`, donc sans
      // aucun réglage de club dans leur application. En silence : la recherche
      // ne renvoyait rien, et rien ne renvoyait d'erreur.
      if (!clubId) {
        const { data: moi } = await sb
          .from("users")
          .select("club_id")
          .eq("id", uid)
          .maybeSingle();
        clubId = (moi as { club_id?: string | null } | null)?.club_id ?? null;
      }
    }
  }

  // On ne remet jamais club_id à null en retirant le drapeau : le client peut
  // repasser membre plus tard, et l'historique de visites reste rattaché au club.
  const patch: Record<string, unknown> = { ebe_bbc: value };
  if (value && clubId) patch.club_id = clubId;

  const { error } = await sb.from("clients").update(patch).eq("id", clientId);
  if (error) throw error;
  return value;
}
