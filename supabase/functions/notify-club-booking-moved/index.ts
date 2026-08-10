// =============================================================================
// notify-club-booking-moved — prévenir la personne que SON rendez-vous a bougé.
//
// Appelée par l'app quand un coach déplace un RDV découverte et laisse la case
// « prévenir la personne » cochée (Mélanie, 2026-08-09). Décochée, l'app
// n'appelle simplement pas cette fonction : aucun mail ne part.
//
// POST { bookingId, previousStart }   ← JWT coach obligatoire (verify_jwt)
//
// Le déplacement lui-même est DÉJÀ fait par la RPC coach_reschedule_club_booking
// avant cet appel. Cette fonction ne fait qu'informer : si elle échoue, le
// rendez-vous reste déplacé, on ne revient pas en arrière.
//
// Un seul mail par déplacement. Il porte le lien personnel de la personne pour
// qu'elle puisse rechoisir un autre créneau si l'heure proposée ne lui va pas —
// c'est ce qui évite le ping-pong téléphonique.
//
// Déploiement : supabase functions deploy notify-club-booking-moved
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { rdvEmailHtml } from "../_shared/rdvEmail.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_DEFAULT = "La Base 360 <rdv@labase360.fr>";
const REPLY_TO_DEFAULT = "labaseverdun@gmail.com";
const PUBLIC_SITE_URL = "https://www.labase-nutrition.com";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

function parisDateLabel(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long",
  }).format(new Date(iso));
}
function parisHourLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris",
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ success: false, error: "method_not_allowed" }, 405);

  let body: { bookingId?: string; previousStart?: string };
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "invalid_json" }, 400);
  }
  const bookingId = (body.bookingId ?? "").trim();
  if (!bookingId) return json({ success: false, error: "booking_requis" }, 400);

  // Le JWT du coach est vérifié par la plateforme (verify_jwt). On re-contrôle
  // le rôle : un compte authentifié n'est pas forcément un admin du club.
  const authHeader = req.headers.get("Authorization") ?? "";
  const sbUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userRes } = await sbUser.auth.getUser();
  const uid = userRes?.user?.id;
  if (!uid) return json({ success: false, error: "non_authentifie" }, 401);

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: me } = await sb
    .from("users").select("role, active").eq("id", uid).maybeSingle();
  if (!me || (me as { role?: string }).role !== "admin" || !(me as { active?: boolean }).active) {
    return json({ success: false, error: "interdit" }, 403);
  }

  const { data: b } = await sb
    .from("rdv_bookings")
    .select("id, first_name, contact, slot_start, club_id, manage_token, status")
    .eq("id", bookingId)
    .maybeSingle();
  if (!b) return json({ success: false, error: "rdv_introuvable" }, 404);
  const booking = b as {
    first_name: string | null; contact: string | null; slot_start: string;
    club_id: string | null; manage_token: string | null; status: string;
  };
  if (booking.status === "canceled") return json({ success: false, error: "deja_annule" }, 409);

  // Pas d'email saisi (téléphone seul) : rien à envoyer, et ce n'est pas une
  // erreur — l'app doit juste savoir qu'aucun mail n'est parti, pour le dire.
  if (!booking.contact || !EMAIL_RE.test(booking.contact)) {
    return json({ success: true, sent: false, reason: "pas_d_email" });
  }

  const { data: club } = await sb
    .from("clubs").select("city").eq("id", booking.club_id ?? "").maybeSingle();
  const location = `11 rue Saint Pierre, ${String((club as { city?: string } | null)?.city ?? "Verdun").trim() || "Verdun"}`;

  const manageUrl = booking.manage_token
    ? `${PUBLIC_SITE_URL}/rdv/gerer/${booking.manage_token}`
    : undefined;

  const prev = body.previousStart
    ? `${parisDateLabel(body.previousStart)} · ${parisHourLabel(body.previousStart)}`
    : null;

  const html = rdvEmailHtml({
    kind: "confirm",
    firstName: (booking.first_name ?? "").trim() || "toi",
    coachName: "un coach du Breakfast Club",
    dateLabel: parisDateLabel(booking.slot_start),
    hour: parisHourLabel(booking.slot_start),
    location,
    manageUrl,
    theme: "club",
    hasAccount: false,
  });

  // On annonce le changement AVANT le récapitulatif : la personne doit
  // comprendre en une seconde que quelque chose a bougé, pas croire à un
  // doublon du mail de confirmation.
  const bandeau = `
<div style="max-width:480px;margin:0 auto;padding:22px 22px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="background:#FFF4E8;border:1px solid #F6C6A0;border-radius:14px;padding:16px 18px;">
    <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#E0532A;font-weight:700;">Changement d'horaire</div>
    <p style="font-size:14.5px;line-height:1.55;color:#17201C;margin:8px 0 0;">
      On a dû décaler ton rendez-vous${prev ? ` (initialement le <b>${prev}</b>)` : ""}. Voici le nouveau créneau — si l'heure ne te convient pas, tu peux en rechoisir une plus bas.
    </p>
  </div>
</div>`.trim();

  const finalHtml = html.replace(
    /(<body[^>]*>)/i,
    `$1\n${bandeau}`,
  );

  if (!RESEND_API_KEY) return json({ success: true, sent: false, reason: "resend_absent" });
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_DEFAULT,
        to: [booking.contact],
        subject: "🕘 Ton RDV découverte a changé d'heure",
        reply_to: REPLY_TO_DEFAULT,
        html: finalHtml,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn(`[notify-club-booking-moved] Resend KO : ${res.status} ${detail.slice(0, 200)}`);
      return json({ success: true, sent: false, reason: "envoi_echoue" });
    }
  } catch (err) {
    console.warn(`[notify-club-booking-moved] ${err instanceof Error ? err.message : "unknown"}`);
    return json({ success: true, sent: false, reason: "envoi_echoue" });
  }

  return json({ success: true, sent: true });
});
