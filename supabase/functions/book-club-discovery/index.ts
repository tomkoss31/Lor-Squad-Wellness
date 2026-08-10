// =============================================================================
// book-club-discovery — Réservation d'un RDV découverte "club" (Breakfast
// Club Verdun), depuis le tunnel public www.labase-nutrition.com/reserver.
//
// POST { clubSlug, slotStart (ISO), firstName, contact?(email),
//        peopleCount?(1|2), partnerFirstName?, objectif? }
//   1. Résout le club par slug (clubs.slug, actif).
//   2. Réserve via la RPC atomique book_club_discovery (verrou + capacité N).
//   3. Notifie les admins du club par push (vers /crm, où le widget permet de
//      confirmer / annuler — l'écran /rdv-club a été retiré le 2026-08-09).
//   4. Envoie l'email de confirmation au prospect, avec son lien personnel
//      « Modifier / annuler mon rendez-vous » (manage_token).
//   5. Envoie le lead à la boîte partagée ET à la boîte perso de chaque coach.
//
// Réutilise la table rdv_bookings (club_id, coach_user_id=null) → le rappel J-1
// (client-rdv-reminder) fonctionne déjà pour ces lignes.
//
// Déploiement : supabase functions deploy book-club-discovery --no-verify-jwt
// (page publique sans JWT Supabase).
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getServiceClient,
  sendPushToUser,
  corsHeaders,
  jsonResponse,
} from "../_shared/push.ts";
import { rdvEmailHtml } from "../_shared/rdvEmail.ts";
import { createCalendarEvent } from "../_shared/googleCalendar.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_DEFAULT = "La Base 360 <rdv@labase360.fr>";
const REPLY_TO_DEFAULT = "labaseverdun@gmail.com";
// Mélanie veut chaque lead entrant par email (elle ne consulte pas le CRM).
const LEAD_NOTIFY_EMAIL = "labaseverdun@gmail.com";
// Domaine public du club — sert à construire le lien de gestion du RDV.
const PUBLIC_SITE_URL = "https://www.labase-nutrition.com";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const OBJECTIF_LABELS: Record<string, string> = {
  poids: "⚖️ Perdre du poids",
  muscle: "💪 Reprendre du muscle",
  energie: "⚡ Retrouver de l'énergie",
};
function objectifLabel(code: string | null): string {
  if (!code) return "—";
  return OBJECTIF_LABELS[code] ?? code;
}
function esc(s: string): string {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
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

interface MailAttachment { filename: string; content: string }

async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  replyTo?: string,
  attachments?: MailAttachment[],
): Promise<boolean> {
  if (!RESEND_API_KEY || !to) return false;
  try {
    const payload: Record<string, unknown> = {
      from: FROM_DEFAULT, to: [to], subject, reply_to: replyTo || REPLY_TO_DEFAULT, html,
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

/**
 * Invitation iCalendar du rendez-vous, jointe au mail de lead pour qu'il
 * atterrisse dans l'agenda Google de la boîte de l'équipe.
 *
 * METHOD:REQUEST + ORGANIZER + ATTENDEE = une VRAIE invitation : Gmail la
 * reconnaît comme telle et la pose sur l'agenda, au lieu d'un simple fichier
 * joint qu'il faudrait ouvrir à la main. Le bouton « Ajouter à Google Agenda »
 * du corps du mail reste le filet de sécurité : lui marche toujours, en un clic.
 *
 * Repliement des lignes à 75 octets non géré : les nôtres restent courtes.
 */
function buildIcs(opts: {
  uid: string; start: Date; end: Date;
  summary: string; description: string; location: string; attendee: string;
}): string {
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  // Dans un .ics ces caractères sont structurants : il faut les échapper.
  const t = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//La Base 360//Breakfast Club//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${opts.uid}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(opts.start)}`,
    `DTEND:${stamp(opts.end)}`,
    `SUMMARY:${t(opts.summary)}`,
    `DESCRIPTION:${t(opts.description)}`,
    `LOCATION:${t(opts.location)}`,
    "ORGANIZER;CN=The Breakfast Club:mailto:rdv@labase360.fr",
    `ATTENDEE;CN=La Base Verdun;RSVP=FALSE;PARTSTAT=ACCEPTED:mailto:${opts.attendee}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/** Lien « Ajouter à Google Agenda » — pré-rempli, un seul clic. */
function googleCalUrl(opts: {
  start: Date; end: Date; text: string; details: string; location: string;
}): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.text,
    dates: `${fmt(opts.start)}/${fmt(opts.end)}`,
    details: opts.details,
    location: opts.location,
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ success: false, error: "method_not_allowed" }, 405);

  let body: {
    clubSlug?: string;
    slotStart?: string;
    firstName?: string;
    lastName?: string;
    contact?: string;
    phone?: string;
    city?: string;
    peopleCount?: number;
    partnerFirstName?: string;
    partnerLastName?: string;
    partnerObjectif?: string;
    objectif?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ success: false, error: "invalid_json" }, 400);
  }

  const clubSlug = (body.clubSlug ?? "").trim();
  const firstName = (body.firstName ?? "").trim();
  const lastName = (body.lastName ?? "").trim();
  const contact = (body.contact ?? "").trim() || null;
  const phone = (body.phone ?? "").trim();
  const city = (body.city ?? "").trim();
  const peopleCount = body.peopleCount === 2 ? 2 : 1;
  const partner = (body.partnerFirstName ?? "").trim() || null;
  const partnerLast = (body.partnerLastName ?? "").trim();
  const partnerObjectif = (body.partnerObjectif ?? "").trim();
  const objectif = (body.objectif ?? "").trim() || null;

  if (!clubSlug) return jsonResponse({ success: false, error: "club_requis" }, 400);
  if (firstName.length < 2) return jsonResponse({ success: false, error: "prenom_requis" }, 400);
  if (contact && !EMAIL_RE.test(contact)) return jsonResponse({ success: false, error: "email_invalide" }, 400);

  const slotStart = body.slotStart ? new Date(body.slotStart) : null;
  if (!slotStart || Number.isNaN(slotStart.getTime()) || slotStart.getTime() < Date.now()) {
    return jsonResponse({ success: false, error: "creneau_invalide" }, 400);
  }

  const sb = getServiceClient();

  // 1. Résolution du club par slug
  const { data: club, error: clubErr } = await sb
    .from("clubs")
    .select("id, name, city, settings")
    .eq("slug", clubSlug)
    .eq("active", true)
    .maybeSingle();
  if (clubErr) return jsonResponse({ success: false, error: "club_lookup_failed" }, 500);
  if (!club) return jsonResponse({ success: false, error: "club_introuvable" }, 404);

  // 1b. Délai de réservation — MÊME règle que l'affichage (club_slot_bookable :
  // midi la veille, lundi avant vendredi 21h). La RPC d'écriture la revérifie
  // de toute façon ; on la teste ICI pour pouvoir répondre une erreur PARLANTE.
  // Sans ça, un refus pour délai remonterait en « creneau_pris », ce qui est
  // faux : la personne irait chercher un autre horaire au lieu d'un autre jour.
  const { data: bookable, error: bookableErr } = await sb.rpc("club_slot_bookable", {
    p_slot_start: slotStart.toISOString(),
  });
  if (!bookableErr && bookable === false) {
    return jsonResponse({ success: false, error: "delai_depasse" }, 409);
  }

  const stepMin = Number((club.settings as { discovery?: { slot_step_min?: number } })?.discovery?.slot_step_min ?? 30) || 30;
  const slotEnd = new Date(slotStart.getTime() + stepMin * 60_000);

  // 2. Réservation atomique (verrou + capacité). Retourne null si complet.
  const { data: bookingId, error: bookErr } = await sb.rpc("book_club_discovery", {
    p_club_id: club.id,
    p_slot_start: slotStart.toISOString(),
    p_slot_end: slotEnd.toISOString(),
    p_first_name: firstName,
    p_contact: contact,
    p_people_count: peopleCount,
    p_partner: partner,
    p_objectif: objectif,
  });
  if (bookErr) return jsonResponse({ success: false, error: "insert_failed", detail: bookErr.message }, 500);
  if (!bookingId) return jsonResponse({ success: false, error: "creneau_pris" }, 409);

  // 2b. Agenda Google de l'équipe — le rendez-vous s'y pose tout seul.
  // BEST-EFFORT, comme le push et les mails : la réservation est DÉJÀ
  // enregistrée, une panne d'agenda ne doit rien casser. Si le secret n'est pas
  // configuré, createCalendarEvent renvoie simplement ok:false sans rien tenter.
  // On mémorise l'id : c'est lui qui permettra de retirer l'événement si le
  // prospect annule (sinon on saurait poser, jamais retirer).
  try {
    const fullNameCal = `${firstName}${lastName ? " " + lastName : ""}`.trim();
    const cal = await createCalendarEvent({
      summary: `RDV découverte — ${fullNameCal}${peopleCount === 2 ? " +1" : ""}`,
      description: [
        `Objectif : ${objectifLabel(objectif)}`,
        contact ? `Email : ${contact}` : null,
        phone ? `Téléphone : ${phone}` : null,
        city ? `Ville : ${city}` : null,
        peopleCount === 2
          ? `Vient à deux${partner ? ` avec ${partner}${partnerLast ? " " + partnerLast : ""}` : ""}`
          : null,
        "",
        "Réservé depuis le site du club.",
      ].filter((l) => l !== null).join("\n"),
      location: `11 rue Saint Pierre, ${String((club.city as string) ?? "Verdun").trim() || "Verdun"}`,
      start: slotStart,
      end: slotEnd,
    });
    if (cal.ok && cal.eventId) {
      await sb.from("rdv_bookings")
        .update({ google_event_id: cal.eventId })
        .eq("id", bookingId as string);
    } else if (cal.reason && cal.reason !== "not_configured") {
      // Un échec silencieux serait le pire cas : on ne saurait jamais que
      // l'agenda a décroché. « not_configured » est normal tant que le secret
      // n'est pas posé, on ne bruite pas pour ça.
      console.warn(`[book-club-discovery] agenda Google KO : ${cal.reason}`);
    }
  } catch (_e) {
    // agenda best-effort — la résa est déjà enregistrée
  }

  // Les coachs du club = les admins actifs. Servent UNIQUEMENT au push (3).
  // Le mail de lead, lui, ne part plus qu'à la boîte partagée (« sinon on
  // reçoit trop de mail », Thomas 2026-08-09) : le push est le canal
  // individuel, l'email le canal collectif.
  let clubStaff: Array<{ id: string }> = [];
  try {
    const { data: admins } = await sb
      .from("users")
      .select("id")
      .eq("role", "admin")
      .eq("active", true);
    clubStaff = (admins ?? []) as Array<{ id: string }>;
  } catch (_e) {
    // best-effort — la résa est déjà enregistrée
  }

  // 3. Notif push aux coachs du club (non bloquant)
  try {
    const whenParis = new Intl.DateTimeFormat("fr-FR", {
      weekday: "short", day: "2-digit", month: "short",
      hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris",
    }).format(slotStart);
    const peopleTag = peopleCount === 2 ? " · 2 pers." : "";
    for (const a of clubStaff) {
      await sendPushToUser(sb, {
        userId: a.id,
        payload: {
          title: "☕ Nouveau RDV découverte",
          body: `${firstName}${peopleTag} — ${whenParis}`,
          url: "/crm",
          type: "club_discovery_booking",
        },
      });
    }
  } catch (_e) {
    // push best-effort — la résa est déjà enregistrée
  }

  // 4. Email de confirmation au prospect (non bloquant) — si contact = email
  let confirmEmailSent = false;
  if (contact && EMAIL_RE.test(contact)) {
    try {
      const clubName = String((club.name as string) ?? "").trim() || "le Breakfast Club";
      const location = `11 rue Saint Pierre, ${String((club.city as string) ?? "Verdun").trim() || "Verdun"}`;
      // Jeton personnel de gestion → lien « Modifier / annuler » dans l'email.
      let manageUrl: string | undefined;
      try {
        const { data: tok } = await sb
          .from("rdv_bookings")
          .select("manage_token")
          .eq("id", bookingId as string)
          .maybeSingle();
        const t = (tok as { manage_token?: string } | null)?.manage_token;
        if (t) manageUrl = `${PUBLIC_SITE_URL}/rdv/gerer/${t}`;
      } catch (_e) {
        // sans jeton, l'email garde simplement le bouton « mon espace »
      }
      const html = rdvEmailHtml({
        kind: "confirm",
        firstName,
        coachName: "un coach du Breakfast Club",
        dateLabel: parisDateLabel(slotStart.toISOString()),
        hour: parisHourLabel(slotStart.toISOString()),
        location,
        manageUrl,
        // La personne vient de parcourir un site crème et orange : son mail de
        // confirmation reste dans la même identité, pas en dark premium.
        theme: "club",
        // Prospect du club : aucun compte, donc pas de bouton « mon espace ».
        hasAccount: false,
      });
      confirmEmailSent = await sendViaResend(contact, "✅ Ton RDV découverte est réservé", html);
      if (confirmEmailSent) {
        await sb
          .from("rdv_bookings")
          .update({ confirm_email_sent_at: new Date().toISOString() })
          .eq("id", bookingId as string);
      }
    } catch (_e) {
      // email best-effort — la résa est déjà enregistrée
    }
  }

  // 5. Notif email INTERNE à l'équipe (Mélanie ne consulte pas le CRM) — non bloquant
  try {
    const dateLabel = parisDateLabel(slotStart.toISOString());
    const hour = parisHourLabel(slotStart.toISOString());
    const fullName = `${firstName}${lastName ? " " + lastName : ""}`.trim();
    const location = `11 rue Saint Pierre, ${String((club.city as string) ?? "Verdun").trim() || "Verdun"}`;

    const row = (k: string, v: string) =>
      `<tr><td style="padding:6px 14px 6px 0;color:#7A8099;font-size:13px;white-space:nowrap;vertical-align:top;">${k}</td><td style="padding:6px 0;color:#17201C;font-size:14px;font-weight:600;">${v}</td></tr>`;
    const partnerBlock = peopleCount === 2
      ? `<div style="margin-top:14px;padding-top:12px;border-top:1px solid #E7E1D6;">
           <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#7A8099;font-weight:700;margin-bottom:6px;">👫 Accompagné·e de</div>
           <table style="border-collapse:collapse;">
             ${row("Prénom / Nom", esc(`${partner ?? "—"}${partnerLast ? " " + partnerLast : ""}`))}
             ${row("Son objectif", esc(objectifLabel(partnerObjectif || null)))}
           </table>
         </div>`
      : "";

    const internalHtml = `
<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#F7F1E6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:26px 22px;">
    <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#E0532A;font-weight:700;">☕ Breakfast Club · Verdun</div>
    <h1 style="font-size:22px;margin:8px 0 2px;color:#17201C;">Nouveau lead — RDV découverte</h1>
    <p style="font-size:14px;color:#5F7154;margin:6px 0 18px;">${esc(fullName)} vient de réserver ${peopleCount === 2 ? "pour 2 personnes" : "une place"} le <b>${esc(dateLabel)} · ${esc(hour)}</b>.</p>
    <div style="background:#fff;border:1px solid #E7E1D6;border-radius:14px;padding:16px 20px;">
      <table style="border-collapse:collapse;width:100%;">
        ${row("Prénom / Nom", esc(fullName))}
        ${row("Objectif", esc(objectifLabel(objectif)))}
        ${row("Email", contact ? esc(contact) : "—")}
        ${row("Téléphone", phone ? esc(phone) : "—")}
        ${row("Ville", city ? esc(city) : "—")}
        ${row("Nombre", peopleCount === 2 ? "À deux (2 pers.)" : "Seul·e")}
        ${row("Créneau", `${esc(dateLabel)} · ${esc(hour)}`)}
        ${row("Lieu", esc(location))}
      </table>
      ${partnerBlock}
    </div>
    <a href="${googleCalUrl({
      start: slotStart,
      end: slotEnd,
      text: `RDV découverte — ${fullName}${peopleCount === 2 ? " +1" : ""}`,
      details: [
        `Objectif : ${objectifLabel(objectif)}`,
        contact ? `Email : ${contact}` : "",
        phone ? `Téléphone : ${phone}` : "",
      ].filter(Boolean).join(" · "),
      location,
    })}" target="_blank" rel="noopener noreferrer" style="display:block;text-align:center;margin:18px 0 0;padding:14px 18px;background:#1E3330;color:#F4EFE4;border-radius:12px;text-decoration:none;font-size:14.5px;font-weight:700;">📅 Ajouter à Google Agenda</a>
    <p style="font-size:12px;color:#8A8578;margin:14px 0 0;">L'invitation est aussi jointe à cet email (.ics) — Gmail la pose directement sur l'agenda. Réponds à cet email pour joindre le lead. Retrouve-le aussi dans le CRM.</p>
  </div>
</body></html>`.trim();

    // UNE SEULE adresse : la boîte partagée de l'équipe.
    // Les boîtes perso de chaque coach ont été retirées le 2026-08-09 — « sinon
    // on reçoit trop de mail » (Thomas). Le push, lui, continue d'aller à
    // chacun : c'est le canal individuel, l'email reste le canal collectif.
    const subject = `☕ Nouveau lead — ${fullName}${peopleCount === 2 ? " (+1)" : ""} · ${dateLabel} ${hour}`;
    const ics = buildIcs({
      uid: `club-${bookingId}@labase360.fr`,
      start: slotStart,
      end: slotEnd,
      summary: `RDV découverte — ${fullName}${peopleCount === 2 ? " +1" : ""}`,
      description: [
        `Objectif : ${objectifLabel(objectif)}`,
        contact ? `Email : ${contact}` : null,
        phone ? `Téléphone : ${phone}` : null,
        peopleCount === 2 ? "Vient à deux" : null,
      ].filter(Boolean).join("\n"),
      location,
      attendee: LEAD_NOTIFY_EMAIL,
    });
    // reply-to = le lead, pour répondre en un clic.
    // L'invitation .ics est jointe : Gmail la pose sur l'agenda de la boîte.
    await sendViaResend(LEAD_NOTIFY_EMAIL, subject, internalHtml, contact || undefined, [
      { filename: "rdv-decouverte.ics", content: btoa(unescape(encodeURIComponent(ics))) },
    ]);
  } catch (_e) {
    // notif interne best-effort — la résa est déjà enregistrée
  }

  return jsonResponse({ success: true, id: bookingId, confirmEmailSent });
});
