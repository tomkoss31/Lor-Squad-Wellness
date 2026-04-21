// Chantier Notifications push (2026-04-21)
// Edge Function : notif temps réel quand un client envoie un message
//
// Déclenchée par le trigger Postgres AFTER INSERT sur client_messages.
// Body attendu : { message_id, client_id, distributor_id }.
//
// Tous les inserts dans client_messages viennent de clients (pages
// publiques RecapPage / NewFollowUpPage / EvolutionReportPage), donc
// pas de filtre sender — on notifie toujours le coach.
//
// Deploy: supabase functions deploy new-message-notifier

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getServiceClient,
  sendPushToUser,
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
    const payload = await req.json().catch(() => ({}));
    const messageId: string | undefined = payload.message_id;
    const clientId: string | undefined = payload.client_id;
    const distributorId: string | undefined = payload.distributor_id;

    if (!messageId || !clientId || !distributorId) {
      return jsonResponse(
        { error: "message_id, client_id et distributor_id requis" },
        400
      );
    }

    // Lookup du message (on vient juste de l'insérer → il existe).
    const { data: msg, error: msgErr } = await sb
      .from("client_messages")
      .select("id, client_name, message_type, message, product_name")
      .eq("id", messageId)
      .maybeSingle();

    if (msgErr) return jsonResponse({ error: msgErr.message }, 500);
    if (!msg) return jsonResponse({ error: "Message introuvable" }, 404);

    // Prénom si possible : client_name = "Prénom Nom". On prend le premier
    // segment pour l'humaniser ("Nouveau message de Julie").
    const firstName = (msg.client_name ?? "").split(" ")[0] || "Client";

    // Corps du push : priorité au message libre, sinon au produit.
    const bodyText = (() => {
      const raw = msg.message?.trim();
      if (raw) return truncate(raw, 80);
      if (msg.message_type === "product_request" && msg.product_name) {
        return `Demande produit : ${truncate(msg.product_name, 60)}`;
      }
      if (msg.message_type === "recommendation") {
        return "Nouvelle recommandation";
      }
      return "Nouveau message";
    })();

    const titleEmoji =
      msg.message_type === "product_request"
        ? "🛒"
        : msg.message_type === "recommendation"
          ? "👥"
          : "💬";

    const result = await sendPushToUser(sb, {
      userId: distributorId,
      payload: {
        title: `${titleEmoji} Nouveau message de ${firstName}`,
        body: bodyText,
        url: `/clients/${clientId}?tab=messages`,
        type: "client_message",
      },
      dedupe: {
        entityId: `message-${messageId}`,
        entityType: "client_message",
        // Un message arrive une seule fois ; dédup courte pour se protéger
        // des doubles triggers en cas de retry Postgres.
        windowMinutes: 30,
      },
    });

    return jsonResponse({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return jsonResponse({ error: message }, 500);
  }
});
