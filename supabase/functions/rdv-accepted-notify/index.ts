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
import { buildIcs, icsEnPieceJointe } from "../_shared/icsInvite.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = "La Base 360 <rdv@labase360.fr>";
const REPLY_TO = "labaseverdun@gmail.com";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Adresse de secours : celle du club, si le coach n'a pas rempli son lieu de
// rendez-vous. Coupée en deux lignes pour la carte « Où ».
const ADRESSE_1 = "11 rue Saint Pierre";
const ADRESSE_2 = "55100 Verdun";

/** Coupe une adresse d'une ligne en deux, sur la dernière virgule ou juste
 *  avant le code postal. Les coachs la saisissent d'un bloc dans leur fiche. */
function couperAdresse(brut: string): [string, string] {
  const t = brut.replace(/\s+/g, " ").trim();
  const virgule = t.lastIndexOf(",");
  if (virgule > 0) return [t.slice(0, virgule).trim(), t.slice(virgule + 1).trim()];
  const cp = t.match(/\b\d{5}\b/);
  if (cp && cp.index && cp.index > 0) return [t.slice(0, cp.index).trim(), t.slice(cp.index).trim()];
  return [t, ""];
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
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
}

async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  attachments?: Array<{ filename: string; content: string }>,
): Promise<boolean> {
  if (!RESEND_API_KEY || !to) return false;
  try {
    const payload: Record<string, unknown> = {
      from: FROM, to: [to], subject, reply_to: REPLY_TO, html,
    };
    if (attachments?.length) payload.attachments = attachments;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
    .select("id, first_name, contact, status, slot_start, slot_end, club_id, coach_user_id, coach_slug, mode, metadata")
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
  let lieuCoach = "";
  if (booking.coach_user_id) {
    const { data: u } = await sb
      .from("users")
      .select("name, rdv_location, city")
      .eq("id", booking.coach_user_id)
      .maybeSingle();
    if (u?.name) coachName = String(u.name).split(" ")[0];
    lieuCoach = String(u?.rdv_location ?? u?.city ?? "").trim();
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

  // Le « Où » de la carte et de l'invitation calendrier.
  //
  // Ce mail annonçait « 11 rue Saint Pierre, 55100 Verdun » à TOUT LE MONDE,
  // y compris à quelqu'un qui avait explicitement choisi la visio : il recevait
  // une adresse à laquelle se rendre, et un événement d'agenda posé au club
  // (audit 2026-08-11). Et l'adresse était figée dans le code, donc fausse pour
  // tout coach qui ne reçoit pas au club de Verdun.
  const enVisio = String(booking.mode ?? "").trim() === "visio";
  const [adr1, adr2] = enVisio
    ? ["En visio", "Le lien t'arrive avant le rendez-vous"]
    : (lieuCoach ? couperAdresse(lieuCoach) : [ADRESSE_1, ADRESSE_2]);
  const lieuIcs = enVisio
    ? "Visioconférence — lien envoyé par email"
    : [adr1, adr2].filter(Boolean).join(", ");

  const html = rdvAccepteEmailHtml({
    firstName: String(booking.first_name ?? "").trim(),
    coachName,
    dateLabel: parisDateLabel(debut),
    hour: parisHourLabel(debut),
    addressLine1: adr1,
    addressLine2: adr2,
    durationMin: dureeMin,
    theme,
  });

  const prenom = String(booking.first_name ?? "").trim();

  // L'invitation calendrier. C'est ICI qu'elle a sa place et nulle part
  // ailleurs : à la réservation le rendez-vous n'est encore qu'une demande,
  // poser un événement sur l'agenda de quelqu'un pour un créneau non validé
  // serait faux. Gmail reconnaît le METHOD:REQUEST et le pose tout seul.
  const fin = booking.slot_end ? new Date(String(booking.slot_end)) : new Date(new Date(debut).getTime() + dureeMin * 60000);
  const ics = buildIcs({
    uid: String(booking.id),
    start: new Date(debut),
    end: fin,
    summary: `Bilan bien-être avec ${coachName} — La Base 360`,
    description:
      `On prend le temps de parler de toi, on mesure où tu en es, et on pose un cap. ` +
      `Rien à décider sur place. Prévois ${dureeMin} minutes.`,
    location: lieuIcs,
    attendee: contact,
    attendeeName: prenom || "Invité",
    organizerName: booking.club_id ? "The Breakfast Club" : "La Base 360",
  });

  const envoye = await sendViaResend(
    contact,
    `C'est confirmé${prenom ? `, ${prenom}` : ""} — ${parisDateLabel(debut)} à ${parisHourLabel(debut)}`,
    html,
    [icsEnPieceJointe(ics, "rendez-vous-la-base.ics")],
  );

  if (envoye) {
    await sb
      .from("rdv_bookings")
      .update({ metadata: { ...meta, accepted_email_sent_at: new Date().toISOString() } })
      .eq("id", bookingId);
  }

  return jsonResponse({ ok: envoye });
});
