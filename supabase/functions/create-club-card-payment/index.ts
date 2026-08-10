// =============================================================================
// create-club-card-payment — le site public du club vend ses cartes de visites.
//
// Appelée par /club (section « Choisis ta formule ») quand quelqu'un clique
// « Je commence » sur la carte 10 ou la carte 30. Tout se résout CÔTÉ SERVEUR :
//   1. slug du club → clubs (owner_user_id + settings)
//   2. PRIX ET VALIDITÉ → clubs.settings.cards.<type> — jamais le corps de la
//      requête. Un prix envoyé par le navigateur est un prix négociable.
//   3. coach propriétaire → coach_payment_settings (Square ou Stripe)
//   4. lien de paiement chez le fournisseur
//   5. insert bilan_orders (status pending, online_bilan_id NUL) → { url }
//
// Le webhook `square-payment-webhook` (ou `confirm-stripe-payment`) passera la
// commande à `paid` et enverra les deux mails — celui de l'acheteur, qui fait
// office de preuve d'achat au comptoir, et celui de la boîte du club.
//
// ⚠ CE QUE CETTE FONCTION NE FAIT PAS : créer la carte dans `member_cards`.
// La carte se rattache à un `client_id`, et un acheteur venu du site public
// n'a pas forcément de fiche. C'est donc un coach qui l'attribue dans BBC
// (décision Thomas : « le mail de paiement fait foi, donc manuelle »). Le mail
// interne se termine d'ailleurs par cette seule action à faire.
//
// Déploiement : supabase functions deploy create-club-card-payment --no-verify-jwt
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SQUARE_VERSION = "2026-05-20";
// Retour par défaut si l'appelant n'a pas passé de `redirect_url` (Stripe exige
// une success_url absolue, il ne peut pas rester vide).
const CLUB_FALLBACK_RETURN = "https://www.labase-nutrition.com/club";

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

/**
 * Échec métier : 200 + un code, jamais un statut d'erreur HTTP.
 *
 * `supabase.functions.invoke()` transforme toute réponse non-2xx en
 * `FunctionsHttpError` et NE REND PAS le corps au appelant : le front ne
 * saurait plus distinguer « email invalide » de « Square est tombé », et
 * afficherait le même message inutile dans les deux cas. Même parti pris que
 * `create-payment-link`, qui renvoie son `fallback` en 200 pour la même raison.
 * Les vraies erreurs de transport restent, elles, portées par le statut.
 */
function fail(code: string): Response {
  return json({ error: code }, 200);
}

