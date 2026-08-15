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
//   4. payment_status paid → order paid + incrément promo used_count
//   5. notifications : reçu au client + EMAIL À LA COACH + push distri
//
// ⚠️ Le push seul ne suffit pas (incident 2026-08-07) : une distri sans
// abonnement push (0 ligne dans push_subscriptions) n'était prévenue de RIEN —
// ni du paiement, ni de quoi expédier ni à qui. L'email coach est le canal
// fiable ; le push reste un complément temps réel.
//
// Déploiement : supabase functions deploy confirm-shop-payment --no-verify-jwt
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SQUARE_VERSION = "2026-05-20";
const SITE_URL = "https://labase360.fr";

// Même normalisation que submit-online-bilan (le slug /bilan-online se résout
// sur le 1er mot de users.name) — garder les deux alignés.
function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

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

function cta(url: string, label: string): string {
  return `<a href="${esc(url)}" style="display:inline-block;background:#4F8B72;color:#fff;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:600;padding:12px 24px;border-radius:999px;">${esc(label)}</a>`;
}

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
  aiScanUrl?: string | null;
  bilanUrl?: string | null;
  coachFirstName?: string | null;
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
    Ton paiement est bien reçu et ta commande est confirmée. Voici ton récapitulatif :
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

<!-- La suite : ce qui va se passer, pour éviter la question « et maintenant ? » -->
<tr><td style="padding:0 30px 26px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F2EC;border-radius:12px;">
    <tr><td style="padding:18px 20px;font-family:Arial,sans-serif;font-size:13px;line-height:1.7;color:#6E7268;">
      <div style="font-family:Georgia,serif;font-size:16px;color:#232620;margin-bottom:8px;">La suite</div>
      <b style="color:#232620;">1.</b> ${p.coachFirstName ? esc(p.coachFirstName) : "Ta coach"} prépare ton colis (expédition sous 48 h ouvrées).<br />
      <b style="color:#232620;">2.</b> Tu reçois ta routine chez toi.<br />
      <b style="color:#232620;">3.</b> Une question sur l'ordre d'application ou ta peau ? Réponds à cet email — c'est ${p.coachFirstName ? esc(p.coachFirstName) : "ta coach"} qui te lit.
    </td></tr>
  </table>
</td></tr>

${
  p.aiScanUrl
    ? `<!-- Diagnostic IA : cible la routine sur SA peau, pas une routine générique -->
<tr><td style="padding:0 30px 22px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2DED4;border-radius:12px;">
    <tr><td style="padding:20px;">
      <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#35664F;font-family:Arial,sans-serif;">Pendant que ton colis arrive</div>
      <div style="font-family:Georgia,serif;font-size:18px;color:#232620;margin:6px 0 8px;">Fais analyser ta peau 🔬</div>
      <p style="font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:#6E7268;margin:0 0 16px;">
        Un scan gratuit en 2 minutes depuis ton téléphone : hydratation, pores, éclat, rides.
        Tu sauras exactement quoi appliquer en priorité — et tu pourras mesurer tes progrès dans un mois.
      </p>
      ${cta(p.aiScanUrl, "Analyser ma peau")}
    </td></tr>
  </table>
</td></tr>`
    : ""
}

${
  p.bilanUrl
    ? `<!-- Bilan bien-être : la peau se joue aussi de l'intérieur (cross-canal nutrition) -->
<tr><td style="padding:0 30px 26px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF3EF;border-radius:12px;">
    <tr><td style="padding:20px;">
      <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#35664F;font-family:Arial,sans-serif;">Aller plus loin</div>
      <div style="font-family:Georgia,serif;font-size:18px;color:#232620;margin:6px 0 8px;">Une belle peau se joue aussi de l'intérieur 🌿</div>
      <p style="font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:#6E7268;margin:0 0 16px;">
        Hydratation, sommeil, sucre, digestion : ce que tu mets dans ton assiette se voit sur ton
        visage. Le bilan bien-être est gratuit, en ligne, et ${p.coachFirstName ? esc(p.coachFirstName) : "ta coach"} te renvoie une lecture personnalisée.
      </p>
      ${cta(p.bilanUrl, "Faire mon bilan offert")}
    </td></tr>
  </table>
</td></tr>`
    : ""
}

