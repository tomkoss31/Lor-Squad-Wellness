// Chantier Academy section 1 finalisation (2026-04-27).
// Helper async qui lit le role du user authentifie depuis Supabase.
// Utilise par les routeBuilder de la section welcome pour choisir
// /parametres (admin) vs /settings (autres).

import { getSupabaseClient } from "../../../services/supabaseClient";

export async function getCurrentUserRole(): Promise<string | null> {
  try {
    const sb = await getSupabaseClient();
    if (!sb) return null;
    const { data: authData } = await sb.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) return null;
    const { data } = await sb
      .from("users")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    return (data as { role?: string } | null)?.role ?? null;
  } catch (err) {
    console.warn("[getCurrentUserRole] failed:", err);
    return null;
  }
}
