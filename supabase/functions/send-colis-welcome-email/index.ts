// =============================================================================
// send-colis-welcome-email — email de remerciement funnel /colis (2026-07-08).
//
// Appelée en fire-and-forget par submit-prospect-lead juste après l'insert
// (source='colis' + email présent). Best-effort : ne bloque jamais le funnel
// si l'email échoue (déjà géré côté appelant, cf. .catch(() => {})).
//
// Contenu : recap des 2 cadeaux (−10% code BASE10 + bilan bien-être offert)
// + paragraphe personnalisé généré par Noaly (mode colis_reflection, avec
// fallback texte statique si l'IA est indisponible) + 2 CTA (RDV, bilan en
// ligne complet) + CTA réduction bar optionnel (SHAKE_BAR_APP_URL, omis si
// non configuré — app séparée, pas d'URL inventée).
//
// Deploy: supabase functions deploy send-colis-welcome-email
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SHAKE_BAR_APP_URL = Deno.env.get("SHAKE_BAR_APP_URL") ?? "";
const DEFAULT_COACH_SLUG = "melanie";

const FROM_DEFAULT = "La Base 360 <rdv@labase360.fr>";
const REPLY_TO_DEFAULT = "contact@labase360.fr";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sendViaResend(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY || !to) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_DEFAULT, to: [to], subject, reply_to: REPLY_TO_DEFAULT, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildHtml(opts: {
  firstName: string;
  reflection: string;
  rdvUrl: string;
  bilanUrl: string;
}): string {
  const shakeBarBlock = SHAKE_BAR_APP_URL
    ? `<a href="${SHAKE_BAR_APP_URL}" style="display:block;text-align:center;margin-top:12px;padding:14px;border-radius:10px;font-family:Helvetica,Arial,sans-serif;font-weight:700;font-size:13px;text-transform:uppercase;text-decoration:none;color:#8a9794;border:1.5px dashed #3a4744;">🥤 Profiter de ma réduction au bar</a>`
    : "";
  const name = escapeHtml(opts.firstName);
  const reflection = escapeHtml(opts.reflection);

  return `<!DOCTYPE html>
<html lang="fr"><body style="margin:0;padding:0;background:#1a1d1c;">
<div style="max-width:560px;margin:0 auto;background:#080b0a;color:#f2f5f4;font-family:Helvetica,Arial,sans-serif;">
  <div style="padding:34px 30px;">
    <div style="font-family:Helvetica,Arial,sans-serif;font-weight:800;font-size:13px;letter-spacing:0.02em;text-transform:uppercase;color:#f2f5f4;">La Base 360</div>
    <div style="font-family:'Courier New',monospace;font-size:10.5px;letter-spacing:0.16em;text-transform:uppercase;color:#34e3c8;margin-top:22px;">Merci d'avoir répondu ✓</div>
    <div style="font-family:Helvetica,Arial,sans-serif;font-weight:900;font-size:28px;line-height:1.1;text-transform:uppercase;margin-top:8px;">
      Tes 2 cadeaux sont <span style="color:#34e3c8;">prêts</span>, ${name}
    </div>
    <p style="font-size:14.5px;line-height:1.6;color:#cfd8d5;margin-top:14px;">On a bien reçu tes réponses. Voici ton pass, et un petit mot de Noaly.</p>

    <div style="margin-top:20px;background:#0e1513;border:1px solid #1f2a28;border-radius:12px;padding:14px 16px;">
      <div style="font-family:'Courier New',monospace;color:#8a9794;font-size:9.5px;letter-spacing:0.12em;">CADEAU 01 · À MONTRER AU BAR</div>
      <div style="font-size:15px;font-weight:800;margin-top:3px;">Réduction −10%</div>
      <div style="font-family:'Courier New',monospace;font-size:11px;color:#34e3c8;margin-top:2px;">CODE : BASE10</div>
    </div>
    <div style="margin-top:10px;background:#0e1513;border:1px solid #1f2a28;border-radius:12px;padding:14px 16px;">
      <div style="font-family:'Courier New',monospace;color:#8a9794;font-size:9.5px;letter-spacing:0.12em;">CADEAU 02 · SUR RÉSERVATION</div>
      <div style="font-size:15px;font-weight:800;margin-top:3px;">Bilan bien-être 30 min — offert</div>
    </div>

    <div style="margin-top:26px;background:#0a100f;border:1px solid #34e3c8;border-radius:12px;padding:18px 18px 16px;">
      <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.14em;color:#34e3c8;text-transform:uppercase;">✨ Noaly a regardé tes réponses</div>
      <p style="font-size:14px;line-height:1.65;color:#e2e8e6;margin-top:10px;">« ${reflection} »</p>
    </div>

    <a href="${opts.rdvUrl}" style="display:block;text-align:center;margin-top:20px;padding:14px;border-radius:10px;font-family:Helvetica,Arial,sans-serif;font-weight:800;font-size:13.5px;text-transform:uppercase;text-decoration:none;background:#34e3c8;color:#04110f;">📅 Réserver mon bilan (30 min)</a>
    <a href="${opts.bilanUrl}" style="display:block;text-align:center;margin-top:12px;padding:14px;border-radius:10px;font-family:Helvetica,Arial,sans-serif;font-weight:800;font-size:13.5px;text-transform:uppercase;text-decoration:none;background:transparent;color:#34e3c8;border:1.5px solid #34e3c8;">📝 Faire mon bilan en ligne complet</a>
    ${shakeBarBlock}

    <div style="margin-top:30px;padding-top:18px;border-top:1px solid #1f2a28;text-align:center;">
      <p style="font-family:'Courier New',monospace;font-size:9.5px;letter-spacing:0.08em;color:#586562;line-height:1.8;">
        LA BASE 360 — CLUB NUTRITION<br>11 RUE SAINT-PIERRE, 55100 VERDUN
      </p>
    </div>
  </div>
</div>
</body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "method_not_allowed" }, 405);

  let body: { prospect_lead_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "invalid_json" }, 400);
  }
  const leadId = (body.prospect_lead_id ?? "").trim();
  if (!leadId) return json({ success: false, error: "missing_prospect_lead_id" }, 400);

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const { data: lead } = await sb
      .from("prospect_leads")
      .select("id, first_name, email, source, metadata")
      .eq("id", leadId)
      .maybeSingle();

    if (!lead || lead.source !== "colis") return json({ success: true, skipped: "not_colis" });
    const to = String((lead.email as string | null) ?? "").trim();
    if (!to || !EMAIL_RE.test(to)) return json({ success: true, skipped: "no_email" });

    const firstName = String((lead.first_name as string) ?? "").trim() || "toi";
    const meta = (lead.metadata ?? {}) as Record<string, unknown>;
    const answers = (meta.colis_answers ?? {}) as Record<string, string | null>;

    // Paragraphe Noaly (best-effort — fallback interne si l'IA est indisponible).
    let reflection = `Merci d'avoir pris le temps de répondre ! On te propose les deux options juste en dessous, à toi de choisir ce qui te va le mieux.`;
    try {
      const { data: aiData } = await sb.functions.invoke("noaly", {
        body: { mode: "colis_reflection", firstName, answers },
      });
      const msg = (aiData as { message?: string } | null)?.message;
      if (msg) reflection = msg;
    } catch (e) {
      console.warn("[send-colis-welcome-email] noaly indisponible:", e);
    }

    const rdvUrl = `https://labase360.fr/rdv/${DEFAULT_COACH_SLUG}`;
    const bilanUrl = `https://labase360.fr/bilan-online/${DEFAULT_COACH_SLUG}/formulaire?firstName=${encodeURIComponent(firstName)}`;
    const html = buildHtml({ firstName, reflection, rdvUrl, bilanUrl });

    const ok = await sendViaResend(to, `Merci ${firstName}, voici tes 2 cadeaux 🎁`, html);
    return json({ success: true, sent: ok });
  } catch (e) {
    return json({ success: false, error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
