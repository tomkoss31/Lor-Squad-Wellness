// Chantier Welcome Page + Magic Links (2026-04-24).
// Edge Function : soumission formulaire prospect depuis la page Welcome.
// Pas d'auth requise. Anti-spam : rate limit in-memory par IP (3/h).
// Notif push aux admins + référents actifs sur un nouveau lead.
//
// Input  : { first_name: string, phone: string, city?: string }
// Output : { success: true, id } ou { success: false, error }
//
// Deploy: supabase functions deploy submit-prospect-lead

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

// Rate limit in-memory (reset au cold start — suffisant pour V1 anti-spam léger)
const RATE_BUCKET = new Map<string, number[]>();
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1h
const RATE_MAX_PER_WINDOW = 3;

function checkRateLimit(ip: string): { ok: true } | { ok: false; retry_after: number } {
  const now = Date.now();
  const history = (RATE_BUCKET.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (history.length >= RATE_MAX_PER_WINDOW) {
    const oldest = history[0];
    return { ok: false, retry_after: Math.ceil((oldest + RATE_WINDOW_MS - now) / 1000) };
  }
  history.push(now);
  RATE_BUCKET.set(ip, history);
  return { ok: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "method_not_allowed" }, 405);

  // Identifiant IP approximatif (via headers proxy)
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    return json(
      { success: false, error: "rate_limited", retry_after_seconds: rl.retry_after },
      429,
    );
  }

  let body: {
    first_name?: string;
    phone?: string;
    city?: string;
    referrer_user_id?: string;
    source?: string;
    metadata?: unknown;
    // Chantier #7 V2 (2026-05-17) : popup lead capture sur /business
    referral_source?: string;
    consent_recontact?: boolean;
    coach_slug?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    // Chantier Colis (2026-07-08) : email obligatoire sur ce funnel, optionnel ailleurs.
    email?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "invalid_json" }, 400);
  }

  const firstName = (body.first_name ?? "").trim();
  const phone = (body.phone ?? "").trim();
  const city = (body.city ?? "").trim() || null;
  // V2 funnel business 2026-11-07 : tracking referrer + source + metadata
  const referrerUserId = body.referrer_user_id ?? null;
  const source = body.source ?? "welcome_page"; // 'opportunite' | 'simulateur' | 'welcome_page' | 'business' | 'business-leadcapture'
  const metadata = body.metadata ?? null;
  // Chantier #7 V2 (2026-05-17) : popup lead capture sur /business
  const referralSource = (body.referral_source ?? "").trim() || null;
  const consentRecontact = body.consent_recontact === true;
  const coachSlug = (body.coach_slug ?? "").trim() || null;
  const utmSource = (body.utm_source ?? "").trim() || null;
  const utmMedium = (body.utm_medium ?? "").trim() || null;
  const utmCampaign = (body.utm_campaign ?? "").trim() || null;
  const email = (body.email ?? "").trim() || null;

  if (firstName.length < 2) {
    return json({ success: false, error: "Prénom trop court." }, 400);
  }
  if (phone.replace(/\D/g, "").length < 6) {
    return json({ success: false, error: "Téléphone invalide." }, 400);
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ success: false, error: "Email invalide." }, 400);
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  // Résolution coach_slug → referrer_user_id (chantier #7 V2)
  let effectiveReferrerUserId = referrerUserId;
  if (!effectiveReferrerUserId && coachSlug) {
    const { data: coachMatch } = await sb
      .from("users")
      .select("id")
      .eq("slug", coachSlug)
      .maybeSingle();
    if (coachMatch?.id) {
      effectiveReferrerUserId = coachMatch.id as string;
    }
  }

  try {
    const { data: inserted, error: insertErr } = await sb
      .from("prospect_leads")
      .insert({
        first_name: firstName,
        phone,
        email,
        city,
        source,
        status: "new",
        referrer_user_id: effectiveReferrerUserId,
        metadata,
        referral_source: referralSource,
        consent_recontact: consentRecontact,
        coach_slug: coachSlug,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
      })
      .select("id")
      .single();

    if (insertErr) throw insertErr;

    // Notif push aux admins actifs + au coach referrer (best-effort, non
    // bloquant). Upgrade VIP-4 V1.1 (2026-06-10) : avant, seuls les admins
    // étaient notifiés — un distri non-admin ne savait pas qu'un lead était
    // arrivé via SON lien.
    try {
      const { data: admins } = await sb
        .from("users")
        .select("id")
        .eq("role", "admin")
        .eq("active", true);

      const targetIds = new Set<string>((admins ?? []).map((a) => (a as { id: string }).id));
      if (effectiveReferrerUserId) targetIds.add(effectiveReferrerUserId);

      if (targetIds.size > 0) {
        const subsPromises = [...targetIds].map((id) =>
          sb
            .from("push_subscriptions")
            .select("endpoint, p256dh, auth")
            .eq("user_id", id),
        );
        const subsResults = await Promise.all(subsPromises);
        const allSubs = subsResults.flatMap((r) => r.data ?? []);

        // Notif via send-push function (déjà déployée dans le projet)
        if (allSubs.length > 0) {
          // Funnel Opportunité gated (chantier 2026-06) : notif enrichie profil + température.
          const meta = (metadata && typeof metadata === "object") ? metadata as Record<string, unknown> : {};
          const isFunnel = meta.funnel === "opportunite-gated";
          const profileLabel =
            ({ curious: "🔍 Curieux", side_income: "💸 Complément", career_change: "🚀 Reconversion" } as Record<string, string>)[
              String(meta.profile)
            ] ?? "";
          const tempLabel =
            ({ hot: "🔥 chaud", warm: "🟡 tiède", cold: "❄️ froid" } as Record<string, string>)[
              String(meta.temperature)
            ] ?? "";
          const title = isFunnel ? `🚪 Lead opportunité ${tempLabel}`.trim() : "🔥 Nouveau prospect";
          const pushBody = isFunnel
            ? `${firstName}${profileLabel ? ` · ${profileLabel}` : ""} · ${phone}`
            : `${firstName}${city ? " de " + city : ""} · ${phone}`;
          await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
            signal: AbortSignal.timeout(2500),
            method: "POST",
            headers: {
              Authorization: `Bearer ${SERVICE_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              subscriptions: allSubs,
              payload: {
                title,
                body: pushBody,
                // VIP-4 (2026-06-10) : le CRM commun est la destination.
                url: "/crm",
                icon: "/icon-192.png",
                badge: "/badge-72.png",
              },
            }),
          }).catch(() => { /* non bloquant */ });
        }
      }
    } catch (notifErr) {
      console.error("[submit-prospect-lead] Notif non critique:", notifErr);
    }

    return json({ success: true, id: (inserted as { id: string }).id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return json({ success: false, error: msg }, 500);
  }
});
