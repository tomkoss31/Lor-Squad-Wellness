// =============================================================================
// rdv-accepted-notify — « C'est confirmé » au prospect (2026-08-11)
//
// Le mail que reçoit une personne quand le coach ACCEPTE sa demande de RDV
// dans le CRM. Avant, elle ne recevait rien : les trois endroits qui changent
// le statut faisaient un `update({ status })` nu. Quelqu'un réservait, lisait
// « on a bien reçu ta demande », et n'apprenait jamais que c'était validé.
//
// Appelée par le front (un seul chemin : services/sb/rdvBookings.ts) juste
// après le passage en `confirmed`. Best-effort : si l'envoi échoue, le RDV
// reste confirmé — on ne bloque jamais le coach pour un email.
//
// Garde-fous (l'edge répond ok:false sans lever d'erreur) :
//   • réservation introuvable / statut ≠ confirmed → skip
//   • contact qui n'est pas un email (téléphone seul) → skip
//   • déjà notifié (metadata.accepted_email_sent_at) → skip, pour qu'un
//     aller-retour confirmé → annulé → confirmé n'envoie pas deux fois
//
// Deploy : supabase functions deploy rdv-accepted-notify --no-verify-jwt
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getServiceClient, corsHeaders, jsonResponse } from "../_shared/push.ts";
import { rdvAccepteEmailHtml } from "../_shared/rdvEmail.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = "La Base 360 <rdv@labase360.fr>";
const REPLY_TO = "labaseverdun@gmail.com";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// L'adresse du club, coupée en deux lignes pour la carte « Où ».
const ADRESSE_1 = "11 rue Saint Pierre";
const ADRESSE_2 = "55100 Verdun";

function parisDateLabel(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(iso));
}

function parisHourLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
}

async function sendViaResend(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY || !to) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], subject, reply_to: REPLY_TO, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let body: { booking_id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "invalid_json" }, 400);
  }

  const bookingId = (body.booking_id ?? "").trim();
  if (!bookingId) return jsonResponse({ ok: false, error: "missing_booking_id" }, 400);

  const sb = getServiceClient();

  const { data: booking, error } = await sb
    .from("rdv_bookings")
    .select("id, first_name, contact, status, slot_start, slot_end, club_id, coach_user_id, coach_slug, metadata")
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !booking) return jsonResponse({ ok: false, skipped: "introuvable" });
  if (booking.status !== "confirmed") return jsonResponse({ ok: false, skipped: "pas_confirme" });

  const meta = (booking.metadata ?? {}) as Record<string, unknown>;
  if (meta.accepted_email_sent_at) return jsonResponse({ ok: true, skipped: "deja_envoye" });

  const contact = String(booking.contact ?? "").trim();
  if (!contact || !EMAIL_RE.test(contact)) {
    // Un téléphone seul : pas d'email possible. Thomas contacte par SMS.
    return jsonResponse({ ok: false, skipped: "pas_d_email" });
  }

  // Le nom du coach, tel que la personne le connaît. On tente l'id, puis le
  // slug ; à défaut on reste vague plutôt que d'écrire un nom faux.
  let coachName = "ton coach";
  if (booking.coach_user_id) {
    const { data: u } = await sb
      .from("users")
      .select("name")
      .eq("id", booking.coach_user_id)
      .maybeSingle();
    if (u?.name) coachName = String(u.name).split(" ")[0];
  } else if (booking.coach_slug) {
    coachName = String(booking.coach_slug).charAt(0).toUpperCase() + String(booking.coach_slug).slice(1);
  }

  // L'habillage suit la porte que la personne a franchie : un lead venu du
  // Breakfast Club reçoit le crème et orange, un lead colis reçoit l'app.
  const theme = booking.club_id ? "club" : "app";

  const debut = String(booking.slot_start);
  const dureeMin = booking.slot_end
    ? Math.max(15, Math.round((new Date(String(booking.slot_end)).getTime() - new Date(debut).getTime()) / 60000))
    : 45;

  const html = rdvAccepteEmailHtml({
    firstName: String(booking.first_name ?? "").trim(),
    coachName,
    dateLabel: parisDateLabel(debut),
    hour: parisHourLabel(debut),
    addressLine1: ADRESSE_1,
    addressLine2: ADRESSE_2,
    durationMin: dureeMin,
    theme,
  });

  const prenom = String(booking.first_name ?? "").trim();
  const envoye = await sendViaResend(
    contact,
    `C'est confirmé${prenom ? `, ${prenom}` : ""} — ${parisDateLabel(debut)} à ${parisHourLabel(debut)}`,
    html,
  );

  if (envoye) {
    await sb
      .from("rdv_bookings")
      .update({ metadata: { ...meta, accepted_email_sent_at: new Date().toISOString() } })
      .eq("id", bookingId);
  }

  return jsonResponse({ ok: envoye });
});
