// =============================================================================
// square-payment-webhook — Phase 2 page Résultat Bilan (chantier 2026-06-11).
//
// URL à coller par chaque coach dans SON dashboard Square Developer
// (Webhooks → Subscriptions, événement `payment.updated`) :
//   https://<project>.supabase.co/functions/v1/square-payment-webhook
//
// Multi-coach : chaque coach a son propre compte Square → sa propre clé de
// signature. L'événement contient `merchant_id` → on retrouve la config du
// coach (coach_payment_settings.square_merchant_id) et on vérifie la signature
// HMAC-SHA256 (header x-square-hmacsha256-signature, signé sur
// notification_url + raw body, comparaison constant-time).
//
// payment.updated COMPLETED → bilan_orders.status = paid (+ paid_at) via
// provider_order_id, puis push au coach (« 💶 X a payé son pack »).
//
// Déploiement : supabase functions deploy square-payment-webhook --no-verify-jwt
//   (Square ne fournit pas de JWT Supabase — l'auth EST la signature HMAC).
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// URL publique de cette fonction (entre dans le calcul de signature Square).
const NOTIFICATION_URL =
  Deno.env.get("SQUARE_WEBHOOK_URL") ?? `${SUPABASE_URL}/functions/v1/square-payment-webhook`;

async function hmacBase64(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

/** Comparaison constant-time (anti timing attack). */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("ok", { status: 200 });

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-square-hmacsha256-signature") ?? "";

    let event: {
      merchant_id?: string;
      type?: string;
      data?: { object?: { payment?: { id?: string; status?: string; order_id?: string } } };
    };
    try {
      event = JSON.parse(rawBody);
    } catch {
      return new Response("bad json", { status: 400 });
    }

    const merchantId = String(event.merchant_id ?? "").trim();
    if (!merchantId || !signature) return new Response("ignored", { status: 200 });

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Config du coach propriétaire de ce compte Square.
    const { data: settings } = await sb
      .from("coach_payment_settings")
      .select("coach_user_id, square_webhook_signature_key")
      .eq("square_merchant_id", merchantId)
      .maybeSingle();
    if (!settings?.square_webhook_signature_key) {
      // Merchant inconnu : on répond 200 pour ne pas faire retenter Square en
      // boucle, mais on ne traite rien.
      console.warn("[square-webhook] merchant inconnu", merchantId);
      return new Response("unknown merchant", { status: 200 });
    }

    // Vérification de signature (l'auth de ce endpoint).
    const expected = await hmacBase64(
      settings.square_webhook_signature_key,
      NOTIFICATION_URL + rawBody,
    );
    if (!timingSafeEqual(expected, signature)) {
      console.warn("[square-webhook] signature invalide pour", merchantId);
      return new Response("invalid signature", { status: 403 });
    }

    // Seuls les paiements aboutis nous intéressent.
    const payment = event.data?.object?.payment;
    if (event.type !== "payment.updated" || payment?.status !== "COMPLETED" || !payment.order_id) {
      return new Response("ok", { status: 200 });
    }

    // Commande correspondante (créée par create-payment-link).
    const { data: order } = await sb
      .from("bilan_orders")
      .select("id, status, prospect_first_name, program_name, amount_cents, coach_user_id")
      .eq("provider_order_id", payment.order_id)
      .maybeSingle();
    if (!order) return new Response("no matching order", { status: 200 });
    if (order.status === "paid") return new Response("already paid", { status: 200 }); // idempotent

    await sb
      .from("bilan_orders")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", order.id);

    // Push au coach — best-effort, ne bloque jamais le 200 vers Square.
    try {
      if (order.coach_user_id) {
        const { data: subs } = await sb
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth")
          .eq("user_id", order.coach_user_id);
        if (subs && subs.length > 0) {
          await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
            signal: AbortSignal.timeout(2500),
            method: "POST",
            headers: {
              Authorization: `Bearer ${SERVICE_KEY}`,
              "Content-Type": "application/json",
            },
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
      }
    } catch (e) {
      console.warn("[square-webhook] push:", e instanceof Error ? e.message : e);
    }

    return new Response("ok", { status: 200 });
  } catch (e) {
    console.warn("[square-webhook]", e instanceof Error ? e.message : e);
    // 200 : on ne veut pas que Square retente indéfiniment sur une erreur interne.
    return new Response("error", { status: 200 });
  }
});