<tr><td style="padding:20px 30px;border-top:1px solid #E2DED4;font-family:Arial,sans-serif;font-size:11px;color:#6E7268;">
  ${esc(p.shopName)} · propulsé par La Base 360
</td></tr>
</table></td></tr></table></body></html>`;
}

// Email de notification à LA COACH — le push est best-effort (silencieux si
// l'abonnement push n'existe pas / a expiré) : l'email est le canal fiable qui
// porte TOUT le nécessaire pour préparer l'envoi (coordonnées + adresse + détail).
function coachOrderNotificationHtml(p: {
  shopName: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  items: { name: string; quantity: number; line_total_cents: number }[];
  subtotalCents: number;
  discountCents: number;
  promoCode?: string | null;
  shippingCents: number;
  totalCents: number;
  address?: Record<string, string> | null;
}): string {
  const rows = p.items
    .map(
      (i) =>
        `<tr><td style="padding:8px 0;font-family:Arial,sans-serif;font-size:13px;color:#232620;">${esc(i.name)} × ${i.quantity}</td><td align="right" style="padding:8px 0;font-family:Arial,sans-serif;font-size:13px;color:#232620;">${euro(i.line_total_cents)}</td></tr>`,
    )
    .join("");
  const a = p.address;
  const addr = a
    ? `${esc(a.line1 ?? "")}${a.line2 ? ", " + esc(a.line2) : ""}, ${esc(a.postal_code ?? "")} ${esc(a.city ?? "")} ${esc(a.country ?? "")}`
    : "Non renseignée";
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#F1EFE9;font-family:Georgia,serif;color:#232620;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1EFE9;padding:28px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FBFAF6;border:1px solid #E2DED4;border-radius:16px;overflow:hidden;">
<tr><td style="padding:26px 30px 14px;border-bottom:1px solid #E2DED4;">
  <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#35664F;font-family:Arial,sans-serif;">Nouvelle commande</div>
  <div style="font-size:24px;color:#232620;margin-top:4px;">${esc(p.shopName)}</div>
</td></tr>
<tr><td style="padding:26px 30px 30px;">
  <div style="font-size:20px;">🛍️ ${esc(p.customerName)} vient de payer !</div>
  <p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#6E7268;margin:12px 0 18px;">
    Prépare l'envoi sous 48 h. Coordonnées et détail de la commande ci-dessous.
  </p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;font-size:13px;color:#232620;margin-bottom:16px;">
    <tr><td style="padding:3px 0;color:#6E7268;">Email</td><td align="right"><a href="mailto:${esc(p.customerEmail)}" style="color:#232620;">${esc(p.customerEmail)}</a></td></tr>
    ${p.customerPhone ? `<tr><td style="padding:3px 0;color:#6E7268;">Téléphone</td><td align="right"><a href="tel:${esc(p.customerPhone)}" style="color:#232620;">${esc(p.customerPhone)}</a></td></tr>` : ""}
    <tr><td style="padding:3px 0;color:#6E7268;vertical-align:top;">Adresse</td><td align="right">${addr}</td></tr>
  </table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E2DED4;border-bottom:1px solid #E2DED4;margin:6px 0;">${rows}</table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;font-family:Arial,sans-serif;font-size:13px;color:#6E7268;">
    <tr><td>Sous-total</td><td align="right">${euro(p.subtotalCents)}</td></tr>
    ${p.discountCents > 0 ? `<tr><td style="color:#35664F;">Réduction${p.promoCode ? " · " + esc(p.promoCode) : ""}</td><td align="right" style="color:#35664F;">−${euro(p.discountCents)}</td></tr>` : ""}
    <tr><td>Livraison</td><td align="right">${p.shippingCents === 0 ? "Offerte" : euro(p.shippingCents)}</td></tr>
    <tr><td style="padding-top:8px;font-size:16px;color:#232620;font-family:Georgia,serif;">Total encaissé</td><td align="right" style="padding-top:8px;font-size:18px;color:#232620;font-family:Georgia,serif;">${euro(p.totalCents)}</td></tr>
  </table>
</td></tr>
<tr><td style="padding:20px 30px;border-top:1px solid #E2DED4;font-family:Arial,sans-serif;font-size:11px;color:#6E7268;">
  ${esc(p.shopName)} · La Base 360 — <a href="https://www.labase360.fr/ma-boutique" style="color:#6E7268;">Voir mes commandes</a>
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
    if (!orderId) return json({ paid: false });

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: order } = await sb
      .from("shop_orders")
      .select(
        "id, status, coach_user_id, boutique_slug, provider, provider_session_id, promo_code_id, promo_code, subtotal_cents, discount_cents, shipping_cents, total_cents, customer_first_name, customer_last_name, customer_email, customer_phone, shipping_address",
      )
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return json({ paid: false });
    if (order.status === "paid") {
      return json({ paid: true, order: { first_name: order.customer_first_name, total_cents: order.total_cents } });
    }

    const { data: settings } = await sb
      .from("coach_payment_settings")
      .select("stripe_secret_key, square_access_token, square_env")
      .eq("coach_user_id", order.coach_user_id)
      .maybeSingle();

    // Vérification CÔTÉ SERVEUR via les credentials DU distri (jamais le navigateur).
    let verified = false;
    if (order.provider === "square") {
      const token = String(settings?.square_access_token ?? "").trim();
      const sqOrderId = String(order.provider_session_id ?? "").trim(); // order_id Square
      if (!token || !sqOrderId) return json({ paid: false });
      const host =
        settings?.square_env === "sandbox"
          ? "https://connect.squareupsandbox.com"
          : "https://connect.squareup.com";
      const sqRes = await fetch(`${host}/v2/orders/${sqOrderId}`, {
        signal: AbortSignal.timeout(8000),
        headers: { Authorization: `Bearer ${token}`, "Square-Version": SQUARE_VERSION },
      });
      if (!sqRes.ok) {
        console.warn("[confirm-shop-payment] Square", sqRes.status);
        return json({ paid: false });
      }
      const sqData = (await sqRes.json()) as {
        order?: {
          state?: string;
          total_money?: { amount?: number };
          net_amount_due_money?: { amount?: number };
        };
      };
      const o = sqData.order;
      const totalM = Number(o?.total_money?.amount ?? 0);
      const dueM = Number(o?.net_amount_due_money?.amount ?? totalM);
      verified = o?.state === "COMPLETED" || (totalM > 0 && dueM === 0);
    } else {
      // Stripe : le session_id fourni doit correspondre à celui stocké + être payé.
      if (!sessionId.startsWith("cs_")) return json({ paid: false });
      if (order.provider_session_id && order.provider_session_id !== sessionId) {
        return json({ paid: false });
      }
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
      verified = session.payment_status === "paid";
    }

    if (!verified) return json({ paid: false });

    await sb
      .from("shop_orders")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", order.id);

    // Incrément atomique du code promo (une seule fois, au passage à paid).
    if (order.promo_code_id) {
      await sb.rpc("increment_promo_usage", { p_promo_id: order.promo_code_id }).then(
        () => {},
        () => {},
      );
    }

    // Items + nom boutique — partagés par l'email client ET l'email coach.
    const { data: itemsData } = await sb
      .from("shop_order_items")
      .select("product_name, quantity, line_total_cents")
      .eq("order_id", order.id);
    const items = (itemsData ?? []).map((i) => ({
      name: i.product_name,
      quantity: i.quantity,
      line_total_cents: i.line_total_cents,
    }));
    const { data: boutique } = await sb.rpc("get_boutique_by_slug", {
      p_slug: order.boutique_slug ?? "",
    });
    const b = boutique as {
      shop_name?: string;
      first_name?: string;
      ai_scan_url?: string;
      legal?: { email?: string | null } | null;
    } | null;
    const shopName = b?.shop_name ?? "Beauté K Skin";
    const aiScanUrl = b?.ai_scan_url?.trim() || null;
    // ⚠️ La cliente répond À SA VENDEUSE, jamais au club (correction 2026-08-11).
    // On ne met un repli qu'en dernier recours, quand la distri n'a pas encore
    // renseigné son email — sinon ses réclamations arriveraient chez Thomas.
    const vendeurEmail = b?.legal?.email?.trim() || null;

    // Adresse de connexion de la coach — sert d'accusé de réception ET de repli
    // au reply_to client tant qu'elle n'a pas renseigné son email de vendeuse.
    let coachEmailFallback: string | null = null;
    try {
      const { data: authUser } = await sb.auth.admin.getUserById(order.coach_user_id);
      coachEmailFallback = authUser?.user?.email ?? null;
    } catch (e) {
      console.warn("[confirm-shop-payment] coach email:", e instanceof Error ? e.message : e);
    }

    // Lien bilan bien-être : ⚠️ le slug de /bilan-online se résout sur le 1er mot
    // de `users.name` (cf. submit-online-bilan), PAS sur boutique_slug — Mélanie
    // est « hlskinmelanie » en boutique mais « melanie » côté bilan.
    let bilanUrl: string | null = null;
    let coachFirstName: string | null = b?.first_name?.trim() || null;
    try {
      const { data: coachRow } = await sb
        .from("users")
        .select("name")
        .eq("id", order.coach_user_id)
        .maybeSingle();
      const firstWord = String(coachRow?.name ?? "").trim().split(/\s+/)[0] ?? "";
      const bilanSlug = normalizeSlug(firstWord);
      if (bilanSlug.length >= 2) bilanUrl = `${SITE_URL}/bilan-online/${bilanSlug}`;
      if (!coachFirstName && firstWord) coachFirstName = firstWord;
    } catch (e) {
      console.warn("[confirm-shop-payment] bilanUrl:", e instanceof Error ? e.message : e);
    }

    // Email de confirmation au client — best-effort.
    try {
      if (RESEND_API_KEY && order.customer_email) {
        const html = orderConfirmationHtml({
          firstName: order.customer_first_name ?? undefined,
          shopName,
          items,
          subtotalCents: order.subtotal_cents,
          discountCents: order.discount_cents,
          promoCode: order.promo_code,
          shippingCents: order.shipping_cents,
          totalCents: order.total_cents,
          address: order.shipping_address as Record<string, string> | null,
          aiScanUrl,
          bilanUrl,
          coachFirstName,
        });
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          signal: AbortSignal.timeout(8000),
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: `${shopName} <boutique@labase360.fr>`,
            reply_to: vendeurEmail || coachEmailFallback || "labaseverdun@gmail.com",
            to: [order.customer_email],
            subject: `Ta commande ${shopName} est confirmée 🌿`,
            html,
          }),
        });
      }
    } catch (e) {
      console.warn("[confirm-shop-payment] email client:", e instanceof Error ? e.message : e);
    }

    // Email de notification à la coach — canal fiable (le push est best-effort
    // et silencieux si l'abonnement n'existe pas). Contient TOUT le nécessaire
    // pour préparer l'envoi : coordonnées, adresse, produits, montant.
    try {
      if (RESEND_API_KEY) {
        const coachEmail = coachEmailFallback;
        if (coachEmail) {
          const customerName =
            [order.customer_first_name, order.customer_last_name].filter(Boolean).join(" ") || "Une cliente";
          const html = coachOrderNotificationHtml({
            shopName,
            customerName,
            customerEmail: order.customer_email,
            customerPhone: order.customer_phone,
            items,
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
              from: `La Base 360 <boutique@labase360.fr>`,
              // Répondre à cet email écrit directement à la cliente.
              reply_to: order.customer_email || "labaseverdun@gmail.com",
              to: [coachEmail],
              subject: `🛍️ Nouvelle commande ${shopName} — ${customerName}`,
              html,
            }),
          });
        }
      }
    } catch (e) {
      console.warn("[confirm-shop-payment] email coach:", e instanceof Error ? e.message : e);
    }

    // Push au distri — best-effort, complémentaire (mobile temps réel).
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
