// =============================================================================
// send-password-reset — envoie le lien « mot de passe oublié » via Resend
// (2026-07-10).
//
// POURQUOI : le mailer intégré de Supabase Auth (resetPasswordForEmail côté
// front) a un plafond de débit très bas et une délivrabilité peu fiable
// (« pour test, pas prod »). Symptômes vécus : le client ne reçoit rien ET voit
// « limite atteinte » (over_email_send_rate). On contourne en générant le lien
// de récupération en service_role (admin.generateLink → ne consomme PAS le
// mailer bridé) puis en l'envoyant via Resend (domaine labase360.fr vérifié,
// même canal que les newsletters).
//
// Entrée : { email: string, redirect_to?: string }
// Sortie : { success: true }  (toujours 200 si l'email est valide — on ne
//          révèle jamais si le compte existe : anti-énumération).
//
// Auth   : public (l'utilisateur n'est pas connecté). Anti-abus : throttle
//          in-memory par IP + par email.
//
// Deploy : supabase functions deploy send-password-reset --no-verify-jwt
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

const FROM = "La Base 360 <no-reply@labase360.fr>";
const REPLY_TO = "support@labase360.fr";
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
// Empêche de harceler une boîte mail. 1 envoi / email / 60s, 5 / email / heure.
const emailHits = new Map<string, number[]>();
const ipHits = new Map<string, number[]>();
function throttle(map: Map<string, number[]>, key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (map.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    map.set(key, arr);
    return false; // bloqué
  }
  arr.push(now);
  map.set(key, arr);
  return true; // autorisé
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

function buildHtml(actionLink: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#0a0c0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0c0a;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#14171a;border:1px solid rgba(255,255,255,0.10);border-radius:18px;overflow:hidden;">
        <tr><td style="padding:34px 34px 8px 34px;">
          <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#2DD4BF;font-weight:700;margin-bottom:14px;">La Base 360</div>
          <h1 style="margin:0 0 10px 0;font-size:24px;color:#F1EFE8;font-weight:800;letter-spacing:-0.3px;">Réinitialise ton mot de passe</h1>
          <p style="margin:0;font-size:14.5px;color:#9AA0A6;line-height:1.6;">
            Tu as demandé à changer ton mot de passe. Clique sur le bouton ci-dessous pour en choisir un nouveau.
            Ce lien est valable 1&nbsp;heure.
          </p>
        </td></tr>
        <tr><td style="padding:22px 34px 8px 34px;">
          <a href="${esc(actionLink)}" style="display:inline-block;background:#c5f82a;color:#0a0c0a;text-decoration:none;font-weight:700;font-size:15px;padding:14px 26px;border-radius:12px;">
            Choisir un nouveau mot de passe →
          </a>
        </td></tr>
        <tr><td style="padding:16px 34px 30px 34px;">
          <p style="margin:0 0 6px 0;font-size:12.5px;color:#6b7280;line-height:1.6;">
            Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :
          </p>
          <p style="margin:0;font-size:12px;color:#2DD4BF;word-break:break-all;">${esc(actionLink)}</p>
          <p style="margin:18px 0 0 0;font-size:12.5px;color:#6b7280;line-height:1.6;">
            Tu n'es pas à l'origine de cette demande ? Ignore simplement cet email, ton mot de passe reste inchangé.
          </p>
        </td></tr>
        <tr><td style="padding:16px 34px;background:#0a0c0a;text-align:center;color:#6b7280;font-size:12px;">
          La Base 360 — <a href="https://labase360.fr" style="color:#2DD4BF;text-decoration:none;">labase360.fr</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
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

  // Throttle : 20 req/h par IP (garde-fou global) + 5/h et 1/60s par email.
  if (!throttle(ipHits, ip, 20, 60 * 60 * 1000)) {
    return json({ success: false, error: "rate_limited" }, 429);
  }
  if (!throttle(emailHits, `min:${email}`, 1, 60 * 1000) || !throttle(emailHits, `hr:${email}`, 5, 60 * 60 * 1000)) {
    // On renvoie 200 « success » pour ne pas révéler l'activité sur cet email,
    // mais on n'envoie pas un 2e mail dans la même minute.
    return json({ success: true });
  }

  const origin = String(body.redirect_to ?? "").trim() || DEFAULT_ORIGIN;
  const redirectTo = `${origin.replace(/\/+$/, "")}/reset-password`;

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  // Génère le lien de récupération SANS passer par le mailer Supabase.
  const { data, error } = await sb.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });

  // Compte inexistant / erreur : on répond 200 success (anti-énumération).
  // Rien n'est envoyé, l'attaquant ne peut pas distinguer email connu/inconnu.
  const actionLink = data?.properties?.action_link;
  if (error || !actionLink) {
    return json({ success: true });
  }

  // Envoi via Resend (domaine vérifié labase360.fr).
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: "Réinitialise ton mot de passe — La Base 360",
        html: buildHtml(actionLink),
        reply_to: REPLY_TO,
      }),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      return json({ success: false, error: b?.message ?? `resend_${res.status}` }, 502);
    }
  } catch (e) {
    return json({ success: false, error: e instanceof Error ? e.message : "send_failed" }, 502);
  }

  return json({ success: true });
});
