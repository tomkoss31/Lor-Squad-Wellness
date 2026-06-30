// =============================================================================
// rdv-confirm-client — email de CONFIRMATION envoyé au CLIENT de suivi quand
// un RDV (follow_up planifié) vient d'être créé.
//
// Déclenché par un trigger Postgres AFTER INSERT sur follow_ups (pg_net), donc
// 1 appel par nouveau RDV (pas de re-confirm sur reschedule). Anti-doublon
// inutile : le trigger fire exactement 1× par ligne.
//
// Garde-fous (l'edge skippe silencieusement, jamais d'erreur bloquante) :
//   • follow_up introuvable / status ≠ scheduled / due_date passée → skip
//   • client sans email → skip (pas de SMS ici)
//
// Deploy : supabase functions deploy rdv-confirm-client
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getServiceClient, corsHeaders, jsonResponse } from "../_shared/push.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_DEFAULT = "La Base 360 <rdv@labase360.fr>";
const REPLY_TO_DEFAULT = "contact@labase360.fr";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}
function parisDateLabel(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(iso));
}
function parisHourLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
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

function confirmEmailHtml(p: {
  firstName: string;
  coachName: string;
  dateLabel: string;
  hour: string;
  location: string;
}): string {
  return `
<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#0B0D11;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#F0EDE8;">
  <div style="max-width:480px;margin:0 auto;padding:28px 22px;">
    <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#2DD4BF;font-weight:700;">La Base 360</div>
    <h1 style="font-size:24px;margin:14px 0 4px;color:#F0EDE8;">C'est noté, ${esc(p.firstName)} ✅</h1>
    <p style="font-size:15px;line-height:1.55;color:#C3CCC0;margin:8px 0 22px;">
      Ton prochain rendez-vous avec <b style="color:#F0EDE8;">${esc(p.coachName)}</b> est bien calé. On continue ta progression 🌿
    </p>
    <div style="background:#13161C;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:18px 20px;">
      <div style="font-size:13px;color:#7A8099;text-transform:uppercase;letter-spacing:.08em;">Quand</div>
      <div style="font-size:18px;font-weight:700;color:#C9A84C;margin:2px 0 14px;">${esc(p.dateLabel)} · ${esc(p.hour)}</div>
      <div style="font-size:13px;color:#7A8099;text-transform:uppercase;letter-spacing:.08em;">Où</div>
      <div style="font-size:16px;font-weight:600;color:#F0EDE8;margin-top:2px;">${esc(p.location)}</div>
    </div>
    <p style="font-size:14px;line-height:1.55;color:#C3CCC0;margin:20px 0 0;">
      Un rappel t'arrivera la veille. Un empêchement ? Réponds à cet email, on s'arrange 💬
    </p>
    <p style="font-size:12px;color:#4A5068;margin:26px 0 0;">La Base 360 · The wellness nutrition club</p>
  </div>
</body></html>`.trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let body: { follow_up_id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "invalid_json" }, 400);
  }
  const followUpId = (body.follow_up_id ?? "").trim();
  if (!followUpId) return jsonResponse({ ok: false, error: "missing_follow_up_id" }, 400);

  const sb = getServiceClient();

  try {
    const { data: fu } = await sb
      .from("follow_ups")
      .select("id, client_id, due_date, status")
      .eq("id", followUpId)
      .single();
    if (!fu || !fu.client_id || !fu.due_date) return jsonResponse({ ok: true, skipped: "no_rdv" });
    if (fu.status !== "scheduled") return jsonResponse({ ok: true, skipped: "not_scheduled" });
    if (new Date(fu.due_date as string).getTime() <= Date.now()) return jsonResponse({ ok: true, skipped: "past" });

    const { data: client } = await sb
      .from("clients")
      .select("id, name, email, distributor_id")
      .eq("id", fu.client_id as string)
      .single();
    const to = String((client?.email as string) ?? "").trim();
    if (!to || !EMAIL_RE.test(to)) return jsonResponse({ ok: true, skipped: "no_email" });

    let coachName = "ton coach La Base";
    let location = "ton club La Base";
    if (client?.distributor_id) {
      const { data: coach } = await sb
        .from("users")
        .select("name, rdv_location, city")
        .eq("id", client.distributor_id as string)
        .single();
      coachName = String((coach?.name as string) ?? "").trim() || coachName;
      location = String((coach?.rdv_location as string) || (coach?.city as string) || "").trim() || location;
    }

    const html = confirmEmailHtml({
      firstName: String((client?.name as string) ?? "").split(/\s+/)[0] || "",
      coachName,
      dateLabel: parisDateLabel(fu.due_date as string),
      hour: parisHourLabel(fu.due_date as string),
      location,
    });
    const ok = await sendViaResend(to, "✅ Ton prochain rendez-vous est confirmé", html);
    return jsonResponse({ ok: true, sent: ok });
  } catch (err) {
    return jsonResponse({ ok: false, error: err instanceof Error ? err.message : "unknown" }, 500);
  }
});
