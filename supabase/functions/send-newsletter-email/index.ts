// Chantier #8 Newsletter (2026-05-23) — Étape 8.2.
// Edge Function : envoie 1 email transactionnel via Resend.
// V1 minimal : juste valider la chaîne Supabase → Resend → boîte mail.
// Sera étendu en étape 8.5 (distribution batch newsletter).
//
// Input  : { to: string, subject: string, html: string, test?: boolean }
//          Si body vide ou { test: true } → envoie l'email de test 8.2.
// Output : { success: true, message_id } ou { success: false, error }
//
// Auth   : admin only (vérifié via Bearer JWT Supabase + role check).
//          Bypass auth si test=true ET FROM=tomkoss31@gmail.com (validation 8.2).
//
// Deploy : supabase functions deploy send-newsletter-email

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

const FROM_DEFAULT = "La Base 360 News <newsletter@labase360.fr>";
const REPLY_TO_DEFAULT = "newsletter@labase360.fr";

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

const TEST_EMAIL_HTML = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Test envoi — La Base 360 News</title>
</head>
<body style="margin:0;padding:0;background:#0B0F14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0B0F14;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#11161D;border:1px solid #1F2630;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 16px 32px;text-align:center;">
              <div style="font-size:32px;line-height:1;margin-bottom:16px;">🎉</div>
              <h1 style="margin:0 0 8px 0;font-size:24px;color:#C9A84C;font-weight:700;letter-spacing:-0.5px;">
                Test Resend OK
              </h1>
              <p style="margin:0;font-size:14px;color:#9AA4B2;">
                Étape 8.2 du chantier #8 Newsletter — chaîne validée.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px 32px;">
              <div style="border-top:1px solid #1F2630;padding-top:24px;color:#D7DBE0;font-size:14px;line-height:1.6;">
                <p style="margin:0 0 12px 0;">Tu reçois cet email parce que :</p>
                <ul style="margin:0 0 12px 0;padding-left:20px;color:#9AA4B2;">
                  <li>✅ Compte Resend créé</li>
                  <li>✅ DNS labase360.fr verified (SPF + DKIM + DMARC)</li>
                  <li>✅ Edge function <code style="background:#1F2630;padding:2px 6px;border-radius:4px;color:#2DD4BF;">send-newsletter-email</code> déployée</li>
                  <li>✅ <code style="background:#1F2630;padding:2px 6px;border-radius:4px;color:#2DD4BF;">RESEND_API_KEY</code> dans Supabase secrets</li>
                </ul>
                <p style="margin:12px 0 0 0;color:#9AA4B2;font-size:13px;">
                  Prochaine étape : 8.3 — page admin <code style="background:#1F2630;padding:2px 6px;border-radius:4px;color:#2DD4BF;">/admin/newsletters</code>.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background:#0B0F14;text-align:center;color:#6B7280;font-size:12px;">
              La Base 360 — Newsletter system V1<br />
              <a href="https://labase360.fr" style="color:#2DD4BF;text-decoration:none;">labase360.fr</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

async function sendViaResend(params: {
  to: string;
  subject: string;
  html: string;
  from?: string;
  reply_to?: string;
}): Promise<{ ok: true; message_id: string } | { ok: false; error: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: params.from ?? FROM_DEFAULT,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      reply_to: params.reply_to ?? REPLY_TO_DEFAULT,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: body?.message ?? `Resend HTTP ${res.status}` };
  }
  return { ok: true, message_id: body?.id ?? "unknown" };
}

async function requireAdmin(req: Request): Promise<{ ok: true } | { ok: false; reason: string }> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return { ok: false, reason: "missing_jwt" };

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: userRes, error: userErr } = await sb.auth.getUser(token);
  if (userErr || !userRes?.user) return { ok: false, reason: "invalid_jwt" };

  const { data: profile, error: profileErr } = await sb
    .from("users")
    .select("role, active")
    .eq("id", userRes.user.id)
    .single();

  if (profileErr || !profile) return { ok: false, reason: "profile_not_found" };
  if (profile.role !== "admin") return { ok: false, reason: "not_admin" };
  if (!profile.active) return { ok: false, reason: "user_inactive" };

  return { ok: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "method_not_allowed" }, 405);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // body vide = mode test 8.2
  }

  const isTest = body?.test === true || Object.keys(body).length === 0;

  // Mode test 8.2 : envoie hardcoded à tomkoss31@gmail.com.
  // Bypass admin check (utile pour curl manuel pendant la recette 8.2).
  if (isTest) {
    const result = await sendViaResend({
      to: "tomkoss31@gmail.com",
      subject: "🎉 Test Resend — La Base 360 News (étape 8.2)",
      html: TEST_EMAIL_HTML,
    });
    if (!result.ok) return json({ success: false, error: result.error }, 502);
    return json({ success: true, mode: "test", message_id: result.message_id });
  }

  // Mode production : admin only.
  const auth = await requireAdmin(req);
  if (!auth.ok) return json({ success: false, error: auth.reason }, 401);

  const to = String(body?.to ?? "").trim();
  const subject = String(body?.subject ?? "").trim();
  const html = String(body?.html ?? "").trim();
  if (!to || !subject || !html) {
    return json({ success: false, error: "missing_fields" }, 400);
  }

  const result = await sendViaResend({ to, subject, html });
  if (!result.ok) return json({ success: false, error: result.error }, 502);
  return json({ success: true, message_id: result.message_id });
});
