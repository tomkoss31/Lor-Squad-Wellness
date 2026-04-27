// Chantier Academy refonte premium — vague finale (2026-04-27).
// Helper qui retourne un client_id utilisable pour les demos Academy.
// Strategie :
//   1. Cherche un client "DemoAcademy" dedie pour ce distributeur
//   2. Sinon, retourne le premier client existant
//   3. Sinon, retourne null (le tour gere ce cas en fallback)

import { getSupabaseClient } from "../../../services/supabaseClient";

export async function getDemoClientId(distributorUserId?: string | null): Promise<string | null> {
  try {
    const sb = await getSupabaseClient();
    if (!sb) return null;

    // Si distributorUserId pas fourni, le recuperer depuis la session auth.
    let distrId = distributorUserId ?? null;
    if (!distrId) {
      const { data: authData } = await sb.auth.getUser();
      distrId = authData?.user?.id ?? null;
    }
    if (!distrId) return null;

    // Tentative 1 : client demo dedie
    const { data: demoClient } = await sb
      .from("clients")
      .select("id")
      .eq("distributor_id", distrId)
      .eq("first_name", "DemoAcademy")
      .maybeSingle();
    if (demoClient && (demoClient as { id: string }).id) {
      return (demoClient as { id: string }).id;
    }

    // Tentative 2 : premier client existant
    const { data: firstClient } = await sb
      .from("clients")
      .select("id")
      .eq("distributor_id", distrId)
      .limit(1)
      .maybeSingle();
    if (firstClient && (firstClient as { id: string }).id) {
      return (firstClient as { id: string }).id;
    }

    return null;
  } catch (err) {
    console.warn("[getDemoClientId] failed:", err);
    return null;
  }
}
