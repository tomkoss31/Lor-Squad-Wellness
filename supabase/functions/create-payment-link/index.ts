// =============================================================================
// create-payment-link — Phase 2 page Résultat Bilan (chantier 2026-06-11).
//
// Appelée par la page publique /resultat-bilan/<token> quand le prospect clique
// « Je démarre ». Tout se résout CÔTÉ SERVEUR :
//   1. token → online_bilans (le prospect ne fournit jamais d'id interne)
//   2. coach → coach_payment_settings (credentials par coach, multi-fournisseur)
//   3. PRIX → pv_programs (on ne fait JAMAIS confiance à un prix client)
//   4. provider Square → POST /v2/online-checkout/payment-links (quick_pay)
//   5. insert bilan_orders (status pending) → renvoie { url }
//
// Si le coach n'a pas d'encaissement actif → { fallback: true } : la page
// affiche le message « ton coach t'envoie le lien de paiement » (flow Phase 1).
// Stripe : prévu (« on verra pour les distris ») → fallback poli pour l'instant.
//
// Déploiement : supabase functions deploy create-payment-link --no-verify-jwt
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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
    const body = (await req.json().catch(() => ({}))) as {
      token?: string;
      program_id?: string;
      redirect_url?: string;
    };
    const token = String(body.token ?? "").trim();
    const programId = String(body.program_id ?? "").trim();
    if (!token || !programId) return json({ error: "token et program_id requis" }, 400);

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1. Bilan par token public.
    const { data: bilan } = await sb
      .from("online_bilans")
      .select("id, first_name, coach_user_id")
      .eq("result_token", token)
      .maybeSingle();
    if (!bilan) return json({ error: "not_found" }, 200);

    // Anti-spam : max 5 liens créés par bilan.
    const { count: orderCount } = await sb
      .from("bilan_orders")
      .select("id", { count: "exact", head: true })
      .eq("online_bilan_id", bilan.id);
    if ((orderCount ?? 0) >= 5) {
      return json({ fallback: true, reason: "rate_limited" });
    }

    // 2. Encaissement du coach.
    if (!bilan.coach_user_id) return json({ fallback: true, reason: "no_coach" });
    const { data: settings } = await sb
      .from("coach_payment_settings")
      .select(
        "provider, active, square_access_token, square_location_id, square_env, stripe_secret_key",
      )
      .eq("coach_user_id", bilan.coach_user_id)
      .maybeSingle();
    if (!settings?.active) return json({ fallback: true, reason: "not_configured" });

    // 3. PRIX serveur depuis pv_programs (jamais le prix envoyé par le client).
    const { data: program } = await sb
      .from("pv_programs")
      .select("id, name, price_public, active")
      .eq("id", programId)
      .eq("active", true)
      .maybeSingle();
    if (!program || Number(program.price_public) <= 0) {
      return json({ error: "programme inconnu" }, 400);
    }
    const amountCents = Math.round(Number(program.price_public) * 100);

    // 4. Provider.
    if (settings.provider === "square") {
      if (!settings.square_access_token || !settings.square_location_id) {
        return json({ fallback: true, reason: "incomplete_config" });
      }
      const host =
        settings.square_env === "sandbox"
          ? "https://connect.squareupsandbox.com"
          : "https://connect.squareup.com";

      const sqRes = await fetch(`${host}/v2/online-checkout/payment-links`, {
        method: "POST",
        signal: AbortSignal.timeout(8000),
        headers: {
          Authorization: `Bearer ${settings.square_access_token}`,
          "Square-Version": SQUARE_VERSION,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idempotency_key: crypto.randomUUID(),
          quick_pay: {
            name: `${program.name} — La Base 360`,
            price_money: { amount: amountCents, currency: "EUR" },
            location_id: settings.square_location_id,
          },
          checkout_options: body.redirect_url ? { redirect_url: body.redirect_url } : undefined,
          payment_note: `Bilan ${bilan.first_name ?? ""} · ${program.name}`.slice(0, 500),
        }),
      });

      if (!sqRes.ok) {
        const errText = await sqRes.text();
        console.warn("[create-payment-link] Square error", sqRes.status, errText.slice(0, 300));
        // On ne casse pas le flow prospect : fallback message coach.
        return json({ fallback: true, reason: "provider_error" });
      }

      const sqData = (await sqRes.json()) as {
        payment_link?: { id?: string; url?: string; order_id?: string };
      };
      const link = sqData.payment_link;
      if (!link?.url) return json({ fallback: true, reason: "provider_error" });

      // 5. Trace la commande (le webhook la passera à paid).
      const { error: insErr } = await sb.from("bilan_orders").insert({
        online_bilan_id: bilan.id,
        coach_user_id: bilan.coach_user_id,
        prospect_first_name: bilan.first_name ?? "",
        program_id: program.id,
        program_name: program.name,
        amount_cents: amountCents,
        currency: "EUR",
        provider: "square",
        provider_payment_link_id: link.id ?? null,
        provider_order_id: link.order_id ?? null,
        payment_url: link.url,
      });
      if (insErr) console.warn("[create-payment-link] order insert:", insErr.message);

      return json({ url: link.url, provider: "square" });
    }

    // 4-bis. Stripe — chaque distri a SON propre compte Stripe (clé secrète à
    // lui). On crée une Checkout Session SUR SON compte : l'argent va 100 % chez
    // le distri, jamais sur un compte plateforme. Pas de Connect, pas de
    // commission. Confirmation au retour via confirm-stripe-payment (aucun
    // webhook à configurer côté distri → onboarding le plus simple possible).
    if (settings.provider === "stripe") {
      const secret = String(settings.stripe_secret_key ?? "").trim();
      if (!secret.startsWith("sk_")) {
        return json({ fallback: true, reason: "incomplete_config" });
      }

      // success_url DOIT contenir {CHECKOUT_SESSION_ID} (placeholder Stripe) pour
      // que la page retour puisse confirmer le paiement côté serveur.
      const base = body.redirect_url || `${SUPABASE_URL}`;
      const sep = base.includes("?") ? "&" : "?";
      const successUrl = `${base}${sep}session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = base.replace(/[?&]paid=1/, "");

      const form = new URLSearchParams();
      form.set("mode", "payment");
      form.set("success_url", successUrl);
      form.set("cancel_url", cancelUrl);
      form.set("line_items[0][quantity]", "1");
      form.set("line_items[0][price_data][currency]", "eur");
      form.set("line_items[0][price_data][unit_amount]", String(amountCents));
      form.set("line_items[0][price_data][product_data][name]", `${program.name} — La Base 360`);
      form.set(
        "payment_intent_data[description]",
        `Bilan ${bilan.first_name ?? ""} · ${program.name}`.slice(0, 500),
      );
      form.set("locale", "fr");

      const stRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        signal: AbortSignal.timeout(8000),
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      });

      if (!stRes.ok) {
        const errText = await stRes.text();
        console.warn("[create-payment-link] Stripe error", stRes.status, errText.slice(0, 300));
        return json({ fallback: true, reason: "provider_error" });
      }

      const stData = (await stRes.json()) as { id?: string; url?: string };
      if (!stData.url) return json({ fallback: true, reason: "provider_error" });

      const { error: insErr } = await sb.from("bilan_orders").insert({
        online_bilan_id: bilan.id,
        coach_user_id: bilan.coach_user_id,
        prospect_first_name: bilan.first_name ?? "",
        program_id: program.id,
        program_name: program.name,
        amount_cents: amountCents,
        currency: "EUR",
        provider: "stripe",
        provider_payment_link_id: stData.id ?? null,
        provider_order_id: stData.id ?? null,
        payment_url: stData.url,
      });
      if (insErr) console.warn("[create-payment-link] order insert:", insErr.message);

      return json({ url: stData.url, provider: "stripe" });
    }

    return json({ fallback: true, reason: "provider_not_supported" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.warn("[create-payment-link]", msg);
    return json({ fallback: true, reason: "server_error" });
  }
});
