// =============================================================================
// lead-relaunch-send — Outil interne de relance des leads dormants par email
// (bilans santé remplis puis jamais recontactés) via Resend.
//
// PAS un endpoint app / PAS appelé depuis l'UI : outil opéré directement
// (CLI/Claude Code) en amont du futur chantier "Relances" dans l'admin.
// Auth = clé service_role en Bearer (pas de session utilisateur ici) —
// déployé avec --no-verify-jwt, le contrôle d'accès est fait à la main.
//
// Modes (body JSON "mode", défaut "dry-run") :
//   check-domain : interroge l'API Resend (GET /domains) — statut de
//                  vérification (SPF/DKIM/DMARC) de labase360.fr.
//   dry-run      : n'envoie rien, renvoie ce qui SERAIT envoyé.
//   send         : envoie réellement, un destinataire à la fois, avec un
//                  délai entre chaque envoi (delayMs, défaut 3000).
//
// Réutilisable : recipients = [{ to, subject, text }] — texte brut (pas de
// HTML) pour garder le ton personnel, pas un rendu "newsletter".
//
// Deploy : supabase functions deploy lead-relaunch-send --no-verify-jwt
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
// Secret dédié à cet outil (PAS service_role — pas besoin d'exposer une clé
// à accès total sur la base pour un simple contrôle d'accès sur ce endpoint).
const RELAUNCH_SECRET = Deno.env.get("LEAD_RELAUNCH_SECRET") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface Recipient {
  to: string;
  subject: string;
  text: string;
}

interface SendResult {
  to: string;
  ok: boolean;
  id?: string;
  error?: string;
  dryRun?: boolean;
}

async function sendOnePlainText(params: {
  to: string;
  subject: string;
  text: string;
  from: string;
  replyTo: string;
}): Promise<SendResult> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: params.from,
        to: [params.to],
        subject: params.subject,
        text: params.text,
        reply_to: params.replyTo,
      }),
    });
    const b = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { to: params.to, ok: false, error: b?.message ?? `resend_${res.status}` };
    }
    return { to: params.to, ok: true, id: b?.id ?? "unknown" };
  } catch (e) {
    return { to: params.to, ok: false, error: e instanceof Error ? e.message : "send_failed" };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!RELAUNCH_SECRET || token !== RELAUNCH_SECRET) {
    return json({ success: false, error: "unauthorized" }, 401);
  }

  let body: {
    mode?: "check-domain" | "dry-run" | "send";
    from?: string;
    replyTo?: string;
    delayMs?: number;
    recipients?: Recipient[];
  };
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "invalid_json" }, 400);
  }

  const mode = body.mode ?? "dry-run";

  // ─── check-domain : vérifie SPF/DKIM/DMARC via l'API Resend ─────────────
  if (mode === "check-domain") {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
    });
    const b = await res.json().catch(() => ({}));
    if (!res.ok) {
      return json({ success: false, error: `resend_${res.status}`, detail: b }, 502);
    }
    const domains = Array.isArray(b?.data) ? b.data : [];
    const target = domains.find((d: { name?: string }) => d.name === "labase360.fr");
    return json({
      success: true,
      domain: target ?? null,
      all_domains: domains.map((d: { name?: string; status?: string }) => ({
        name: d.name,
        status: d.status,
      })),
    });
  }

  const from = body.from ?? "Mélanie & Thomas – La Base <bonjour@labase360.fr>";
  const replyTo = body.replyTo ?? "labaseverdun@gmail.com";
  // reply-to obligatoire seulement pour un vrai envoi — le dry-run sert à
  // valider le contenu/la liste avant même d'avoir tranché cette adresse.
  if (!replyTo && mode === "send") {
    return json({ success: false, error: "missing_reply_to" }, 400);
  }

  const recipients = Array.isArray(body.recipients) ? body.recipients : [];
  if (recipients.length === 0) return json({ success: false, error: "no_recipients" }, 400);

  const delayMs = typeof body.delayMs === "number" ? body.delayMs : 3000;

  // ─── dry-run : n'envoie rien ─────────────────────────────────────────────
  if (mode === "dry-run") {
    return json({
      success: true,
      mode: "dry-run",
      from,
      reply_to: replyTo ?? "(non défini — requis avant --send)",
      would_send: recipients.map((r) => ({
        to: r.to,
        subject: r.subject,
        preview: r.text.slice(0, 120) + (r.text.length > 120 ? "…" : ""),
      })),
      results: recipients.map((r) => ({ to: r.to, ok: true, dryRun: true }) as SendResult),
    });
  }

  // ─── send : envoi réel, un par un, avec délai ────────────────────────────
  if (mode === "send") {
    if (!replyTo) return json({ success: false, error: "missing_reply_to" }, 400);
    const results: SendResult[] = [];
    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i];
      const result = await sendOnePlainText({ to: r.to, subject: r.subject, text: r.text, from, replyTo });
      results.push(result);
      if (i < recipients.length - 1) await sleep(delayMs);
    }
    return json({ success: true, mode: "send", from, reply_to: replyTo, results });
  }

  return json({ success: false, error: "invalid_mode" }, 400);
});
