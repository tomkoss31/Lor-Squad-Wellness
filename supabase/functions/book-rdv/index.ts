// =============================================================================
// book-rdv — RDV V2 Brique 3 (2026-06-14). Réservation depuis le funnel public.
//
// POST { coachSlug, mode, slotStart (ISO), firstName, contact?, onlineBilanId? }
//   1. Résout le coach via get_coach_credibility_by_slug (résolution canonique).
//   2. Re-vérifie que le créneau est libre (anti-doublon) — défense côté serveur.
//   3. Insère dans rdv_bookings (service_role).
//   4. Notifie le coach par push.
//
// Déploiement : supabase functions deploy book-rdv --no-verify-jwt
// (page publique sans JWT Supabase, comme submit-online-bilan).
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getServiceClient,
  sendPushToUser,
  corsHeaders,
  jsonResponse,
} from "../_shared/push.ts";

const SLOT_MIN = 30;

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
  whereLine: string;
}): string {
  return `
<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#0B0D11;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#F0EDE8;">
  <div style="max-width:480px;margin:0 auto;padding:28px 22px;">
    <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#2DD4BF;font-weight:700;">La Base 360</div>
    <h1 style="font-size:24px;margin:14px 0 4px;color:#F0EDE8;">C'est noté, ${esc(p.firstName)} ✅</h1>
    <p style="font-size:15px;line-height:1.55;color:#C3CCC0;margin:8px 0 22px;">
      Ta demande de rendez-vous avec <b style="color:#F0EDE8;">${esc(p.coachName)}</b> est bien reçue. On a hâte de te rencontrer 🌿
    </p>
    <div style="background:#13161C;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:18px 20px;">
      <div style="font-size:13px;color:#7A8099;text-transform:uppercase;letter-spacing:.08em;">Quand</div>
      <div style="font-size:18px;font-weight:700;color:#C9A84C;margin:2px 0 14px;">${esc(p.dateLabel)} · ${esc(p.hour)}</div>
      <div style="font-size:13px;color:#7A8099;text-transform:uppercase;letter-spacing:.08em;">Où</div>
      <div style="font-size:16px;font-weight:600;color:#F0EDE8;margin-top:2px;">${esc(p.whereLine)}</div>
    </div>
    <p style="font-size:14px;line-height:1.55;color:#C3CCC0;margin:20px 0 0;">
      Un empêchement ou une question ? Réponds simplement à cet email, on s'arrange.
    </p>
    <p style="font-size:12px;color:#4A5068;margin:26px 0 0;">La Base 360 · The wellness nutrition club</p>
  </div>
</body></html>`.trim();
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ success: false, error: "method_not_allowed" }, 405);

  let body: {
    coachSlug?: string;
    mode?: string;
    slotStart?: string;
    firstName?: string;
    contact?: string;
    onlineBilanId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ success: false, error: "invalid_json" }, 400);
  }

  const coachSlug = (body.coachSlug ?? "").trim();
  const mode = (body.mode ?? "").trim();
  const firstName = (body.firstName ?? "").trim();
  const contact = (body.contact ?? "").trim() || null;

  if (mode !== "presentiel" && mode !== "visio") {
    return jsonResponse({ success: false, error: "mode_invalide" }, 400);
  }
  if (firstName.length < 2) {
    return jsonResponse({ success: false, error: "prenom_requis" }, 400);
  }
  const slotStart = body.slotStart ? new Date(body.slotStart) : null;
  if (!slotStart || Number.isNaN(slotStart.getTime()) || slotStart.getTime() < Date.now()) {
    return jsonResponse({ success: false, error: "creneau_invalide" }, 400);
  }
  const slotEnd = new Date(slotStart.getTime() + SLOT_MIN * 60_000);

  const sb = getServiceClient();

  // 1. Résolution coach (réutilise la RPC canonique slug → credibility).
  const { data: cred, error: credErr } = await sb.rpc("get_coach_credibility_by_slug", {
    p_slug: coachSlug,
  });
  if (credErr) {
    return jsonResponse({ success: false, error: "coach_lookup_failed" }, 500);
  }
  const coachUserId = (cred as { user_id?: string } | null)?.user_id ?? null;
  if (!coachUserId) {
    return jsonResponse({ success: false, error: "coach_introuvable" }, 404);
  }

  // 2. Anti-doublon serveur : le créneau est-il encore libre ?
  const { data: clash, error: clashErr } = await sb
    .from("rdv_bookings")
    .select("id")
    .eq("coach_user_id", coachUserId)
    .neq("status", "canceled")
    .lt("slot_start", slotEnd.toISOString())
    .gt("slot_end", slotStart.toISOString())
    .limit(1);
  if (clashErr) {
    return jsonResponse({ success: false, error: "check_failed" }, 500);
  }
  if (clash && clash.length > 0) {
    return jsonResponse({ success: false, error: "creneau_pris" }, 409);
  }

  // 3. Insert
  const { data: inserted, error: insErr } = await sb
    .from("rdv_bookings")
    .insert({
      coach_user_id: coachUserId,
      coach_slug: coachSlug || null,
      first_name: firstName,
      contact,
      mode,
      slot_start: slotStart.toISOString(),
      slot_end: slotEnd.toISOString(),
      status: "requested",
      online_bilan_id: body.onlineBilanId ?? null,
    })
    .select("id")
    .single();
  if (insErr) {
    return jsonResponse({ success: false, error: "insert_failed", detail: insErr.message }, 500);
  }

  // 4. Notif coach (non bloquant)
  try {
    const whenParis = new Intl.DateTimeFormat("fr-FR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Paris",
    }).format(slotStart);
    await sendPushToUser(sb, {
      userId: coachUserId,
      payload: {
        title: "🗓️ Nouveau RDV demandé",
        body: `${firstName} — ${whenParis} (${mode === "visio" ? "visio" : "présentiel"})`,
        url: "/crm",
        type: "rdv_booking",
      },
    });
  } catch (_e) {
    // push best-effort — la résa est déjà enregistrée
  }

  // 5. Email de confirmation au prospect (non bloquant) — seulement si le
  //    contact saisi EST un email. Un tél seul → pas d'email (SMS hors scope).
  let confirmEmailSent = false;
  if (contact && EMAIL_RE.test(contact)) {
    try {
      const { data: coach } = await sb
        .from("users")
        .select("name, rdv_location, city")
        .eq("id", coachUserId)
        .single();
      const coachName = String((coach?.name as string) ?? "").trim() || "ton coach La Base";
      const whereLine = mode === "visio"
        ? "En visio — le lien te sera envoyé avant le RDV"
        : (String((coach?.rdv_location as string) || (coach?.city as string) || "").trim() || "ton club La Base");
      const html = confirmEmailHtml({
        firstName,
        coachName,
        dateLabel: parisDateLabel(slotStart.toISOString()),
        hour: parisHourLabel(slotStart.toISOString()),
        whereLine,
      });
      confirmEmailSent = await sendViaResend(contact, "✅ Ton rendez-vous est bien noté", html);
    } catch (_e) {
      // email best-effort — la résa est déjà enregistrée
    }
  }

  return jsonResponse({ success: true, id: (inserted as { id: string }).id, confirmEmailSent });
});
