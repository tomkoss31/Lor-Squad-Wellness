// =============================================================================
// shop-relance-notifier — relances boutique HL SKIN (cron horaire, 2026-07-12).
//
// 1. PANIER ABANDONNÉ : commande restée `pending` (lead capturé mais paiement
//    non finalisé) entre 2 h et 72 h → email de relance douce. 1 seule fois
//    (relance_email_sent_at).
// 2. DEMANDE D'AVIS : commande `paid` depuis ≥ 7 jours → email invitant à
//    laisser un avis (alimente les témoignages skin). 1 seule fois
//    (review_request_sent_at).
//
// Déclenchée par pg_cron avec le service_role (Vault). Best-effort, batch borné.
// Déploiement : supabase functions deploy shop-relance-notifier --no-verify-jwt
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SITE_URL = "https://labase360.fr";

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function shell(title: string, bodyHtml: string, shopName: string): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#F1EFE9;font-family:Georgia,serif;color:#232620;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1EFE9;padding:28px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FBFAF6;border:1px solid #E2DED4;border-radius:16px;overflow:hidden;">
<tr><td style="padding:26px 30px 14px;border-bottom:1px solid #E2DED4;">
  <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#35664F;font-family:Arial,sans-serif;">${esc(title)}</div>
  <div style="font-size:24px;color:#232620;margin-top:4px;">${esc(shopName)}</div>
</td></tr>
<tr><td style="padding:26px 30px 30px;">${bodyHtml}</td></tr>
<tr><td style="padding:18px 30px;border-top:1px solid #E2DED4;font-family:Arial,sans-serif;font-size:11px;color:#6E7268;">
  ${esc(shopName)} · propulsé par La Base 360
</td></tr>
</table></td></tr></table></body></html>`;
}

function cta(url: string, label: string): string {
  return `<a href="${esc(url)}" style="display:inline-block;background:#4F8B72;color:#fff;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:600;padding:13px 26px;border-radius:999px;">${esc(label)}</a>`;
}

async function sendEmail(shopName: string, to: string, subject: string, html: string) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(8000),
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `${shopName} <boutique@labase360.fr>`,
      reply_to: "contact@labase360.fr",
      to: [to],
      subject,
      html,
    }),
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok");

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const nowIso = new Date().toISOString();
  const result = { abandoned: 0, review: 0 };

  if (!RESEND_API_KEY) {
    console.warn("[shop-relance-notifier] RESEND_API_KEY manquant");
    return new Response(JSON.stringify({ ok: false, reason: "no_resend" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Cache nom boutique par slug (évite N appels RPC).
  const shopNameCache = new Map<string, string>();
  async function shopName(slug: string | null): Promise<string> {
    const key = slug ?? "";
    if (shopNameCache.has(key)) return shopNameCache.get(key)!;
    let name = "Beauté K Skin";
    if (slug) {
      const { data } = await sb.rpc("get_boutique_by_slug", { p_slug: slug });
      name = (data as { shop_name?: string } | null)?.shop_name ?? name;
    }
    shopNameCache.set(key, name);
    return name;
  }

  // ── 1. PANIER ABANDONNÉ ────────────────────────────────────────────────────
  try {
    const from = new Date(Date.now() - 72 * 3600 * 1000).toISOString();
    const to = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    const { data: orders } = await sb
      .from("shop_orders")
      .select("id, boutique_slug, customer_email, customer_first_name")
      .eq("status", "pending")
      .is("relance_email_sent_at", null)
      .not("customer_email", "is", null)
      .gte("created_at", from)
      .lte("created_at", to)
      .limit(40);

    for (const o of orders ?? []) {
      if (!o.customer_email) continue;
      const name = await shopName(o.boutique_slug);
      const hi = o.customer_first_name ? `Coucou ${esc(o.customer_first_name)},` : "Coucou,";
      const url = `${SITE_URL}/boutique/${o.boutique_slug ?? ""}`;
      const html = shell(
        "Ton panier t'attend",
        `<div style="font-size:20px;">${hi}</div>
         <p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#6E7268;margin:12px 0 18px;">
           Tu as commencé une commande chez ${esc(name)} mais tu n'as pas finalisé. Ta sélection
           t'attend — et la livraison est offerte dès 90 € 🌿
         </p>
         <div style="margin:6px 0 4px;">${cta(url, "Reprendre ma commande")}</div>
         <p style="font-family:Arial,sans-serif;font-size:12px;color:#847F72;margin-top:16px;">
           Une question ? Réponds simplement à cet email.
         </p>`,
        name,
      );
      await sendEmail(name, o.customer_email, `Ton panier ${name} t'attend 🌿`, html);
      await sb.from("shop_orders").update({ relance_email_sent_at: nowIso }).eq("id", o.id);
      result.abandoned++;
    }
  } catch (e) {
    console.warn("[shop-relance-notifier] abandoned:", e instanceof Error ? e.message : e);
  }

  // ── 2. DEMANDE D'AVIS POST-ACHAT ───────────────────────────────────────────
  try {
    const paidBefore = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const { data: orders } = await sb
      .from("shop_orders")
      .select("id, boutique_slug, customer_email, customer_first_name")
      .eq("status", "paid")
      .is("review_request_sent_at", null)
      .not("customer_email", "is", null)
      .lte("paid_at", paidBefore)
      .limit(40);

    for (const o of orders ?? []) {
      if (!o.customer_email) continue;
      const name = await shopName(o.boutique_slug);
      const hi = o.customer_first_name ? `Coucou ${esc(o.customer_first_name)},` : "Coucou,";
      const url = `${SITE_URL}/boutique/${o.boutique_slug ?? ""}#bk-affil`;
      const html = shell(
        "Ton avis compte",
        `<div style="font-size:20px;">${hi}</div>
         <p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#6E7268;margin:12px 0 18px;">
           Ça fait une semaine que tu as reçu ta routine ${esc(name)} — comment ça se passe avec ta
           peau ? Ton retour aide d'autres personnes à se lancer. Ça prend 30 secondes ✨
         </p>
         <div style="margin:6px 0 4px;">${cta(url, "Laisser mon avis")}</div>
         <p style="font-family:Arial,sans-serif;font-size:12px;color:#847F72;margin-top:16px;">
           Merci pour ta confiance 🌿
         </p>`,
        name,
      );
      await sendEmail(name, o.customer_email, `${o.customer_first_name || "Toi"}, comment va ta peau ? 🌿`, html);
      await sb.from("shop_orders").update({ review_request_sent_at: nowIso }).eq("id", o.id);
      result.review++;
    }
  } catch (e) {
    console.warn("[shop-relance-notifier] review:", e instanceof Error ? e.message : e);
  }

  return new Response(JSON.stringify({ ok: true, ...result }), {
    headers: { "Content-Type": "application/json" },
  });
});
