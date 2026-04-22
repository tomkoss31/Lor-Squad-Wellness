// Chantier Messagerie bidirectionnelle (2026-04-22)
// Edge Function : notif push au CLIENT quand son coach lui répond.
//
// Déclenchée par le trigger Postgres notify_new_coach_message
// (AFTER INSERT ON client_messages WHERE sender='coach').
//
// Body attendu : { message_id, client_id, distributor_id }.
// Réponse : { ok: true, result: SendPushResult }.
//
// Deploy: supabase functions deploy new-coach-message-notifier

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getServiceClient,
  sendPushToClient,
  corsHeaders,
  jsonResponse,
} from "../_shared/push.ts";

function truncate(input: string, max: number): string {
  if (input.length <= max) return input;
  return input.slice(0, max - 1).trimEnd() + "…";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const sb = getServiceClient();

  try {
    const payload = (await req.json().catch(() => ({}))) as {
      message_id?: string;
      client_id?: string;
      distributor_id?: string;
    };

    const messageId = payload.message_id;
    const clientId = payload.client_id;

    if (!messageId || !clientId) {
      return jsonResponse({ error: "message_id et client_id requis" }, 400);
    }

    // Lookup message complet (pour le body).
    const { data: msg, error: msgErr } = await sb
      .from("client_messages")
      .select("id, sender, message, message_type")
      .eq("id", messageId)
      .maybeSingle();

    if (msgErr) return jsonResponse({ error: msgErr.message }, 500);
    if (!msg) return jsonResponse({ error: "Message introuvable" }, 404);
    if (msg.sender !== "coach") {
      // Safety : on ne notifie que les messages coach → client. Le trigger
      // filtre déjà, double vérif ici pour robustesse.
      return jsonResponse({ ok: true, skipped: "not_coach_message" });
    }

    // Lookup coach (pour le titre "Thomas t'a répondu").
    let coachFirstName = "Ton coach";
    if (payload.distributor_id) {
      const { data: coach } = await sb
        .from("users")
        .select("name")
        .eq("id", payload.distributor_id)
        .maybeSingle();
      if (coach?.name) {
        coachFirstName = coach.name.trim().split(/\s+/)[0] || "Ton coach";
      }
    }

    const bodyText = msg.message?.trim()
      ? truncate(msg.message.trim(), 80)
      : "Nouveau message";

    // Lookup client_app_accounts pour récupérer le token (permet au client
    // de cliquer la notif et atterrir directement sur SON app).
    const { data: account } = await sb
      .from("client_app_accounts")
      .select("token")
      .eq("client_id", clientId)
      .maybeSingle();

    const url = account?.token
      ? `/client/${account.token}?tab=messages`
      : "/";

    const result = await sendPushToClient(sb, clientId, {
      title: `💬 ${coachFirstName} t'a répondu`,
      body: bodyText,
      url,
      type: "coach_message",
    });

    return jsonResponse({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return jsonResponse({ error: message }, 500);
  }
});
