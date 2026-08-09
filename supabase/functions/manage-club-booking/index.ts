// =============================================================================
// manage-club-booking — le prospect gère SON rendez-vous depuis son email.
// Chantier « RDV du club », brique 5 (2026-08-09).
//
// Le lien « Modifier / annuler mon rendez-vous » de l'email de confirmation
// pointe vers /rdv/gerer/<manage_token>. Cette fonction sert cette page.
//
// POST { token, action: "status" | "cancel" | "reschedule", slotStart? }
//   status     → la réservation + les créneaux encore disponibles
//   cancel     → annule (la place se rouvre) + prévient les coachs par email
//   reschedule → déplace via la RPC atomique + prévient les coachs par email
//
// Auth = le jeton lui-même (uuid non devinable), donc pas de JWT :
//   supabase functions deploy manage-club-booking --no-verify-jwt
// Les réponses ne renvoient JAMAIS l'email ou le téléphone du prospect : la page
// publique n'en a pas besoin, et un jeton qui fuiterait n'exposerait rien.
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_DEFAULT = "La Base 360 <rdv@labase360.fr>";
const TEAM_EMAIL = "labaseverdun@gmail.com";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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

function parisDateLabel(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long",
  }).format(new Date(iso));
}
function parisHour(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris",
  });
}
function esc(s: string): string {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}

async function sendMail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY || !to) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_DEFAULT, to: [to], subject, html }),
    });
  } catch {
    // best-effort : l'action du prospect est déjà enregistrée
  }
}

/** Prévient l'équipe (boîte partagée + boîte perso de chaque coach actif). */
async function notifyStaff(
  sb: ReturnType<typeof createClient>,
  subject: string,
  html: string,
): Promise<void> {
  let emails: string[] = [];
  try {
    const { data } = await sb.from("users").select("email").eq("role", "admin").eq("active", true);
    emails = ((data ?? []) as Array<{ email: string | null }>).map((u) => u.email ?? "");
  } catch {
    // best-effort
  }
  const recipients = Array.from(
    new Set([TEAM_EMAIL, ...emails].map((e) => e.trim().toLowerCase()).filter((e) => e && EMAIL_RE.test(e))),
  );
  for (const to of recipients) await sendMail(to, subject, html);
}

