// Chantier Notifications push complètes (2026-04-21)
// Module partagé : envoi d'une push notif + déduplication via
// push_notifications_sent.
//
// Utilisé par morning-suivis-digest, rdv-imminent-notifier et
// new-message-notifier pour éviter la duplication de code web-push.
//
// Hotfix 2026-04-21 — Apple compat : aligné sur send-push/index.ts :
//   1. Import via esm.sh (polyfill Node plus fiable en Deno Edge).
//   2. Normalisation VAPID_EMAIL (préfixe mailto: forcé si absent).
//   3. setVapidDetails lazy (1ère utilisation, try/catch).
//   4. Loop sur toutes les subs d'un user (multi-device).
//   5. Cleanup 404/410 Gone (Apple révoque les tokens désinstallés).

import webpush from "https://esm.sh/web-push@3.6.7";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";

function normalizeVapidSubject(raw: string | undefined): string {
  const value = (raw ?? "coach@lorsquad.com").trim();
  if (value.startsWith("mailto:") || value.startsWith("https://")) return value;
  return `mailto:${value}`;
}

const VAPID_SUBJECT = normalizeVapidSubject(Deno.env.get("VAPID_EMAIL"));

let vapidInitialized = false;
let vapidInitError: string | null = null;

function ensureVapid(): void {
  if (vapidInitialized) return;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    vapidInitError = "VAPID keys manquantes (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)";
    return;
  }
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    vapidInitialized = true;
  } catch (err) {
    vapidInitError = err instanceof Error ? err.message : String(err);
  }
}

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
  | "morning_digest"
  | "coach_tip";

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
  reason?: "no_subscription" | "deduped" | "error" | "vapid_invalid";
  error?: string;
  /** Nombre de devices testés + nombre de succès. Utile en log crons. */
  attempts?: number;
  succeeded?: number;
}

/**
 * Envoie une push notification à un user_id donné, avec déduplication
 * optionnelle via la table push_notifications_sent.
 *
 * Ne throw jamais : retourne un SendPushResult pour permettre au caller
 * d'itérer sans crash sur un user en échec.
 *
 * Multi-device : si le user a N subscriptions, on tente chaque endpoint.
 * Si ≥1 succès → sent=true. Les endpoints 404/410 sont supprimés en best
 * effort.
 */
export async function sendPushToUser(
  sb: SupabaseClient,
  options: SendPushOptions,
): Promise<SendPushResult> {
  const { userId, payload, dedupe } = options;

  // Init VAPID lazy pour surfacer une mauvaise config sans crash module-load.
  ensureVapid();
  if (!vapidInitialized) {
    return {
      sent: false,
      reason: "vapid_invalid",
      error: vapidInitError ?? "VAPID non initialisé",
    };
  }

  try {
    // Dédup : si un log existe pour (user, entity, type) dans la fenêtre,
    // on skippe immédiatement sans hit web-push.
    if (dedupe) {
      const sinceIso = new Date(
        Date.now() - dedupe.windowMinutes * 60 * 1000,
      ).toISOString();
      const { data: existing } = await sb
        .from("push_notifications_sent")
        .select("id")
        .eq("user_id", userId)
        .eq("entity_id", dedupe.entityId)
        .eq("entity_type", dedupe.entityType)
        .gte("sent_at", sinceIso)
        .limit(1);
      if (existing && existing.length > 0) {
        return { sent: false, reason: "deduped" };
      }
    }

    // Lookup multi-lignes (drop maybeSingle : plusieurs devices possible).
    const { data: subs, error: subErr } = await sb
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (subErr || !subs || subs.length === 0) {
      return { sent: false, reason: "no_subscription" };
    }

    const body = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url ?? "/",
      type: payload.type ?? "info",
    });

    let succeeded = 0;
    const errors: string[] = [];

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
          { TTL: 60 },
        );
        succeeded += 1;
      } catch (err) {
        const anyErr = err as { statusCode?: number; body?: string; message?: string };
        const code = anyErr.statusCode;
        const detail = anyErr.body || anyErr.message || String(err);
        errors.push(`[${code ?? "?"}] ${detail}`);

        // Cleanup subs stale (endpoint expiré côté push service).
        if (code === 404 || code === 410) {
          await sb.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }

    if (succeeded === 0) {
      return {
        sent: false,
        reason: "error",
        error: errors.join(" | "),
        attempts: subs.length,
        succeeded: 0,
      };
    }

    // Log après au moins un envoi réussi.
    if (dedupe) {
      await sb.from("push_notifications_sent").insert({
        user_id: userId,
        entity_id: dedupe.entityId,
        entity_type: dedupe.entityType,
      });
    }

    return { sent: true, attempts: subs.length, succeeded };
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

/**
 * Chantier Messagerie bidirectionnelle (2026-04-22) : envoi push vers un
 * client (table séparée client_push_subscriptions keyed par client_id).
 * Ne throw jamais. Cleanup 404/410 Gone comme pour les coachs.
 */
export async function sendPushToClient(
  sb: SupabaseClient,
  clientId: string,
  payload: PushPayload,
): Promise<SendPushResult> {
  ensureVapid();
  if (!vapidInitialized) {
    return {
      sent: false,
      reason: "vapid_invalid",
      error: vapidInitError ?? "VAPID non initialisé",
    };
  }

  try {
    const { data: sub, error: subErr } = await sb
      .from("client_push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("client_id", clientId)
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

    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        body,
        { TTL: 60 },
      );
      return { sent: true, attempts: 1, succeeded: 1 };
    } catch (err) {
      const anyErr = err as { statusCode?: number; body?: string; message?: string };
      const code = anyErr.statusCode;
      const detail = anyErr.body || anyErr.message || String(err);
      if (code === 404 || code === 410) {
        await sb.from("client_push_subscriptions").delete().eq("id", sub.id);
      }
      return {
        sent: false,
        reason: "error",
        error: `[${code ?? "?"}] ${detail}`,
        attempts: 1,
        succeeded: 0,
      };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return { sent: false, reason: "error", error: message };
  }
}
