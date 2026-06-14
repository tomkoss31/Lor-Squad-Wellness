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
        url: "/agenda",
        type: "rdv_booking",
      },
    });
  } catch (_e) {
    // push best-effort — la résa est déjà enregistrée
  }

  return jsonResponse({ success: true, id: (inserted as { id: string }).id });
});
