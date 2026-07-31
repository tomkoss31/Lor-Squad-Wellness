// =============================================================================
// campaign-send — envoie une campagne (chantier Campagnes, étape 5).
//
// Appelé depuis l'admin (JWT admin). Modes :
//   dry-run : ne envoie RIEN, renvoie l'échantillon compilé + le compte.
//   send    : envoie réellement, par LOT (résumable) — ne prend que les
//             destinataires pas encore envoyés (sent_at IS NULL), traite au
//             plus MAX_PER_CALL, renvoie `remaining` ; l'UI rappelle jusqu'à 0.
//             (600 emails dépassent le timeout d'une edge → on découpe.)
//
// Sécurité : verify_jwt côté déploiement + contrôle role='admin' ici.
// Exclusion finale des désabonnés (email_suppressions) au moment de l'envoi.
// Chaque mail porte un lien + en-tête List-Unsubscribe (désabo 1-clic).
//
// Rich  → compileCampaignHtml (style brandé, PAS les CTA forcés de la
//         newsletter). Plain → compilePlainText.
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import {
  compileCampaignHtml,
  compilePlainText,
  isRichEmpty,
} from "./campaign-html.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const MAX_PER_CALL = 120; // marge sous le timeout edge

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
const norm = (e: string) => e.trim().toLowerCase();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // ── auth admin ──
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: userData } = await userClient.auth.getUser();
  const uid = userData?.user?.id;
  if (!uid) return json({ error: "unauthorized" }, 401);

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: me } = await sb.from("users").select("role").eq("id", uid).maybeSingle();
  if (!me || (me as { role?: string }).role !== "admin") return json({ error: "forbidden" }, 403);

  let body: { campaign_id?: string; mode?: "dry-run" | "send"; scheduledAt?: string; delayMs?: number };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const { campaign_id, mode = "dry-run", scheduledAt } = body;
  const delayMs = typeof body.delayMs === "number" ? body.delayMs : 1500;
  if (!campaign_id) return json({ error: "missing_campaign_id" }, 400);

  const { data: campaign } = await sb.from("campaigns").select("*").eq("id", campaign_id).maybeSingle();
  if (!campaign) return json({ error: "campaign_not_found" }, 404);
  const c = campaign as Record<string, unknown>;

  // destinataires pas encore envoyés
  const { data: recipsRaw } = await sb
    .from("campaign_recipients")
    .select("id, email, first_name")
    .eq("campaign_id", campaign_id)
    .is("sent_at", null);
  const recips = (recipsRaw ?? []) as { id: string; email: string; first_name: string | null }[];

  // exclusion finale des désabonnés
  const emails = recips.map((r) => r.email);
  let supSet = new Set<string>();
  if (emails.length) {
    const { data: sup } = await sb.from("email_suppressions").select("email").in("email", emails);
    supSet = new Set((sup ?? []).map((s) => norm((s as { email: string }).email)));
  }
  const targets = recips.filter((r) => !supSet.has(norm(r.email)));

  if (targets.length === 0) return json({ error: "no_recipients", message: "Aucun destinataire à envoyer (déjà envoyés ou tous désabonnés)." }, 400);

  const subject = (c.subject as string)?.trim() || (c.title as string) || "La Base 360";
  const from = (c.from_email as string) || "bonjour@labase360.fr";
  const replyTo = (c.reply_to as string) || "labaseverdun@gmail.com";
  const type = (c.type as string) === "plain" ? "plain" : "rich";
  // Désinscription : edge dédiée (GET = page, POST = 1-clic Gmail). `r` = id du
  // destinataire (uuid aléatoire = jeton non énumérable).
  const unsubUrlFor = (recipientId: string) => `${SUPABASE_URL}/functions/v1/campaign-unsubscribe?r=${recipientId}`;

  // Garde-fou contenu vide : on ne compile/n'envoie pas un mail blanc.
  const empty = type === "plain" ? !(c.body_text as string)?.trim() : isRichEmpty(c.body_json);
  if (empty) {
    return json({ error: "campaign_empty", message: "Ajoute du contenu (un titre, un texte ou une section) avant d'envoyer." }, 400);
  }

  // ── dry-run : compile un échantillon, n'envoie rien ──
  if (mode === "dry-run") {
    const s = targets[0];
    const unsub = unsubUrlFor(s.id);
    const html = type === "rich" ? compileCampaignHtml(c.body_json, s.first_name, unsub) : null;
    const text = type === "plain" ? compilePlainText(c.body_text as string, s.first_name, unsub) : null;
    return json({
      ok: true,
      mode: "dry-run",
      would_send: targets.length,
      subject,
      from,
      reply_to: replyTo,
      sample: { to: s.email, html_length: html?.length ?? null, text_preview: text?.slice(0, 300) ?? null },
    });
  }

  // ── send : par lot, résumable ──
  if (!RESEND_API_KEY) return json({ error: "resend_not_configured" }, 500);
  await sb.from("campaigns").update({ status: scheduledAt ? "scheduled" : "sending" }).eq("id", campaign_id);

  const batch = targets.slice(0, MAX_PER_CALL);
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < batch.length; i++) {
    const r = batch[i];
    const unsub = unsubUrlFor(r.id);
    const html = type === "rich" ? compileCampaignHtml(c.body_json, r.first_name, unsub) : undefined;
    const text = type === "plain" ? compilePlainText(c.body_text as string, r.first_name, unsub) : undefined;
    const scheduled_at = scheduledAt ? new Date(new Date(scheduledAt).getTime() + i * delayMs).toISOString() : undefined;

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [r.email],
          subject,
          ...(html ? { html } : {}),
          ...(text ? { text } : {}),
          reply_to: replyTo,
          headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
          ...(scheduled_at ? { scheduled_at } : {}),
        }),
      });
      const b = await res.json().catch(() => ({}));
      if (res.ok) {
        await sb.from("campaign_recipients").update({ sent_at: new Date().toISOString(), resend_message_id: b?.id ?? null, send_error: null }).eq("id", r.id);
        sent++;
      } else {
        await sb.from("campaign_recipients").update({ send_error: b?.message ?? `resend_${res.status}` }).eq("id", r.id);
        failed++;
      }
    } catch (e) {
      await sb.from("campaign_recipients").update({ send_error: e instanceof Error ? e.message : "send_failed" }).eq("id", r.id);
      failed++;
    }
    // envoi immédiat : petit délai anti-rafale. Programmé : pas d'attente (les
    // scheduled_at étalent la délivrance côté Resend).
    if (!scheduledAt && i < batch.length - 1) await sleep(delayMs);
  }

  const remaining = targets.length - batch.length;

  // Compteurs + statut final quand le dernier lot est parti.
  if (remaining === 0) {
    const { count } = await sb
      .from("campaign_recipients")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign_id)
      .not("sent_at", "is", null);
    await sb
      .from("campaigns")
      .update({ status: "sent", sent_at: new Date().toISOString(), recipient_count: count ?? 0 })
      .eq("id", campaign_id);
  }

  return json({ ok: true, mode: "send", sent, failed, remaining, scheduled: Boolean(scheduledAt) });
});
