// =============================================================================
// shop-relance-notifier — relances boutique HL SKIN (cron horaire, 2026-07-12).
//
// 1. PANIER ABANDONNÉ : commande restée `pending` (lead capturé mais paiement
//    non finalisé) entre 2 h et 72 h → email de relance douce. 1 seule fois
//    (relance_email_sent_at).
// 2. ALERTE COACH panier abandonné → email À LA COACH avec les coordonnées du
//    prospect pour un rappel personnel. 1 seule fois
//    (coach_abandon_alert_sent_at, drapeau DISTINCT de la relance client).
// 3. DEMANDE D'AVIS : commande `paid` depuis ≥ 7 jours → email invitant à
//    laisser un avis (alimente les témoignages skin). 1 seule fois
//    (review_request_sent_at).
//
// ⚠️ Incident 2026-08-07 : la coach n'était prévenue de RIEN (ni commande payée,
// ni panier abandonné) — le seul canal était un push, muet pour qui n'a pas
// d'abonnement. Toute info qui demande une ACTION part désormais par email.
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
const euro = (cents: number) =>
  (Number(cents ?? 0) / 100).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " €";

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

async function sendEmail(
  shopName: string,
  to: string,
  subject: string,
  html: string,
  replyTo?: string,
) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(8000),
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `${shopName} <boutique@labase360.fr>`,
      reply_to: replyTo || "labaseverdun@gmail.com",
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
  const result = { abandoned: 0, coach_alerts: 0, review: 0 };

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

  // Cache email coach (adresse de connexion auth.users) par user_id.
  const coachEmailCache = new Map<string, string | null>();
  async function coachEmail(userId: string | null): Promise<string | null> {
    if (!userId) return null;
    if (coachEmailCache.has(userId)) return coachEmailCache.get(userId)!;
    let email: string | null = null;
    try {
      const { data } = await sb.auth.admin.getUserById(userId);
      email = data?.user?.email ?? null;
    } catch (e) {
      console.warn("[shop-relance-notifier] coachEmail:", e instanceof Error ? e.message : e);
    }
    coachEmailCache.set(userId, email);
    return email;
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

  // ── 2. ALERTE COACH — panier abandonné ─────────────────────────────────────
  // Un panier abandonné est un prospect chaud (email + tél + adresse déjà
  // donnés) : la coach doit pouvoir décrocher son téléphone. Drapeau distinct
  // de la relance client pour que l'échec de l'un ne masque pas l'autre.
  try {
    const from = new Date(Date.now() - 72 * 3600 * 1000).toISOString();
    const to = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    const { data: orders } = await sb
      .from("shop_orders")
      .select(
        "id, coach_user_id, boutique_slug, customer_email, customer_first_name, customer_last_name, customer_phone, total_cents, created_at",
      )
      .eq("status", "pending")
      .is("coach_abandon_alert_sent_at", null)
      .gte("created_at", from)
      .lte("created_at", to)
      .limit(40);

    for (const o of orders ?? []) {
      const mail = await coachEmail(o.coach_user_id);
      if (!mail) {
        // Pas d'adresse coach → on ne marque PAS comme envoyé (retry au prochain
        // passage), mais on le dit dans les logs : plus de panne silencieuse.
        console.warn("[shop-relance-notifier] pas d'email coach pour", o.coach_user_id);
        continue;
      }
      const name = await shopName(o.boutique_slug);
      const who =
        [o.customer_first_name, o.customer_last_name].filter(Boolean).join(" ") || "Une visiteuse";

      // Détail des lignes du panier abandonné.
      const { data: items } = await sb
        .from("shop_order_items")
        .select("product_name, quantity, line_total_cents")
        .eq("order_id", o.id);
      const rows = (items ?? [])
        .map(
          (i) =>
            `<tr><td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#232620;">${esc(i.product_name)} × ${i.quantity}</td><td align="right" style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#232620;">${euro(i.line_total_cents)}</td></tr>`,
        )
        .join("");

      const html = shell(
        "Panier abandonné",
        `<div style="font-size:20px;">🛒 ${esc(who)} n'a pas finalisé</div>
         <p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#6E7268;margin:12px 0 16px;">
           Elle a rempli ses coordonnées puis quitté la caisse. C'est un contact chaud :
           un message ou un appel change souvent tout. Elle a aussi reçu une relance automatique.
         </p>
         <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;font-size:13px;color:#232620;margin-bottom:14px;">
           ${o.customer_email ? `<tr><td style="padding:3px 0;color:#6E7268;">Email</td><td align="right"><a href="mailto:${esc(o.customer_email)}" style="color:#232620;">${esc(o.customer_email)}</a></td></tr>` : ""}
           ${o.customer_phone ? `<tr><td style="padding:3px 0;color:#6E7268;">Téléphone</td><td align="right"><a href="tel:${esc(o.customer_phone)}" style="color:#232620;">${esc(o.customer_phone)}</a></td></tr>` : ""}
         </table>
         ${rows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E2DED4;border-bottom:1px solid #E2DED4;margin:6px 0 10px;">${rows}</table>` : ""}
         <p style="font-family:Arial,sans-serif;font-size:14px;color:#232620;margin:10px 0 18px;">
           Panier : <b>${euro(o.total_cents)}</b>
         </p>
         <div style="margin:6px 0 4px;">${cta(`${SITE_URL}/ma-boutique`, "Voir mes commandes")}</div>
         <p style="font-family:Arial,sans-serif;font-size:12px;color:#847F72;margin-top:16px;">
           « Répondre » à cet email écrit directement à ${esc(o.customer_first_name || "la personne")}.
         </p>`,
        name,
      );
      await sendEmail(
        "La Base 360",
        mail,
        `🛒 Panier abandonné ${name} — ${who} (${euro(o.total_cents)})`,
        html,
        o.customer_email ?? undefined,
      );
      await sb.from("shop_orders").update({ coach_abandon_alert_sent_at: nowIso }).eq("id", o.id);
      result.coach_alerts++;
    }
  } catch (e) {
    console.warn("[shop-relance-notifier] coach alert:", e instanceof Error ? e.message : e);
  }

  // ── 3. DEMANDE D'AVIS POST-ACHAT ───────────────────────────────────────────
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
