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

  let body: { first_name?: string; phone?: string; city?: string };
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "invalid_json" }, 400);
  }

  const firstName = (body.first_name ?? "").trim();
  const phone = (body.phone ?? "").trim();
  const city = (body.city ?? "").trim() || null;

  if (firstName.length < 2) {
    return json({ success: false, error: "Prénom trop court." }, 400);
  }
  if (phone.replace(/\D/g, "").length < 6) {
    return json({ success: false, error: "Téléphone invalide." }, 400);
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const { data: inserted, error: insertErr } = await sb
      .from("prospect_leads")
      .insert({
        first_name: firstName,
        phone,
        city,
        source: "welcome_page",
        status: "new",
      })
      .select("id")
      .single();

    if (insertErr) throw insertErr;

    // Notif push aux admins actifs (best-effort, non bloquant)
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

        // Notif via send-push function (déjà déployée dans le projet)
        if (allSubs.length > 0) {
          const title = "🔥 Nouveau prospect";
          const pushBody = `${firstName}${city ? " de " + city : ""} · ${phone}`;
          await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
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
                url: "/parametres?tab=leads",
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
