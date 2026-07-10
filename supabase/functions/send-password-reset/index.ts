// =============================================================================
// send-password-reset — envoie le lien « mot de passe oublié » via Resend
// (2026-07-10).
//
// POURQUOI : le mailer intégré de Supabase Auth (resetPasswordForEmail côté
// front) a un plafond de débit très bas et une délivrabilité peu fiable
// (« pour test, pas prod »). Symptômes vécus : le client ne reçoit rien ET voit
// « limite atteinte » (over_email_send_rate). On contourne en générant le lien
// de récupération en service_role (admin.generateLink → ne consomme PAS le
// mailer bridé) puis en l'envoyant via Resend (domaine labase360.fr vérifié).
// Présentation : template partagé _shared/email.ts (identité v2).
//
// Entrée : { email: string, redirect_to?: string }
// Sortie : { success: true }  (toujours 200 si l'email est valide — on ne
//          révèle jamais si le compte existe : anti-énumération).
//
// Auth   : public. Anti-abus : throttle in-memory par IP + par email.
// Deploy : supabase functions deploy send-password-reset --no-verify-jwt
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { brandedEmail, sendResend } from "../_shared/email.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DEFAULT_ORIGIN = "https://labase360.fr";

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

// ─── Anti-abus in-memory (reset au cold start — suffisant pour throttle léger) ─
const emailHits = new Map<string, number[]>();
const ipHits = new Map<string, number[]>();
function throttle(map: Map<string, number[]>, key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (map.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    map.set(key, arr);
    return false;
  }
  arr.push(now);
  map.set(key, arr);
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "method_not_allowed" }, 405);

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  let body: { email?: string; redirect_to?: string };
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "invalid_json" }, 400);
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email || !/.+@.+\..+/.test(email)) {
    return json({ success: false, error: "invalid_email" }, 400);
  }

  if (!throttle(ipHits, ip, 20, 60 * 60 * 1000)) {
    return json({ success: false, error: "rate_limited" }, 429);
  }
  if (!throttle(emailHits, `min:${email}`, 1, 60 * 1000) || !throttle(emailHits, `hr:${email}`, 5, 60 * 60 * 1000)) {
    return json({ success: true }); // pas de 2e mail dans la minute (silencieux)
  }

  const origin = String(body.redirect_to ?? "").trim() || DEFAULT_ORIGIN;
  const redirectTo = `${origin.replace(/\/+$/, "")}/reset-password`;

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data, error } = await sb.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });

  // Compte inexistant / erreur → 200 success sans envoi (anti-énumération).
  const actionLink = data?.properties?.action_link;
  if (error || !actionLink) return json({ success: true });

  const html = brandedEmail({
    badge: "🔒",
    eyebrow: "Sécurité du compte",
    heading: "Réinitialise ton mot de passe",
    intro:
      "Tu as demandé à changer ton mot de passe. Clique sur le bouton ci-dessous pour en choisir un nouveau.",
    ctaLabel: "Choisir un nouveau mot de passe →",
    ctaUrl: actionLink,
    validity: "Ce lien est valable 1 heure.",
    outro:
      "Tu n'es pas à l'origine de cette demande ? Ignore cet email, ton mot de passe reste inchangé.",
  });

  const sent = await sendResend({
    to: email,
    subject: "Réinitialise ton mot de passe — La Base 360",
    html,
  });
  if (!sent.ok) return json({ success: false, error: sent.error }, 502);

  return json({ success: true });
});
