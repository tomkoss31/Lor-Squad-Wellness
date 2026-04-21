// Chantier Notifications push complètes (2026-04-21)
// Module partagé : envoi d'une push notif + déduplication via
// push_notifications_sent.
//
// Utilisé par morning-suivis-digest, rdv-imminent-notifier et
// new-message-notifier pour éviter la duplication de code web-push.

import webpush from "npm:web-push@3.6.7";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_EMAIL = Deno.env.get("VAPID_EMAIL") ?? "mailto:coach@lorsquad.com";
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export function getServiceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  type?: string;
}

export type EntityType =
  | "followup"
  | "prospect_meeting"
  | "client_message"
  | "morning_digest";

export interface SendPushOptions {
  userId: string;
  payload: PushPayload;
  dedupe?: {
    entityId: string;
    entityType: EntityType;
    /** Fenêtre en minutes : si une notif existe dans ce délai, skip. */
    windowMinutes: number;
  };
}

export interface SendPushResult {
  sent: boolean;
  reason?: "no_subscription" | "deduped" | "error";
  error?: string;
}

/**
 * Envoie une push notification à un user_id donné, avec déduplication
 * optionnelle via la table push_notifications_sent.
 *
 * Ne throw jamais : retourne un SendPushResult pour permettre au caller
 * d'itérer sans crash sur un user en échec.
 */
export async function sendPushToUser(
  sb: SupabaseClient,
  options: SendPushOptions
): Promise<SendPushResult> {
  const { userId, payload, dedupe } = options;

  try {
    // Dédup : si un log existe pour (user, entity, type) dans la fenêtre,
    // on skippe immédiatement sans hit web-push.
    if (dedupe) {
      const sinceIso = new Date(
        Date.now() - dedupe.windowMinutes * 60 * 1000
      ).toISOString();
      const { data: existing } = await sb
        .from("push_notifications_sent")
        .select("id")
        .eq("user_id", userId)
        .eq("entity_id", dedupe.entityId)
        .eq("entity_type", dedupe.entityType)
        .gte("sent_at", sinceIso)
        .maybeSingle();
      if (existing) {
        return { sent: false, reason: "deduped" };
      }
    }

    // Lookup subscription (schema : user_id text → cast)
    const { data: sub, error: subErr } = await sb
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId)
      .maybeSingle();

    if (subErr || !sub) {
      return { sent: false, reason: "no_subscription" };
    }

    const body = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url ?? "/",
      type: payload.type ?? "info",
    });

    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      body
    );

    // Log après envoi réussi
    if (dedupe) {
      await sb.from("push_notifications_sent").insert({
        user_id: userId,
        entity_id: dedupe.entityId,
        entity_type: dedupe.entityType,
      });
    }

    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return { sent: false, reason: "error", error: message };
  }
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
