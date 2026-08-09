// =============================================================================
// book-club-discovery — Réservation d'une séance découverte "club" (Breakfast
// Club Verdun), depuis le tunnel public www.labase-nutrition.com/reserver.
//
// POST { clubSlug, slotStart (ISO), firstName, contact?(email),
//        peopleCount?(1|2), partnerFirstName?, objectif? }
//   1. Résout le club par slug (clubs.slug, actif).
//   2. Réserve via la RPC atomique book_club_discovery (verrou + capacité N).
//   3. Notifie les admins du club par push.
//   4. Envoie l'email de confirmation au prospect (si contact = email).
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

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_DEFAULT = "La Base 360 <rdv@labase360.fr>";
const REPLY_TO_DEFAULT = "labaseverdun@gmail.com";
// Mélanie veut chaque lead entrant par email (elle ne consulte pas le CRM).
const LEAD_NOTIFY_EMAIL = "labaseverdun@gmail.com";
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

async function sendViaResend(to: string, subject: string, html: string, replyTo?: string): Promise<boolean> {
  if (!RESEND_API_KEY || !to) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_DEFAULT, to: [to], subject, reply_to: replyTo || REPLY_TO_DEFAULT, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
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

  // Les coachs du club = les admins actifs. Récupérés UNE fois : ils servent au
  // push (3) et au mail interne (5) — chacun reçoit le lead sur SA propre boîte,
  // plus seulement la boîte partagée de l'équipe.
  let clubStaff: Array<{ id: string; email: string | null }> = [];
  try {
    const { data: admins } = await sb
      .from("users")
      .select("id, email")
      .eq("role", "admin")
      .eq("active", true);
    clubStaff = (admins ?? []) as Array<{ id: string; email: string | null }>;
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
          title: "☕ Nouvelle séance découverte",
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
      const html = rdvEmailHtml({
        kind: "confirm",
        firstName,
        coachName: "un coach du Breakfast Club",
        dateLabel: parisDateLabel(slotStart.toISOString()),
        hour: parisHourLabel(slotStart.toISOString()),
        location,
      });
      confirmEmailSent = await sendViaResend(contact, "✅ Ta séance découverte est réservée", html);
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
    <h1 style="font-size:22px;margin:8px 0 2px;color:#17201C;">Nouveau lead — séance découverte</h1>
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
    <p style="font-size:12px;color:#8A8578;margin:16px 0 0;">Réponds à cet email pour joindre directement le lead. Retrouve-le aussi dans le CRM.</p>
  </div>
</body></html>`.trim();

    // Destinataires : la boîte partagée de l'équipe + la boîte PERSO de chaque
    // coach du club. Dédupliqué (en minuscules) pour ne jamais envoyer deux fois
    // au même endroit si un coach utilise l'adresse partagée.
    const recipients = Array.from(
      new Set(
        [LEAD_NOTIFY_EMAIL, ...clubStaff.map((s) => s.email ?? "")]
          .map((e) => e.trim().toLowerCase())
          .filter((e) => e && EMAIL_RE.test(e)),
      ),
    );
    const subject = `☕ Nouveau lead — ${fullName}${peopleCount === 2 ? " (+1)" : ""} · ${dateLabel} ${hour}`;
    for (const to of recipients) {
      // reply-to = le lead, pour répondre en un clic
      await sendViaResend(to, subject, internalHtml, contact || undefined);
    }
  } catch (_e) {
    // notif interne best-effort — la résa est déjà enregistrée
  }

  return jsonResponse({ success: true, id: bookingId, confirmEmailSent });
});
