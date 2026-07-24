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

export async function setClientEbeBbc(clientId: string, value: boolean): Promise<boolean> {
  const sb = await getSupabaseClient();
  if (!sb) throw new Error("Supabase indisponible");
  const { error } = await sb.from("clients").update({ ebe_bbc: value }).eq("id", clientId);
  if (error) throw error;
  return value;
}
