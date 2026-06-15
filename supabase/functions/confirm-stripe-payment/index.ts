// =============================================================================
// confirm-stripe-payment — confirmation de paiement Stripe SANS webhook
// (chantier Encaissement distri, 2026-06-15).
//
// Pourquoi pas un webhook : chaque distri a SON propre compte Stripe. Exiger
// qu'il configure un endpoint webhook + signing secret = trop technique. À la
// place, au retour de la caisse (success_url avec ?session_id=…), la page
// /resultat-bilan rappelle cette fonction. On revérifie le statut CÔTÉ SERVEUR
// en interrogeant l'API Stripe avec la clé secrète DU distri (jamais la valeur
// renvoyée par le navigateur) → impossible de simuler un paiement.
//
// Flow :
//   1. token → online_bilans (jamais d'id interne fourni par le client)
//   2. order par provider_order_id = session_id (créé par create-payment-link)
//   3. clé secrète du distri → GET /v1/checkout/sessions/{id}
//   4. payment_status === 'paid' → bilan_orders paid + push au distri (idempotent)
//
// Déploiement : supabase functions deploy confirm-stripe-payment --no-verify-jwt
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
    const body = (await req.json().catch(() => ({}))) as { token?: string; session_id?: string };
    const token = String(body.token ?? "").trim();
    const sessionId = String(body.session_id ?? "").trim();
    if (!token || !sessionId.startsWith("cs_")) return json({ paid: false });

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1. Bilan par token public.
    const { data: bilan } = await sb
      .from("online_bilans")
      .select("id, coach_user_id")
      .eq("result_token", token)
      .maybeSingle();
    if (!bilan?.coach_user_id) return json({ paid: false });

    // 2. Commande correspondante (créée par create-payment-link).
    const { data: order } = await sb
      .from("bilan_orders")
      .select("id, status, prospect_first_name, program_name, amount_cents, coach_user_id")
      .eq("provider_order_id", sessionId)
      .eq("online_bilan_id", bilan.id)
      .maybeSingle();
    if (!order) return json({ paid: false });
    if (order.status === "paid") return json({ paid: true }); // idempotent

    // 3. Clé secrète DU distri (lue en service_role, jamais exposée au client).
    const { data: settings } = await sb
      .from("coach_payment_settings")
      .select("stripe_secret_key")
      .eq("coach_user_id", bilan.coach_user_id)
      .maybeSingle();
    const secret = String(settings?.stripe_secret_key ?? "").trim();
    if (!secret.startsWith("sk_")) return json({ paid: false });

    // 4. Vérification serveur du statut réel auprès de Stripe.
    const stRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${secret}` },
    });
    if (!stRes.ok) {
      console.warn("[confirm-stripe-payment] Stripe", stRes.status);
      return json({ paid: false });
    }
    const session = (await stRes.json()) as { payment_status?: string };
    if (session.payment_status !== "paid") return json({ paid: false });

    await sb
      .from("bilan_orders")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", order.id);

    // Push au distri — best-effort, ne bloque jamais la réponse.
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
              title: "💶 Paiement reçu !",
              body: `${order.prospect_first_name || "Un prospect"} a payé ${order.program_name} (${(order.amount_cents / 100).toFixed(0)} €)`,
              url: "/crm",
            },
          }),
        });
      }
    } catch (e) {
      console.warn("[confirm-stripe-payment] push:", e instanceof Error ? e.message : e);
    }

    return json({ paid: true });
  } catch (e) {
    console.warn("[confirm-stripe-payment]", e instanceof Error ? e.message : e);
    return json({ paid: false });
  }
});