function staffHtml(title: string, lines: string[]): string {
  return `
<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#F7F1E6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:26px 22px;">
    <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#E0532A;font-weight:700;">☕ Breakfast Club · Verdun</div>
    <h1 style="font-size:22px;margin:8px 0 12px;color:#17201C;">${esc(title)}</h1>
    <div style="background:#fff;border:1px solid #E7E1D6;border-radius:14px;padding:16px 20px;font-size:14px;color:#17201C;line-height:1.7;">
      ${lines.map((l) => `<div>${l}</div>`).join("")}
    </div>
    <p style="font-size:12px;color:#8A8578;margin:16px 0 0;">Le créneau a été mis à jour automatiquement dans « RDV du club ».</p>
  </div>
</body></html>`.trim();
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "method_not_allowed" }, 405);

  let body: { token?: string; action?: string; slotStart?: string };
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "invalid_json" }, 400);
  }

  const token = (body.token ?? "").trim();
  const action = (body.action ?? "status").trim();
  if (!UUID_RE.test(token)) return json({ success: false, error: "lien_invalide" }, 400);

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: booking, error: bErr } = await sb
    .from("rdv_bookings")
    .select("id, first_name, slot_start, slot_end, status, people_count, partner_first_name, club_id")
    .eq("manage_token", token)
    .maybeSingle();

  if (bErr) return json({ success: false, error: "lookup_failed" }, 500);
  if (!booking) return json({ success: false, error: "lien_invalide" }, 404);

  const b = booking as {
    id: string; first_name: string; slot_start: string; slot_end: string;
    status: string; people_count: number; partner_first_name: string | null; club_id: string | null;
  };

  // Le club, pour le slug (dispos) et le libellé du lieu.
  let clubSlug = "verdun";
  let clubCity = "Verdun";
  if (b.club_id) {
    const { data: club } = await sb.from("clubs").select("slug, city").eq("id", b.club_id).maybeSingle();
    if (club) {
      clubSlug = String((club as { slug: string }).slug ?? clubSlug);
      clubCity = String((club as { city: string | null }).city ?? clubCity) || clubCity;
    }
  }

  const publicBooking = {
    firstName: b.first_name,
    slotStart: b.slot_start,
    status: b.status,
    peopleCount: b.people_count,
    partnerFirstName: b.partner_first_name,
    location: `11 rue Saint Pierre, ${clubCity}`,
    isPast: new Date(b.slot_start).getTime() < Date.now(),
  };

  // ── status : la réservation + les créneaux encore libres ──────────────────
  if (action === "status") {
    const { data: slots } = await sb.rpc("get_club_discovery_availability", {
      p_slug: clubSlug,
      p_days: 21,
    });
    return json({
      success: true,
      booking: publicBooking,
      slots: ((slots ?? []) as Array<{ slot_start: string; remaining: number }>)
        .filter((s) => s.remaining > 0)
        .map((s) => ({ slotStart: s.slot_start, remaining: s.remaining })),
    });
  }

  if (b.status === "canceled") return json({ success: false, error: "deja_annule" }, 409);

  // ── cancel : la place se rouvre immédiatement ─────────────────────────────
  if (action === "cancel") {
    const { error } = await sb.from("rdv_bookings").update({ status: "canceled" }).eq("id", b.id);
    if (error) return json({ success: false, error: "cancel_failed" }, 500);

    await notifyStaff(
      sb,
      `❌ Annulation — ${b.first_name} · ${parisDateLabel(b.slot_start)} ${parisHour(b.slot_start)}`,
      staffHtml("Un rendez-vous vient d'être annulé", [
        `<b>${esc(b.first_name)}</b> a annulé depuis son email.`,
        `Créneau libéré : <b>${esc(parisDateLabel(b.slot_start))} · ${esc(parisHour(b.slot_start))}</b>`,
      ]),
    );
    return json({ success: true, booking: { ...publicBooking, status: "canceled" } });
  }

  // ── reschedule : déplacement atomique (capacité recontrôlée) ──────────────
  if (action === "reschedule") {
    const start = body.slotStart ? new Date(body.slotStart) : null;
    if (!start || Number.isNaN(start.getTime())) {
      return json({ success: false, error: "creneau_invalide" }, 400);
    }
    const durationMs = new Date(b.slot_end).getTime() - new Date(b.slot_start).getTime();
    const end = new Date(start.getTime() + (durationMs > 0 ? durationMs : 60 * 60_000));

    const { data: result, error } = await sb.rpc("reschedule_club_booking", {
      p_token: token,
      p_slot_start: start.toISOString(),
      p_slot_end: end.toISOString(),
    });
    if (error) return json({ success: false, error: "reschedule_failed" }, 500);
    if (result === "full") return json({ success: false, error: "creneau_pris" }, 409);
    if (result === "past") return json({ success: false, error: "creneau_passe" }, 400);
    if (result !== "ok") return json({ success: false, error: "lien_invalide" }, 404);

    await notifyStaff(
      sb,
      `🔄 RDV déplacé — ${b.first_name} · ${parisDateLabel(start.toISOString())} ${parisHour(start.toISOString())}`,
      staffHtml("Un rendez-vous vient d'être déplacé", [
        `<b>${esc(b.first_name)}</b> a déplacé son rendez-vous depuis son email.`,
        `Avant : ${esc(parisDateLabel(b.slot_start))} · ${esc(parisHour(b.slot_start))}`,
        `Après : <b>${esc(parisDateLabel(start.toISOString()))} · ${esc(parisHour(start.toISOString()))}</b>`,
      ]),
    );
    return json({
      success: true,
      booking: { ...publicBooking, slotStart: start.toISOString(), status: "requested", isPast: false },
    });
  }

  return json({ success: false, error: "action_inconnue" }, 400);
});
