// =============================================================================
// notify-referral-converted — push de gratification au client parrain quand
// sa recommandation convertit (wagon 2 chantier 5, 2026-06-10).
//
// Appelée fire-and-forget par le CRM coach (useCrmLeads.updateStatus) quand
// une reco / intention passe en "converted". Boucle de gratification :
// « 🎉 Léa a démarré grâce à toi ! » → le parrain recommande à nouveau.
//
// Body : { parrain_client_id: string, prospect_first_name: string }
// Push via client_push_subscriptions (sendPushToClient) — silencieux si le
// parrain n'a pas activé les notifs PWA.
//
// Déploiement : supabase functions deploy notify-referral-converted
// (JWT vérifié par défaut — appelée depuis l'app coach authentifiée… avec
// l'anon key Bearer, comme les autres fonctions front).
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getServiceClient,
  sendPushToClient,
  corsHeaders,
  jsonResponse,
} from "../_shared/push.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "POST only" }, 405);
  }

  try {
    const payload = (await req.json()) as {
      parrain_client_id?: string;
      prospect_first_name?: string;
    };
    const parrainClientId = (payload.parrain_client_id ?? "").trim();
    const prospectFirstName = (payload.prospect_first_name ?? "").trim();

    if (!parrainClientId) {
      return jsonResponse({ error: "parrain_client_id requis" }, 400);
    }

    const sb = getServiceClient();

    // Token du parrain pour que la notif ouvre directement SA PWA.
    const { data: account } = await sb
      .from("client_app_accounts")
      .select("token")
      .eq("client_id", parrainClientId)
      .maybeSingle();

    const url = account?.token ? `/client/${account.token}?tab=refer` : "/";
    const who = prospectFirstName || "ta recommandation";

    const result = await sendPushToClient(sb, parrainClientId, {
      title: "🎉 Ta reco a porté ses fruits !",
      body: `${who} vient de démarrer grâce à toi. Merci — ta remise te dit merci aussi 👑`,
      url,
      type: "referral_converted",
    });

    return jsonResponse({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.warn("[notify-referral-converted]", message);
    return jsonResponse({ error: message }, 500);
  }
});
