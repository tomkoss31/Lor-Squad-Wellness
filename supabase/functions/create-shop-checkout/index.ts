// =============================================================================
// create-shop-checkout — Checkout boutique HL SKIN (chantier 2026-07-10).
//
// Appelée par la page publique /boutique/<slug> au moment de payer. TOUT est
// recalculé CÔTÉ SERVEUR (on ne fait jamais confiance aux prix/remises client) :
//   1. slug → get_boutique_by_slug (coach_user_id, boutique active)
//   2. prix de CHAQUE ligne depuis shop_products (jamais le prix client)
//   3. code promo revalidé depuis promo_codes (expiry / actif / max_uses)
//   4. frais de port : offerts ≥ 90 €, sinon 8,90 €
//   5. INSERT shop_orders (pending) + shop_order_items  ← lead capturé AVANT paiement
//   6. si Stripe branché → Checkout Session SUR LE COMPTE DU DISTRI (multi-lignes
//      + coupon remise + ligne port) → { order_id, url }
//      sinon → { order_id, fallback:true } (la commande/lead est déjà en base)
//
// Déploiement : supabase functions deploy create-shop-checkout --no-verify-jwt
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const FREE_SHIPPING_CENTS = 9000; // 90 €
const SHIPPING_CENTS = 890; // 8,90 €

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

