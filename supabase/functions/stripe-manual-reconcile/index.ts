// =============================================================================
// stripe-manual-reconcile — confirme les paiements Stripe « manuels » en attente.
// (audit 2026-07-27, constat #5)
//
// Contexte : les liens manuels Stripe (Mon panier / fin de bilan physique via
// create-manual-payment-link) sont des Payment Links partagés par WhatsApp/SMS.
// Le client paie sur SON téléphone → aucun retour vers l'app coach, et le modèle
// « chaque distri a son propre Stripe, aucun webhook à configurer » empêche une
// confirmation par webhook. Résultat AVANT ce fix : la commande restait `pending`
// pour toujours et le coach n'était jamais notifié (alors que le Square manuel,
// lui, est réconcilié par square-payment-webhook).
//
// Ce cron interroge Stripe (avec la clé secrète DU distri, côté serveur) pour
// chaque commande manuelle Stripe en attente : il liste les Checkout Sessions du
// Payment Link ; si une session est payée → commande `paid` + push « Paiement
// reçu » au coach. Substitut de webhook, 100 % côté serveur, zéro config distri.
//
// Déploiement : supabase functions deploy stripe-manual-reconcile --no-verify-jwt
// Cron : */20 * * * * (migration 20261205120000_stripe_manual_reconcile_cron.sql)
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Commandes manuelles Stripe en attente (14 derniers jours, borne de sûreté).
    const { data: orders } = await sb
      .from("bilan_orders")
      .select("id, coach_user_id, prospect_first_name, program_name, amount_cents, provider_payment_link_id")
      .eq("provider", "stripe")
      .eq("status", "pending")
      .is("online_bilan_id", null)
      .not("provider_payment_link_id", "is", null)
      .gte("created_at", since)
      .limit(200);

    if (!orders || orders.length === 0) return json({ ok: true, pending: 0, confirmed: 0 });

    // Clé secrète Stripe par coach (lue une fois par coach).
    const coachIds = [...new Set(orders.map((o) => o.coach_user_id).filter(Boolean))] as string[];
    const secretByCoach = new Map<string, string>();
    if (coachIds.length > 0) {
      const { data: settings } = await sb
        .from("coach_payment_settings")
        .select("coach_user_id, provider, active, stripe_secret_key")
        .in("coach_user_id", coachIds);
      for (const s of settings ?? []) {
        const secret = String(s.stripe_secret_key ?? "").trim();
        if (s.active && s.provider === "stripe" && secret.startsWith("sk_")) {
          secretByCoach.set(s.coach_user_id as string, secret);
        }
      }
    }

    let confirmed = 0;
    let checked = 0;

    for (const o of orders) {
      const secret = o.coach_user_id ? secretByCoach.get(o.coach_user_id as string) : undefined;
      const plink = String(o.provider_payment_link_id ?? "");
      if (!secret || !plink.startsWith("plink_")) continue;
      checked += 1;

      // Sessions Checkout liées à ce Payment Link (compte du distri).
      let paid = false;
      try {
        const res = await fetch(
          `https://api.stripe.com/v1/checkout/sessions?payment_link=${encodeURIComponent(plink)}&limit=10`,
          {
            method: "GET",
            signal: AbortSignal.timeout(8000),
            headers: { Authorization: `Bearer ${secret}` },
          },
        );
        if (res.ok) {
          const data = (await res.json()) as { data?: Array<{ payment_status?: string }> };
          paid = (data.data ?? []).some((s) => s.payment_status === "paid");
        } else {
          console.warn("[stripe-reconcile] list sessions", res.status);
        }
      } catch (e) {
        console.warn("[stripe-reconcile] fetch:", e instanceof Error ? e.message : e);
        continue;
      }
      if (!paid) continue;

      // Transition conditionnelle (anti double-notif si 2 runs se chevauchent).
      const { data: transitioned } = await sb
        .from("bilan_orders")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", o.id)
        .neq("status", "paid")
        .select("id");
      if (!transitioned || transitioned.length === 0) continue;
      confirmed += 1;

      // Push au coach (best-effort, ne bloque jamais la boucle).
      try {
        if (o.coach_user_id) {
          const { data: subs } = await sb
            .from("push_subscriptions")
            .select("endpoint, p256dh, auth")
            .eq("user_id", o.coach_user_id);
          if (subs && subs.length > 0) {
            await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
              method: "POST",
              signal: AbortSignal.timeout(2500),
              headers: { Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                subscriptions: subs,
                payload: {
                  title: "💶 Paiement reçu !",
                  body: `${o.prospect_first_name || "Un client"} a payé ${o.program_name} (${(o.amount_cents / 100).toFixed(0)} €)`,
                  url: "/encaissement",
                },
              }),
            });
          }
        }
      } catch (e) {
        console.warn("[stripe-reconcile] push:", e instanceof Error ? e.message : e);
      }
    }

    return json({ ok: true, pending: orders.length, checked, confirmed });
  } catch (e) {
    console.warn("[stripe-manual-reconcile]", e instanceof Error ? e.message : e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 200);
  }
});
