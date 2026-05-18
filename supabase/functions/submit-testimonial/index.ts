// =============================================================================
// Chantier #11 — Edge fn submit-testimonial (2026-05-18)
// =============================================================================
// POST publique sans auth Supabase. Valide le client_token contre
// client_app_accounts.token (lookup → client_id + coach_user_id). Insert
// status=pending, snapshot client_token. Notif push admin best-effort.
//
// Input :
//   {
//     client_token: string (uuid),
//     content: string (10..1000),
//     rating: int (1..5),
//     photo_consent?: boolean,
//     language?: string (default 'fr'),
//     photo_url?: string (V2)
//   }
// Output : { success: true } | { success: false, error }
//
// Anti-doublon : refus si un temoignage approved OU pending existe deja.
// Rate limit : 3/h par IP.
//
// Deploy : supabase functions deploy submit-testimonial --no-verify-jwt
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ALLOWED_LANGUAGES = ["fr", "en", "es", "pt", "tr", "hi", "de", "it", "ar"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const RATE_BUCKET = new Map<string, number[]>();
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = 3;
function checkRateLimit(ip: string): { ok: true } | { ok: false; retry_after: number } {
  const now = Date.now();
  const history = (RATE_BUCKET.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (history.length >= RATE_MAX) {
    return { ok: false, retry_after: Math.ceil((history[0] + RATE_WINDOW_MS - now) / 1000) };
  }
  history.push(now);
  RATE_BUCKET.set(ip, history);
  return { ok: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "method_not_allowed" }, 405);

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    return json({ success: false, error: "rate_limited", retry_after_seconds: rl.retry_after }, 429);
  }

  let body: {
    client_token?: string;
    content?: string;
    rating?: number;
    photo_consent?: boolean;
    language?: string;
    photo_url?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "invalid_json" }, 400);
  }

  const clientToken = (body.client_token ?? "").trim();
  const content = (body.content ?? "").trim();
  const rating = Number(body.rating);
  const photoConsent = body.photo_consent === true;
  const language = ALLOWED_LANGUAGES.includes(body.language ?? "") ? body.language! : "fr";
  const photoUrl = (body.photo_url ?? "").trim() || null;

  if (!clientToken || !/^[0-9a-f-]{36}$/i.test(clientToken)) {
    return json({ success: false, error: "Token client invalide." }, 400);
  }
  if (content.length < 10 || content.length > 1000) {
    return json({ success: false, error: "Le message doit faire entre 10 et 1000 caracteres." }, 400);
  }
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return json({ success: false, error: "Note invalide (1 a 5 etoiles)." }, 400);
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  // Resolution token -> client_id + coach_user_id via client_app_accounts
  const { data: account, error: accountErr } = await sb
    .from("client_app_accounts")
    .select("client_id")
    .eq("token", clientToken)
    .maybeSingle();
  if (accountErr || !account?.client_id) {
    return json({ success: false, error: "Lien expire ou invalide." }, 404);
  }

  // Resolution coach_user_id depuis clients.coach_user_id (ou .owner_user_id selon schema)
  const { data: clientRow } = await sb
    .from("clients")
    .select("id, coach_user_id, first_name, city")
    .eq("id", account.client_id)
    .maybeSingle();
  const coachUserId = (clientRow?.coach_user_id as string | undefined) ?? null;

  // Anti-doublon : refus si pending OU approved deja existant
  const { data: existing } = await sb
    .from("client_testimonials")
    .select("id, status")
    .eq("client_id", account.client_id)
    .in("status", ["pending", "approved"])
    .maybeSingle();
  if (existing) {
    return json({ success: false, error: "Tu as deja envoye un retour, merci !" }, 409);
  }

  // Insert
  const { error: insertErr } = await sb
    .from("client_testimonials")
    .insert({
      client_id: account.client_id,
      client_token: clientToken,
      coach_user_id: coachUserId,
      content,
      rating,
      photo_consent: photoConsent,
      photo_url: photoUrl,
      language,
      status: "pending",
    });
  if (insertErr) {
    return json({ success: false, error: insertErr.message }, 500);
  }

  // Notif push admin (best-effort, non-bloquant)
  try {
    const { data: admins } = await sb
      .from("users")
      .select("id")
      .eq("role", "admin")
      .eq("active", true);
    if (admins && admins.length > 0) {
      const subsPromises = admins.map((a) =>
        sb
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth")
          .eq("user_id", (a as { id: string }).id),
      );
      const subsResults = await Promise.all(subsPromises);
      const allSubs = subsResults.flatMap((r) => r.data ?? []);
      if (allSubs.length > 0) {
        const firstName = (clientRow?.first_name as string | undefined)?.trim() || "Un client";
        const city = (clientRow?.city as string | undefined)?.trim();
        await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SERVICE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subscriptions: allSubs,
            payload: {
              title: "💬 Nouveau temoignage",
              body: `${firstName}${city ? " de " + city : ""} · ${rating}/5`,
              url: "/admin/testimonials",
              icon: "/icon-192.png",
              badge: "/badge-72.png",
            },
          }),
        }).catch(() => {});
      }
    }
  } catch {
    // ignore notif failure
  }

  return json({ success: true, message: "Merci ! Ton retour est envoye." });
});