// Volontairement permissif : il ne s'agit pas de valider une adresse mais
// d'attraper la faute de frappe évidente avant d'envoyer la personne payer.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405); // hors invoke

  try {
    const body = (await req.json().catch(() => ({}))) as {
      club_slug?: string;
      card_type?: number | string;
      first_name?: string;
      email?: string;
      redirect_url?: string;
    };

    const slug = String(body.club_slug ?? "verdun").trim().toLowerCase();
    const cardType = Number(body.card_type);
    const firstName = String(body.first_name ?? "").trim().slice(0, 60);
    const email = String(body.email ?? "").trim().toLowerCase().slice(0, 160);

    if (cardType !== 10 && cardType !== 30) return fail("card_type_invalide");
    if (firstName.length < 2) return fail("prenom_requis");
    if (!EMAIL_RE.test(email)) return fail("email_invalide");

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1. Le club.
    const { data: club } = await sb
      .from("clubs")
      .select("id, name, owner_user_id, settings, active")
      .eq("slug", slug)
      .maybeSingle();
    if (!club || club.active === false) return fail("club_inconnu");

    // 2. Prix et validité — source unique, la même que celle que BBC applique
    //    en attribuant la carte (bbc_assign_card lit ce même réglage). Sans ça,
    //    le site pourrait encaisser 80 € pour une carte que l'app facture 90.
    const cards = (club.settings as Record<string, unknown> | null)?.cards as
      | Record<string, { price?: number; days?: number }>
      | undefined;
    const conf = cards?.[String(cardType)];
    const priceEur = Number(conf?.price);
    const validityDays = Number(conf?.days);
    if (!Number.isFinite(priceEur) || priceEur <= 0 || !Number.isFinite(validityDays) || validityDays <= 0) {
      console.warn("[create-club-card-payment] tarif absent pour", slug, cardType);
      return fail("tarif_indisponible");
    }
    const amountCents = Math.round(priceEur * 100);
    const programId = `club-card-${cardType}`;
    const programName = `Carte ${cardType} visites — The Breakfast Club`;

    // Garde-fou anti-abus : quelqu'un qui martèle le bouton ne doit pas créer
    // 200 liens (chacun est un objet chez le fournisseur). 5 par email et par
    // heure laisse largement la place à une vraie hésitation.
    const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { count: recent } = await sb
      .from("bilan_orders")
      .select("id", { count: "exact", head: true })
      .eq("buyer_email", email)
      .gte("created_at", oneHourAgo);
    if ((recent ?? 0) >= 5) return fail("trop_de_tentatives");

    // 3. Encaissement du propriétaire du club.
    const { data: settings } = await sb
      .from("coach_payment_settings")
      .select("provider, active, square_access_token, square_location_id, square_env, stripe_secret_key")
      .eq("coach_user_id", club.owner_user_id)
      .maybeSingle();
    if (!settings?.active) return fail("encaissement_inactif");

    const note = `${programName} · ${firstName} (${email})`.slice(0, 500);

    // Commande tracée AVANT le lien : c'est elle que le webhook retrouvera.
    // (On la complète juste après avec l'id fournisseur.)
    const orderRow = {
      online_bilan_id: null as string | null,
      coach_user_id: club.owner_user_id,
      prospect_first_name: firstName,
      buyer_email: email,
      program_id: programId,
      program_name: programName,
      amount_cents: amountCents,
      currency: "EUR",
    };

    // 4. Square.
    if (settings.provider === "square") {
      if (!settings.square_access_token || !settings.square_location_id) {
        return fail("encaissement_incomplet");
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
            name: programName,
            price_money: { amount: amountCents, currency: "EUR" },
            location_id: settings.square_location_id,
          },
          checkout_options: body.redirect_url ? { redirect_url: body.redirect_url } : undefined,
          payment_note: note,
        }),
      });

      if (!sqRes.ok) {
        console.warn("[create-club-card-payment] Square", sqRes.status, (await sqRes.text()).slice(0, 300));
        return fail("fournisseur_indisponible");
      }
      const link = ((await sqRes.json()) as { payment_link?: { id?: string; url?: string; order_id?: string } }).payment_link;
      if (!link?.url) return fail("fournisseur_indisponible");

      // Fatal si l'insert échoue : sans cette ligne, le webhook ne reconnaîtra
      // pas le paiement — argent encaissé, personne prévenue, aucune trace.
      // On préfère ne pas donner le lien du tout.
      const { error: insErr } = await sb.from("bilan_orders").insert({
        ...orderRow,
        provider: "square",
        provider_payment_link_id: link.id ?? null,
        provider_order_id: link.order_id ?? null,
        payment_url: link.url,
      });
      if (insErr) {
        console.warn("[create-club-card-payment] insert (fatal):", insErr.message);
        return fail("trace_impossible");
      }
      return json({ url: link.url, provider: "square" });
    }

    // 4-bis. Stripe — Checkout Session sur le compte du distri (cf.
    // create-payment-link : pas de Connect, l'argent va 100 % chez lui).
    if (settings.provider === "stripe") {
      const secret = String(settings.stripe_secret_key ?? "").trim();
      if (!secret.startsWith("sk_")) return fail("encaissement_incomplet");

      const base = body.redirect_url || CLUB_FALLBACK_RETURN;
      const sep = base.includes("?") ? "&" : "?";
      const form = new URLSearchParams();
      form.set("mode", "payment");
      form.set("success_url", `${base}${sep}session_id={CHECKOUT_SESSION_ID}`);
      form.set("cancel_url", base.replace(/[?&]paid=1/, ""));
      form.set("customer_email", email);
      form.set("line_items[0][quantity]", "1");
      form.set("line_items[0][price_data][currency]", "eur");
      form.set("line_items[0][price_data][unit_amount]", String(amountCents));
      form.set("line_items[0][price_data][product_data][name]", programName);
      form.set("payment_intent_data[description]", note);
      form.set("locale", "fr");

      const stRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        signal: AbortSignal.timeout(8000),
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });
      if (!stRes.ok) {
        console.warn("[create-club-card-payment] Stripe", stRes.status, (await stRes.text()).slice(0, 300));
        return fail("fournisseur_indisponible");
      }
      const st = (await stRes.json()) as { id?: string; url?: string };
      if (!st.url) return fail("fournisseur_indisponible");

      const { error: insErr } = await sb.from("bilan_orders").insert({
        ...orderRow,
        provider: "stripe",
        provider_payment_link_id: st.id ?? null,
        provider_order_id: st.id ?? null,
        payment_url: st.url,
      });
      if (insErr) {
        console.warn("[create-club-card-payment] insert (fatal):", insErr.message);
        return fail("trace_impossible");
      }
      return json({ url: st.url, provider: "stripe" });
    }

    return fail("fournisseur_non_supporte");
  } catch (e) {
    console.warn("[create-club-card-payment]", e instanceof Error ? e.message : e);
    return fail("erreur_serveur");
  }
});
