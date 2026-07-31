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
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ success: false, error: "method_not_allowed" }, 405);

  let body: {
    clubSlug?: string;
    slotStart?: string;
    firstName?: string;
    contact?: string;
    peopleCount?: number;
    partnerFirstName?: string;
    objectif?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ success: false, error: "invalid_json" }, 400);
  }

  const clubSlug = (body.clubSlug ?? "").trim();
  const firstName = (body.firstName ?? "").trim();
  const contact = (body.contact ?? "").trim() || null;
  const peopleCount = body.peopleCount === 2 ? 2 : 1;
  const partner = (body.partnerFirstName ?? "").trim() || null;
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

  // 3. Notif push aux admins du club (non bloquant)
  try {
    const { data: admins } = await sb
      .from("users")
      .select("id")
      .eq("role", "admin")
      .eq("active", true);
    const whenParis = new Intl.DateTimeFormat("fr-FR", {
      weekday: "short", day: "2-digit", month: "short",
      hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris",
    }).format(slotStart);
    const peopleTag = peopleCount === 2 ? " · 2 pers." : "";
    for (const a of (admins ?? []) as Array<{ id: string }>) {
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
        coachName: `l'équipe du ${clubName}`,
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

  return jsonResponse({ success: true, id: bookingId, confirmEmailSent });
});