type InItem = { product_id?: string; quantity?: number };

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const body = (await req.json().catch(() => ({}))) as {
      slug?: string;
      items?: InItem[];
      customer?: {
        email?: string;
        first_name?: string;
        last_name?: string;
        phone?: string;
        address?: Record<string, string>;
      };
      promo_code?: string;
      redirect_base?: string;
      idempotency_key?: string;
    };

    const slug = String(body.slug ?? "").trim();
    const email = String(body.customer?.email ?? "").trim().toLowerCase();
    const items = Array.isArray(body.items) ? body.items : [];
    if (!slug) return json({ error: "slug requis" }, 400);
    if (!isEmail(email)) return json({ error: "email_invalide" }, 400);
    if (items.length === 0) return json({ error: "panier_vide" }, 400);

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1. Résolution boutique (coach actif).
    const { data: boutique } = await sb.rpc("get_boutique_by_slug", { p_slug: slug });
    const coachUserId = (boutique as { user_id?: string } | null)?.user_id;
    if (!coachUserId) return json({ error: "boutique_introuvable" }, 404);

    // 2. Prix serveur : on récupère les produits demandés.
    const ids = [...new Set(items.map((i) => String(i.product_id ?? "")).filter(Boolean))];
    const { data: products } = await sb
      .from("shop_products")
      .select("id, slug, name, price_ttc, active")
      .in("id", ids)
      .eq("active", true);
    const byId = new Map((products ?? []).map((p) => [p.id as string, p]));

    const lines = items
      .map((i) => {
        const p = byId.get(String(i.product_id ?? ""));
        const qty = Math.max(1, Math.min(99, Math.round(Number(i.quantity ?? 1))));
        if (!p) return null;
        const unit = Math.round(Number(p.price_ttc) * 100);
        return {
          product_id: p.id as string,
          slug: p.slug as string,
          name: p.name as string,
          unit_cents: unit,
          quantity: qty,
          line_cents: unit * qty,
        };
      })
      .filter((l): l is NonNullable<typeof l> => !!l);

    if (lines.length === 0) return json({ error: "produits_invalides" }, 400);
    const subtotalCents = lines.reduce((s, l) => s + l.line_cents, 0);

    // 3. Code promo revalidé serveur.
    let discountCents = 0;
    let promoCode: string | null = null;
    let promoId: string | null = null;
    const rawPromo = String(body.promo_code ?? "").trim();
    if (rawPromo) {
      const codeUp = rawPromo.toUpperCase().replace(/\s/g, "");
      const { data: promo } = await sb
        .from("promo_codes")
        .select("id, code, kind, value, active, max_uses, used_count, starts_at, expires_at")
        .eq("coach_user_id", coachUserId)
        .ilike("code", codeUp)
        .maybeSingle();
      const now = Date.now();
      const valid =
        promo &&
        promo.active &&
        (!promo.starts_at || new Date(promo.starts_at).getTime() <= now) &&
        (!promo.expires_at || new Date(promo.expires_at).getTime() >= now) &&
        (promo.max_uses == null || promo.used_count < promo.max_uses);
      if (valid) {
        const raw =
          promo.kind === "amount"
            ? Math.round(Number(promo.value) * 100)
            : Math.round((subtotalCents * Number(promo.value)) / 100);
        discountCents = Math.min(raw, subtotalCents);
        promoCode = promo.code;
        promoId = promo.id;
      }
    }

    // 4. Frais de port.
    const afterDiscount = subtotalCents - discountCents;
    const shippingCents = afterDiscount >= FREE_SHIPPING_CENTS ? 0 : SHIPPING_CENTS;
    const totalCents = afterDiscount + shippingCents;

    // 5. Commande (pending) + lignes — LEAD CAPTURÉ avant paiement.
    const { data: order, error: ordErr } = await sb
      .from("shop_orders")
      .insert({
        coach_user_id: coachUserId,
        boutique_slug: slug,
        customer_email: email,
        customer_first_name: body.customer?.first_name ?? null,
        customer_last_name: body.customer?.last_name ?? null,
        customer_phone: body.customer?.phone ?? null,
        shipping_address: body.customer?.address ?? null,
        currency: "EUR",
        subtotal_cents: subtotalCents,
        discount_cents: discountCents,
        promo_code: promoCode,
        promo_code_id: promoId,
        shipping_cents: shippingCents,
        total_cents: totalCents,
        status: "pending",
        provider: "stripe",
      })
      .select("id")
      .single();
    if (ordErr || !order) {
      console.warn("[create-shop-checkout] order insert:", ordErr?.message);
      return json({ error: "order_failed" }, 500);
    }
    await sb.from("shop_order_items").insert(
      lines.map((l) => ({
        order_id: order.id,
        product_id: l.product_id,
        product_slug: l.slug,
        product_name: l.name,
        unit_price_cents: l.unit_cents,
        quantity: l.quantity,
        line_total_cents: l.line_cents,
      })),
    );

    // 6. Stripe (compte du distri). Sinon fallback : la commande/lead est en base.
    const { data: settings } = await sb
      .from("coach_payment_settings")
      .select("provider, active, stripe_secret_key")
      .eq("coach_user_id", coachUserId)
      .maybeSingle();
    const secret = String(settings?.stripe_secret_key ?? "").trim();
    if (!settings?.active || settings.provider !== "stripe" || !secret.startsWith("sk_")) {
      return json({ order_id: order.id, fallback: true, reason: "not_configured" });
    }

    const base = body.redirect_base || SUPABASE_URL;
    const sep = base.includes("?") ? "&" : "?";
    const successUrl = `${base}${sep}checkout=success&order=${order.id}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${base}${sep}checkout=cancel`;

    // Coupon remise (Stripe n'accepte pas de ligne négative).
    let couponId: string | null = null;
    if (discountCents > 0) {
      const cForm = new URLSearchParams();
      cForm.set("amount_off", String(discountCents));
      cForm.set("currency", "eur");
      cForm.set("duration", "once");
      cForm.set("name", `Code ${promoCode ?? "promo"}`);
      const cRes = await fetch("https://api.stripe.com/v1/coupons", {
        method: "POST",
        signal: AbortSignal.timeout(8000),
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: cForm.toString(),
      });
      if (!cRes.ok) {
        console.warn("[create-shop-checkout] coupon", cRes.status, (await cRes.text()).slice(0, 200));
        return json({ order_id: order.id, fallback: true, reason: "provider_error" });
      }
      couponId = ((await cRes.json()) as { id?: string }).id ?? null;
    }

    const form = new URLSearchParams();
    form.set("mode", "payment");
    form.set("success_url", successUrl);
    form.set("cancel_url", cancelUrl);
    form.set("customer_email", email);
    form.set("locale", "fr");
    form.set("metadata[order_id]", order.id);
    lines.forEach((l, i) => {
      form.set(`line_items[${i}][quantity]`, String(l.quantity));
      form.set(`line_items[${i}][price_data][currency]`, "eur");
      form.set(`line_items[${i}][price_data][unit_amount]`, String(l.unit_cents));
      form.set(`line_items[${i}][price_data][product_data][name]`, l.name);
    });
    if (shippingCents > 0) {
      const si = lines.length;
      form.set(`line_items[${si}][quantity]`, "1");
      form.set(`line_items[${si}][price_data][currency]`, "eur");
      form.set(`line_items[${si}][price_data][unit_amount]`, String(shippingCents));
      form.set(`line_items[${si}][price_data][product_data][name]`, "Frais de port");
    }
    if (couponId) form.set("discounts[0][coupon]", couponId);

    const stRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      signal: AbortSignal.timeout(8000),
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": String(body.idempotency_key ?? order.id),
      },
      body: form.toString(),
    });
    if (!stRes.ok) {
      console.warn("[create-shop-checkout] Stripe", stRes.status, (await stRes.text()).slice(0, 300));
      return json({ order_id: order.id, fallback: true, reason: "provider_error" });
    }
    const st = (await stRes.json()) as { id?: string; url?: string };
    if (!st.url || !st.id) return json({ order_id: order.id, fallback: true, reason: "provider_error" });

    await sb
      .from("shop_orders")
      .update({ provider_session_id: st.id, payment_url: st.url })
      .eq("id", order.id);

    return json({ order_id: order.id, url: st.url });
  } catch (e) {
    console.warn("[create-shop-checkout]", e instanceof Error ? e.message : e);
    return json({ error: "server_error" }, 500);
  }
});
