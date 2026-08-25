// =============================================================================
// admin-resend-rdv-confirm — rattrape une confirmation de RDV publique qui n'est
// jamais partie (ex: incident quota Resend du 2026-08-21, cf. CLAUDE.md).
//
// POST { booking_id } avec JWT admin. Ne fait RIEN si confirm_email_sent_at
// est déjà rempli (idempotent — pas de doublon possible même en rejouant).
// Réutilise le même gabarit que book-rdv (_shared/rdvEmail.ts), pas de copie.
//
// Déploiement : supabase functions deploy admin-resend-rdv-confirm
// (JWT vérifié par défaut — admin only, contrôle DANS la fonction en plus).
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { rdvEmailHtml } from "../_shared/rdvEmail.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_DEFAULT = "La Base 360 <rdv@labase360.fr>";
const REPLY_TO_DEFAULT = "labaseverdun@gmail.com";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
function parisDateLabel(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" }).format(new Date(iso));
}
function parisHourLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const userClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: userData } = await userClient.auth.getUser(token);
  const uid = userData?.user?.id;
  if (!uid) return json({ error: "unauthorized" }, 401);

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: me } = await sb.from("users").select("role").eq("id", uid).maybeSingle();
  if (!me || (me as { role?: string }).role !== "admin") return json({ error: "forbidden" }, 403);

  let body: { booking_id?: string };
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  if (!body.booking_id) return json({ error: "missing_booking_id" }, 400);

  const { data: booking } = await sb
    .from("rdv_bookings")
    .select("id, first_name, contact, slot_start, mode, coach_user_id, confirm_email_sent_at")
    .eq("id", body.booking_id)
    .maybeSingle();
  if (!booking) return json({ error: "booking_not_found" }, 404);
  const b = booking as Record<string, unknown>;
  if (b.confirm_email_sent_at) return json({ ok: true, already_sent: true });

  const contact = String(b.contact ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) return json({ error: "no_valid_email_on_booking" }, 400);

  const { data: coach } = await sb.from("users").select("name, rdv_location, city").eq("id", b.coach_user_id as string).maybeSingle();
  const coachName = String((coach as { name?: string })?.name ?? "").trim() || "ton coach La Base";
  const whereLine = b.mode === "visio"
    ? "En visio — le lien te sera envoyé avant le RDV"
    : (String((coach as { rdv_location?: string; city?: string })?.rdv_location || (coach as { city?: string })?.city || "").trim() || "ton club La Base");

  const html = rdvEmailHtml({
    kind: "requested",
    firstName: String(b.first_name ?? ""),
    coachName,
    dateLabel: parisDateLabel(String(b.slot_start)),
    hour: parisHourLabel(String(b.slot_start)),
    location: whereLine,
    hasAccount: false,
  });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM_DEFAULT,
      to: [contact],
      subject: "On a bien reçu ta demande de rendez-vous",
      html,
      reply_to: REPLY_TO_DEFAULT,
    }),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    return json({ error: "resend_failed", detail: errBody }, 502);
  }

  await sb.from("rdv_bookings").update({ confirm_email_sent_at: new Date().toISOString() }).eq("id", body.booking_id);
  return json({ ok: true, sent_to: contact });
});
