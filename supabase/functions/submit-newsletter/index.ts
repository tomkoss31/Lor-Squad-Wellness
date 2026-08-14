// Edge Function : inscription à la newsletter publique du site club (footer
// Breakfast Club). Pas d'auth (déployer avec --no-verify-jwt). Anti-spam : rate
// limit in-memory par IP (5/h). Insert en service_role dans newsletter_subscribers
// (RLS bypass propre — la table est verrouillée à anon/authenticated).
//
// Input  : { email: string, consent: boolean, source?: string }
// Output : { success: true } | { success: true, already: true } | { success: false, error }
//
// Deploy: supabase functions deploy submit-newsletter --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Rate limit in-memory (reset au cold start — anti-spam léger, comme submit-prospect-lead).
const RATE_BUCKET = new Map<string, number[]>();
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1h
const RATE_MAX = 5;
function checkRate(ip: string): boolean {
  const now = Date.now();
  const hist = (RATE_BUCKET.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hist.length >= RATE_MAX) return false;
  hist.push(now);
  RATE_BUCKET.set(ip, hist);
  return true;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "method_not_allowed" }, 405);

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  if (!checkRate(ip)) return json({ success: false, error: "rate_limited" }, 429);

  let body: { email?: string; consent?: boolean; source?: string };
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "invalid_json" }, 400);
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const consent = body.consent === true;
  const source = (body.source ?? "newsletter-club").trim() || "newsletter-club";

  if (!EMAIL_RE.test(email)) return json({ success: false, error: "email_invalide" }, 400);
  if (!consent) return json({ success: false, error: "consent_requis" }, 400);

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const { error } = await sb.from("newsletter_subscribers").insert({ email, consent, source });

  if (error) {
    // 23505 = violation d'unicité → l'adresse est déjà inscrite : c'est un succès
    // du point de vue de l'utilisateur (il est bien dans la liste).
    if (error.code === "23505") return json({ success: true, already: true });
    console.error("[submit-newsletter] insert error:", error.message);
    return json({ success: false, error: "server_error" }, 500);
  }

  return json({ success: true });
});
