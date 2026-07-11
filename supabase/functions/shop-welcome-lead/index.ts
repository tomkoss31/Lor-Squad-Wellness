// =============================================================================
// shop-welcome-lead — Popup bienvenue boutique HL SKIN (chantier 2026-07-10).
//
// Capture l'email (+ prénom) depuis le popup de bienvenue de /boutique/<slug>,
// enregistre le lead (shop_leads), et envoie par email le code −5 % de la distri
// (WELCOME5) valable jusqu'à minuit. Best-effort sur l'email : le lead est
// capturé quoi qu'il arrive (base des relances).
//
// Déploiement : supabase functions deploy shop-welcome-lead --no-verify-jwt
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Email de bienvenue — identité céladon Beauté K Skin, HTML inline email-safe.
function welcomeEmailHtml(p: { firstName: string; shopName: string; code: string; shopUrl: string }): string {
  const hi = p.firstName ? `Bienvenue ${esc(p.firstName)},` : "Bienvenue,";
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#F1EFE9;font-family:Georgia,serif;color:#232620;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1EFE9;padding:28px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FBFAF6;border:1px solid #E2DED4;border-radius:16px;overflow:hidden;">
<tr><td style="padding:26px 30px 14px;border-bottom:1px solid #E2DED4;">
  <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#35664F;font-family:Arial,sans-serif;">Skincare coréen</div>
  <div style="font-size:24px;color:#232620;margin-top:4px;">${esc(p.shopName)}</div>
</td></tr>
<tr><td style="padding:26px 30px 30px;">
  <div style="font-size:20px;">${hi}</div>
  <p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#6E7268;margin:12px 0 20px;">
    Merci de rejoindre le cercle Beauté K. Voici ton cadeau : <b style="color:#232620;">−5 % sur ta première commande</b>.
  </p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:22px;background:#F1EFE9;border:1px dashed #4F8B72;border-radius:14px;">
    <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#6E7268;">Ton code</div>
    <div style="font-size:30px;letter-spacing:4px;color:#35664F;margin-top:6px;">${esc(p.code)}</div>
    <div style="font-family:Arial,sans-serif;font-size:12px;color:#CF9488;margin-top:8px;">⏳ Valable jusqu'à minuit ce soir</div>
  </td></tr></table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;"><tr><td align="center">
    <a href="${esc(p.shopUrl)}" style="display:inline-block;background:#4F8B72;color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;padding:14px 28px;border-radius:999px;">Je découvre la gamme</a>
  </td></tr></table>
</td></tr>
<tr><td style="padding:20px 30px;border-top:1px solid #E2DED4;font-family:Arial,sans-serif;font-size:11px;color:#6E7268;">
  ${esc(p.shopName)} · propulsé par La Base 360 · beauté coréenne premium
</td></tr>
</table></td></tr></table></body></html>`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const body = (await req.json().catch(() => ({}))) as {
      slug?: string;
      email?: string;
      first_name?: string;
      shop_url?: string;
    };
    const slug = String(body.slug ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const firstName = String(body.first_name ?? "").trim();
    if (!slug || !isEmail(email)) return json({ error: "email_invalide" }, 400);

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: boutique } = await sb.rpc("get_boutique_by_slug", { p_slug: slug });
    const b = boutique as { user_id?: string; shop_name?: string } | null;
    if (!b?.user_id) return json({ error: "boutique_introuvable" }, 404);
    const shopName = b.shop_name ?? "Beauté K Skin";

    const { data: promo } = await sb
      .from("promo_codes")
      .select("code")
      .eq("coach_user_id", b.user_id)
      .ilike("code", "WELCOME5")
      .eq("active", true)
      .maybeSingle();
    const code = promo?.code ?? "WELCOME5";

    const { data: lead } = await sb
      .from("shop_leads")
      .upsert(
        {
          coach_user_id: b.user_id,
          boutique_slug: slug,
          email,
          first_name: firstName || null,
          source: "welcome_popup",
          welcome_code: code,
        },
        { onConflict: "coach_user_id,email" },
      )
      .select("id")
      .maybeSingle();

    let emailSent = false;
    if (RESEND_API_KEY) {
      try {
        const shopUrl = body.shop_url || `${SUPABASE_URL}`;
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          signal: AbortSignal.timeout(8000),
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: `${shopName} <boutique@labase360.fr>`,
            reply_to: "contact@labase360.fr",
            to: [email],
            subject: `Ton −5 % de bienvenue chez ${shopName} 🌿`,
            html: welcomeEmailHtml({ firstName, shopName, code, shopUrl }),
          }),
        });
        emailSent = res.ok;
        if (!res.ok) console.warn("[shop-welcome-lead] resend", res.status, (await res.text()).slice(0, 200));
      } catch (e) {
        console.warn("[shop-welcome-lead] email:", e instanceof Error ? e.message : e);
      }
    }
    if (emailSent && lead?.id) {
      await sb.from("shop_leads").update({ code_email_sent_at: new Date().toISOString() }).eq("id", lead.id);
    }

    return json({ ok: true, code, email_sent: emailSent });
  } catch (e) {
    console.warn("[shop-welcome-lead]", e instanceof Error ? e.message : e);
    return json({ error: "server_error" }, 500);
  }
});
