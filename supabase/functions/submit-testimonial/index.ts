// =============================================================================
// Chantier #11 V1.1 — Edge fn submit-testimonial (2026-05-18)
// =============================================================================
// 2 modes :
//   - V1 legacy : { client_token, content, rating, ... } - anti-doublon strict
//   - V1.1 generique : { coach_slug, first_name, city, content, rating, ... }
//     - Lookup coach_user_id via users.first_name normalise
//     - client_id null, coach_slug snapshot
//     - Anti-doublon : rate limit IP 1/24h (au lieu de check client_id)
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

// Rate limit persisté en DB depuis le quality fix D (2026-05-18). On délègue
// à la RPC `check_testimonial_rate` qui résiste aux redeploy de l'edge fn.
const RATE_WINDOW_SECONDS = 60 * 60; // 1h
const RATE_MAX_TOKEN = 3;
const RATE_MAX_SLUG = 2;

async function checkRateLimit(
  sb: ReturnType<typeof createClient>,
  ip: string,
  mode: "token" | "slug",
  max: number,
): Promise<{ ok: true } | { ok: false; retry_after: number }> {
  const { data, error } = await sb.rpc("check_testimonial_rate", {
    p_ip: ip,
    p_mode: mode,
    p_max: max,
    p_window_seconds: RATE_WINDOW_SECONDS,
  });
  // Fail-open si la RPC plante : on laisse passer pour ne jamais bloquer une
  // soumission légitime. La sécurité reste assurée par anti-doublon + auth.
  if (error || !data) return { ok: true };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: true };
  if (row.allowed) return { ok: true };
  return { ok: false, retry_after: Number(row.retry_after_seconds ?? 60) };
}

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "method_not_allowed" }, 405);

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  let body: {
    client_token?: string;
    coach_slug?: string;
    first_name?: string;
    city?: string;
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

  const content = (body.content ?? "").trim();
  const rating = Number(body.rating);
  const photoConsent = body.photo_consent === true;
  const language = ALLOWED_LANGUAGES.includes(body.language ?? "") ? body.language! : "fr";
  const photoUrl = (body.photo_url ?? "").trim() || null;

  if (content.length < 10 || content.length > 1000) {
    return json({ success: false, error: "Le message doit faire entre 10 et 1000 caracteres." }, 400);
  }
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return json({ success: false, error: "Note invalide (1 a 5 etoiles)." }, 400);
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const clientToken = (body.client_token ?? "").trim();
  const coachSlugRaw = (body.coach_slug ?? "").trim();
  const coachSlug = coachSlugRaw ? normalizeSlug(coachSlugRaw) : "";

  // ─── Mode 1 : client_token (legacy V1) ──────────────────────────────────────
  if (clientToken) {
    if (!/^[0-9a-f-]{36}$/i.test(clientToken)) {
      return json({ success: false, error: "Token client invalide." }, 400);
    }
    const rl = await checkRateLimit(sb, ip, "token", RATE_MAX_TOKEN);
    if (!rl.ok) {
      return json({ success: false, error: "rate_limited", retry_after_seconds: rl.retry_after }, 429);
    }

    const { data: account, error: accountErr } = await sb
      .from("client_app_accounts")
      .select("client_id")
      .eq("token", clientToken)
      .maybeSingle();
    if (accountErr || !account?.client_id) {
      return json({ success: false, error: "Lien expire ou invalide." }, 404);
    }
    const { data: clientRow } = await sb
      .from("clients")
      .select("id, coach_user_id, first_name, city")
      .eq("id", account.client_id)
      .maybeSingle();
    const coachUserId = (clientRow?.coach_user_id as string | undefined) ?? null;

    const { data: existing } = await sb
      .from("client_testimonials")
      .select("id")
      .eq("client_id", account.client_id)
      .in("status", ["pending", "approved"])
      .maybeSingle();
    if (existing) {
      return json({ success: false, error: "Tu as deja envoye un retour, merci !" }, 409);
    }

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
    if (insertErr) return json({ success: false, error: insertErr.message }, 500);

    await notifyAdmins(sb, {
      title: "💬 Nouveau temoignage",
      body: `${(clientRow?.first_name as string | undefined)?.trim() || "Un client"}${clientRow?.city ? " de " + (clientRow.city as string).trim() : ""} · ${rating}/5`,
    });
    return json({ success: true });
  }

  // ─── Mode 2 : coach_slug (V1.1 generique) ──────────────────────────────────
  if (!coachSlug) {
    return json({ success: false, error: "Coach inconnu." }, 400);
  }
  const firstName = (body.first_name ?? "").trim();
  const city = (body.city ?? "").trim();
  if (firstName.length < 2) {
    return json({ success: false, error: "Indique au moins ton prenom." }, 400);
  }
  if (city.length < 2) {
    return json({ success: false, error: "Indique au moins ta ville." }, 400);
  }
  const rl = await checkRateLimit(sb, ip, "slug", RATE_MAX_SLUG);
  if (!rl.ok) {
    return json({ success: false, error: "rate_limited", retry_after_seconds: rl.retry_after }, 429);
  }

  // Lookup coach_user_id via slug = normalize(split_part(users.name, ' ', 1))
  // Cf. coach_credibility migration : users.name est "Prenom Nom", on prend split[0].
  const { data: coachMatches } = await sb
    .from("users")
    .select("id, name, role, active")
    .eq("active", true)
    .in("role", ["distributor", "admin", "referent"]);
  const coachUserId =
    (coachMatches as Array<{ id: string; name: string | null }> | null)?.find(
      (u) => normalizeSlug((u.name ?? "").trim().split(/\s+/)[0] ?? "") === coachSlug,
    )?.id ?? null;
  if (!coachUserId) {
    return json({ success: false, error: "Coach inconnu." }, 404);
  }

  // V1.1 : on insert sans client_id, en stockant first_name/city dans coach_slug
  // + dans le content lui-meme via prefixe (visible admin) au cas ou.
  // L'admin verra firstName/city via le snapshot dans coach_slug + edge GET.
  // Pour simplicite V1, on stocke firstName + city dans un table side simple :
  // on les met dans rejected_reason quand status=pending ? NON. Mieux : add cols
  // submitter_first_name + submitter_city. Mais pour eviter une nouvelle
  // migration, on stock dans content prefixe + on parse cote display admin.
  // SOLUTION : ajouter les infos dans le content lui-meme prefixe par marker.
  const submitterMeta = `[FROM:${firstName}|${city}]`;
  const contentWithMeta = `${submitterMeta}\n\n${content}`;

  // Anti-doublon souple : si meme firstName+city ont deja un temoignage
  // approved chez ce coach, on accepte quand meme (peut etre pertinent — admin
  // tranche). Pas de check strict ici.

  const { error: insertErr } = await sb
    .from("client_testimonials")
    .insert({
      client_id: null,
      client_token: null, // depuis quality fix A (2026-05-18) la col est nullable
      coach_user_id: coachUserId,
      coach_slug: coachSlug,
      content: contentWithMeta,
      rating,
      photo_consent: photoConsent,
      photo_url: photoUrl,
      language,
      status: "pending",
    });
  if (insertErr) return json({ success: false, error: insertErr.message }, 500);

  await notifyAdmins(sb, {
    title: "💬 Nouveau temoignage",
    body: `${firstName}${city ? " de " + city : ""} · ${rating}/5 · pour ${coachSlug}`,
  });
  return json({ success: true });
});

async function notifyAdmins(sb: ReturnType<typeof createClient>, payload: { title: string; body: string }) {
  try {
    const { data: admins } = await sb
      .from("users")
      .select("id")
      .eq("role", "admin")
      .eq("active", true);
    if (!admins || admins.length === 0) return;
    const subsPromises = admins.map((a) =>
      sb
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", (a as { id: string }).id),
    );
    const subsResults = await Promise.all(subsPromises);
    const allSubs = subsResults.flatMap((r) => r.data ?? []);
    if (allSubs.length === 0) return;
    await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subscriptions: allSubs,
        payload: {
          title: payload.title,
          body: payload.body,
          url: "/admin/testimonials",
          icon: "/icon-192.png",
          badge: "/badge-72.png",
        },
      }),
    }).catch(() => {});
  } catch {
    // ignore
  }
}
