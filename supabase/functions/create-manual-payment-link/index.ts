// =============================================================================
// create-manual-payment-link — lien de paiement « montant libre »
// (chantier Encaissement distri, 2026-06-15 ; Square ajouté 2026-07-16).
//
// Cas d'usage : le distri veut encaisser HORS bilan online (client au comptoir,
// panier perso, montant sur-mesure — utilisé par PanierPage « Mon panier » ET
// ThankYouStep « fin de bilan physique ») et envoyer un lien par WhatsApp/SMS.
//
// Sécurité : appel AUTHENTIFIÉ (JWT du distri connecté). On lit auth.uid() →
// le distri ne peut créer un lien que sur SON propre compte (Square ou
// Stripe). Les credentials restent CÔTÉ SERVEUR (jamais dans le navigateur).
// Le montant est validé serveur (bornes), pas de confiance aveugle au front.
//
// Multi-provider (même logique que create-payment-link) :
//   - Square → POST /v2/online-checkout/payment-links (quick_pay), confirmé
//     par le webhook square-payment-webhook (match sur provider_order_id,
//     online_bilan_id peut être null).
//   - Stripe → Payment Link permanent (POST /v1/prices puis /v1/payment_links).
// Trace dans bilan_orders (online_bilan_id null, program_id 'manual').
//
// Déploiement : supabase functions deploy create-manual-payment-link
//   (verify_jwt PAR DÉFAUT = true → le gateway exige déjà un JWT valide).
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SQUARE_VERSION = "2026-05-20";

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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

    // Qui appelle ? (JWT du distri connecté)
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const coachId = userData?.user?.id;
    if (!coachId) return json({ error: "unauthorized" }, 401);

    const body = (await req.json().catch(() => ({}))) as {
      amount_euros?: number | string;
      description?: string;
      client_name?: string;
    };
    const amount = Number(body.amount_euros);
    const description = String(body.description ?? "").trim().slice(0, 200) || "Programme La Base 360";
    const clientName = String(body.client_name ?? "").trim().slice(0, 120);

    if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) {
      return json({ error: "montant invalide" }, 400);
    }
    const amountCents = Math.round(amount * 100);

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Encaissement du distri (ses credentials, lues en service_role).
    const { data: settings } = await sb
      .from("coach_payment_settings")
      .select("provider, active, stripe_secret_key, square_access_token, square_location_id, square_env")
      .eq("coach_user_id", coachId)
      .maybeSingle();
    if (!settings?.active) return json({ error: "not_configured" }, 200);

    // ── Square — Payment Link quick_pay (même pattern que create-payment-link) ──
    if (settings.provider === "square") {
      const squareToken = String(settings.square_access_token ?? "").trim();
      const squareLoc = String(settings.square_location_id ?? "").trim();
      if (!squareToken || !squareLoc) return json({ error: "not_configured" }, 200);

      const host =
        settings.square_env === "sandbox"
          ? "https://connect.squareupsandbox.com"
          : "https://connect.squareup.com";

      const sqRes = await fetch(`${host}/v2/online-checkout/payment-links`, {
        method: "POST",
        signal: AbortSignal.timeout(8000),
        headers: {
          Authorization: `Bearer ${squareToken}`,
          "Square-Version": SQUARE_VERSION,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idempotency_key: crypto.randomUUID(),
          quick_pay: {
            name: description,
            price_money: { amount: amountCents, currency: "EUR" },
            location_id: squareLoc,
          },
          payment_note: clientName ? `${description} · ${clientName}`.slice(0, 500) : description.slice(0, 500),
        }),
      });
      if (!sqRes.ok) {
        console.warn("[manual-link] Square", sqRes.status, (await sqRes.text()).slice(0, 300));
        return json({ error: "provider_error" }, 200);
      }
      const sqData = (await sqRes.json()) as {
        payment_link?: { id?: string; url?: string; order_id?: string };
      };
      const link = sqData.payment_link;
      if (!link?.url) return json({ error: "provider_error" }, 200);

      const { error: insErr } = await sb.from("bilan_orders").insert({
        online_bilan_id: null,
        coach_user_id: coachId,
        prospect_first_name: clientName,
        program_id: "manual",
        program_name: description,
        amount_cents: amountCents,
        currency: "EUR",
        provider: "square",
        provider_payment_link_id: link.id ?? null,
        provider_order_id: link.order_id ?? link.id ?? null,
        payment_url: link.url,
      });
      if (insErr) console.warn("[manual-link] order insert:", insErr.message);

      return json({ url: link.url, provider: "square" });
    }

    if (settings.provider !== "stripe") return json({ error: "not_configured" }, 200);
    const secret = String(settings.stripe_secret_key ?? "").trim();
    if (!secret.startsWith("sk_")) return json({ error: "not_configured" }, 200);

    const stripeHeaders = {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    };

    // 1. Price (montant + nom du produit).
    const priceForm = new URLSearchParams();
    priceForm.set("unit_amount", String(amountCents));
    priceForm.set("currency", "eur");
    priceForm.set("product_data[name]", description);
    const priceRes = await fetch("https://api.stripe.com/v1/prices", {
      method: "POST",
      signal: AbortSignal.timeout(8000),
      headers: stripeHeaders,
      body: priceForm.toString(),
    });
    if (!priceRes.ok) {
      console.warn("[manual-link] price", priceRes.status, (await priceRes.text()).slice(0, 200));
      return json({ error: "provider_error" }, 200);
    }
    const price = (await priceRes.json()) as { id?: string };
    if (!price.id) return json({ error: "provider_error" }, 200);

    // 2. Payment Link (URL permanente partageable).
    const linkForm = new URLSearchParams();
    linkForm.set("line_items[0][price]", price.id);
    linkForm.set("line_items[0][quantity]", "1");
    const linkRes = await fetch("https://api.stripe.com/v1/payment_links", {
      method: "POST",
      signal: AbortSignal.timeout(8000),
      headers: stripeHeaders,
      body: linkForm.toString(),
    });
    if (!linkRes.ok) {
      console.warn("[manual-link] link", linkRes.status, (await linkRes.text()).slice(0, 200));
      return json({ error: "provider_error" }, 200);
    }
    const link = (await linkRes.json()) as { id?: string; url?: string };
    if (!link.url) return json({ error: "provider_error" }, 200);

    // Trace (online_bilan_id null = lien manuel hors bilan).
    const { error: insErr } = await sb.from("bilan_orders").insert({
      online_bilan_id: null,
      coach_user_id: coachId,
      prospect_first_name: clientName,
      program_id: "manual",
      program_name: description,
      amount_cents: amountCents,
      currency: "EUR",
      provider: "stripe",
      provider_payment_link_id: link.id ?? null,
      provider_order_id: link.id ?? null,
      payment_url: link.url,
    });
    if (insErr) console.warn("[manual-link] order insert:", insErr.message);

    return json({ url: link.url });
  } catch (e) {
    console.warn("[create-manual-payment-link]", e instanceof Error ? e.message : e);
    return json({ error: "server_error" }, 200);
  }
});
