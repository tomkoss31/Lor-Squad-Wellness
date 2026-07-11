// =============================================================================
// confirm-shop-payment — confirmation paiement boutique HL SKIN SANS webhook
// (chantier 2026-07-10). Jumeau de confirm-stripe-payment, côté boutique.
//
// Au retour de la caisse (success_url ?order=<id>&session_id=cs_…), la page
// /boutique rappelle cette fonction. On revérifie le statut CÔTÉ SERVEUR via la
// clé secrète DU distri (jamais la valeur du navigateur) → impossible de simuler.
//
// Flow :
//   1. order_id → shop_orders (session_id doit correspondre à celui stocké)
//   2. déjà paid → { paid:true } (idempotent)
//   3. clé du distri → GET /v1/checkout/sessions/{id}
//   4. payment_status paid → order paid + incrément promo used_count + push distri
//
// Déploiement : supabase functions deploy confirm-shop-payment --no-verify-jwt
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

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const euro = (cents: number) =>
  (cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

// Email de confirmation de commande — identité céladon, HTML inline email-safe.
function orderConfirmationHtml(p: {
  firstName?: string;
  shopName: string;
  items: { name: string; quantity: number; line_total_cents: number }[];
  subtotalCents: number;
  discountCents: number;
  promoCode?: string | null;
  shippingCents: number;
  totalCents: number;
  address?: Record<string, string> | null;
}): string {
  const hi = p.firstName ? `Merci ${esc(p.firstName)} !` : "Merci !";
  const rows = p.items
    .map(
      (i) =>
        `<tr><td style="padding:8px 0;font-family:Arial,sans-serif;font-size:13px;color:#232620;">${esc(i.name)} × ${i.quantity}</td><td align="right" style="padding:8px 0;font-family:Arial,sans-serif;font-size:13px;color:#232620;">${euro(i.line_total_cents)}</td></tr>`,
    )
    .join("");
  const a = p.address;
  const addr = a
    ? `${esc(a.line1 ?? "")}${a.line2 ? ", " + esc(a.line2) : ""}, ${esc(a.postal_code ?? "")} ${esc(a.city ?? "")} ${esc(a.country ?? "")}`
    : "";
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#F1EFE9;font-family:Georgia,serif;color:#232620;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1EFE9;padding:28px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FBFAF6;border:1px solid #E2DED4;border-radius:16px;overflow:hidden;">
<tr><td style="padding:26px 30px 14px;border-bottom:1px solid #E2DED4;">
  <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#35664F;font-family:Arial,sans-serif;">Commande confirmée</div>
  <div style="font-size:24px;color:#232620;margin-top:4px;">${esc(p.shopName)}</div>
</td></tr>
<tr><td style="padding:26px 30px 30px;">
  <div style="font-size:20px;">${hi}</div>
  <p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#6E7268;margin:12px 0 18px;">
    Ta commande est confirmée. Ta coach prépare ton envoi (expédition sous 48 h). Récapitulatif :
  </p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E2DED4;border-bottom:1px solid #E2DED4;margin:6px 0;">${rows}</table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;font-family:Arial,sans-serif;font-size:13px;color:#6E7268;">
    <tr><td>Sous-total</td><td align="right">${euro(p.subtotalCents)}</td></tr>
    ${p.discountCents > 0 ? `<tr><td style="color:#35664F;">Réduction${p.promoCode ? " · " + esc(p.promoCode) : ""}</td><td align="right" style="color:#35664F;">−${euro(p.discountCents)}</td></tr>` : ""}
    <tr><td>Livraison</td><td align="right">${p.shippingCents === 0 ? "Offerte" : euro(p.shippingCents)}</td></tr>
    <tr><td style="padding-top:8px;font-size:16px;color:#232620;font-family:Georgia,serif;">Total</td><td align="right" style="padding-top:8px;font-size:18px;color:#232620;font-family:Georgia,serif;">${euro(p.totalCents)}</td></tr>
  </table>
  ${addr ? `<p style="font-family:Arial,sans-serif;font-size:12px;color:#6E7268;margin-top:18px;">📦 Livraison : ${addr}</p>` : ""}
</td></tr>
<tr><td style="padding:20px 30px;border-top:1px solid #E2DED4;font-family:Arial,sans-serif;font-size:11px;color:#6E7268;">
  ${esc(p.shopName)} · propulsé par La Base 360
</td></tr>
</table></td></tr></table></body></html>`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const body = (await req.json().catch(() => ({}))) as { order_id?: string; session_id?: string };
    const orderId = String(body.order_id ?? "").trim();
    const sessionId = String(body.session_id ?? "").trim();
    if (!orderId || !sessionId.startsWith("cs_")) return json({ paid: false });

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: order } = await sb
      .from("shop_orders")
      .select(
        "id, status, coach_user_id, boutique_slug, provider_session_id, promo_code_id, promo_code, subtotal_cents, discount_cents, shipping_cents, total_cents, customer_first_name, customer_email, shipping_address",
      )
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return json({ paid: false });
    // Sécurité : le session_id fourni doit être celui stocké à la création.
    if (order.provider_session_id && order.provider_session_id !== sessionId) {
      return json({ paid: false });
    }
    if (order.status === "paid") {
      return json({ paid: true, order: { first_name: order.customer_first_name, total_cents: order.total_cents } });
    }

    const { data: settings } = await sb
      .from("coach_payment_settings")
      .select("stripe_secret_key")
      .eq("coach_user_id", order.coach_user_id)
      .maybeSingle();
    const secret = String(settings?.stripe_secret_key ?? "").trim();
    if (!secret.startsWith("sk_")) return json({ paid: false });

    const stRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${secret}` },
    });
    if (!stRes.ok) {
      console.warn("[confirm-shop-payment] Stripe", stRes.status);
      return json({ paid: false });
    }
    const session = (await stRes.json()) as { payment_status?: string };
    if (session.payment_status !== "paid") return json({ paid: false });

    await sb
      .from("shop_orders")
      .update({ status: "paid", paid_at: new Date().toISOString(), provider_session_id: sessionId })
      .eq("id", order.id);

    // Incrément atomique du code promo (une seule fois, au passage à paid).
    if (order.promo_code_id) {
      await sb.rpc("increment_promo_usage", { p_promo_id: order.promo_code_id }).then(
        () => {},
        () => {},
      );
    }

    // Email de confirmation au client — best-effort.
    try {
      if (RESEND_API_KEY && order.customer_email) {
        const { data: items } = await sb
          .from("shop_order_items")
          .select("product_name, quantity, line_total_cents")
          .eq("order_id", order.id);
        const { data: boutique } = await sb.rpc("get_boutique_by_slug", {
          p_slug: order.boutique_slug ?? "",
        });
        const shopName = (boutique as { shop_name?: string } | null)?.shop_name ?? "Beauté K Skin";
        const html = orderConfirmationHtml({
          firstName: order.customer_first_name ?? undefined,
          shopName,
          items: (items ?? []).map((i) => ({
            name: i.product_name,
            quantity: i.quantity,
            line_total_cents: i.line_total_cents,
          })),
          subtotalCents: order.subtotal_cents,
          discountCents: order.discount_cents,
          promoCode: order.promo_code,
          shippingCents: order.shipping_cents,
          totalCents: order.total_cents,
          address: order.shipping_address as Record<string, string> | null,
        });
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          signal: AbortSignal.timeout(8000),
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: `${shopName} <boutique@labase360.fr>`,
            reply_to: "contact@labase360.fr",
            to: [order.customer_email],
            subject: `Ta commande ${shopName} est confirmée 🌿`,
            html,
          }),
        });
      }
    } catch (e) {
      console.warn("[confirm-shop-payment] email:", e instanceof Error ? e.message : e);
    }

    // Push au distri — best-effort.
    try {
      const { data: subs } = await sb
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", order.coach_user_id);
      if (subs && subs.length > 0) {
        await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
          signal: AbortSignal.timeout(2500),
          method: "POST",
          headers: { Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            subscriptions: subs,
            payload: {
              title: "🛍️ Nouvelle commande boutique !",
              body: `${order.customer_first_name || "Une cliente"} a commandé pour ${(order.total_cents / 100).toFixed(2)} €`,
              url: "/crm",
            },
          }),
        });
      }
    } catch (e) {
      console.warn("[confirm-shop-payment] push:", e instanceof Error ? e.message : e);
    }

    return json({ paid: true, order: { first_name: order.customer_first_name, total_cents: order.total_cents } });
  } catch (e) {
    console.warn("[confirm-shop-payment]", e instanceof Error ? e.message : e);
    return json({ paid: false });
  }
});
