// Chantier Academy section 1 finalisation (2026-04-27).
// Helper async qui lit le role du user authentifie depuis Supabase.
// Utilise par les routeBuilder de la section welcome pour choisir
// /parametres (admin) vs /settings (autres).

import { getSupabaseClient } from "../../../services/supabaseClient";
import { lireMonProfil } from "../../../services/monProfil";

export async function getCurrentUserRole(): Promise<string | null> {
  try {
    const sb = await getSupabaseClient();
    if (!sb) return null;
    const { data: authData } = await sb.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) return null;
    // Passe par le cache partagé : sept endroits lisaient cette même ligne au
    // démarrage, chacun pour une colonne (audit 2026-08-12).
    const profil = await lireMonProfil(userId);
    return profil?.role ?? null;
  } catch (err) {
    console.warn("[getCurrentUserRole] failed:", err);
    return null;
  }
}
