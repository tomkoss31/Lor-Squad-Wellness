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
import { rdvEmailHtml } from "../_shared/rdvEmail.ts";

const SLOT_MIN = 30;

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_DEFAULT = "La Base 360 <rdv@labase360.fr>";
const REPLY_TO_DEFAULT = "labaseverdun@gmail.com";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Recrutement (« ouvrir un club », tunnel /club/rejoindre/rdv) : on prévient
// l'équipe par email en plus du push — elle ne consulte pas toujours le CRM.
const TEAM_NOTIFY_EMAIL = "labaseverdun@gmail.com";
const LOOKING_LABELS: Record<string, string> = {
  reconversion: "🔄 Une reconversion",
  complement: "💶 Un complément de revenu",
  curieux: "👀 Juste curieux·se",
};
const TIMING_LABELS: Record<string, string> = {
  asap: "Dès que possible",
  "few-months": "Dans quelques mois",
  info: "Se renseigne d'abord",
};
function lbl(map: Record<string, string>, code: string | null | undefined): string {
  const c = (code ?? "").trim();
  return c ? (map[c] ?? c) : "—";
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
    coachSlug?: string;
    mode?: string;
    slotStart?: string;
    firstName?: string;
    contact?: string;
    onlineBilanId?: string;
    // Recrutement « ouvrir un club » (tunnel /club/rejoindre/rdv)
    bookingType?: string;
    lastName?: string;
    phone?: string;
    city?: string;
    looking?: string;
    timing?: string;
    note?: string;
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

  // Type de RDV : 'recrutement' = candidat « ouvrir un club ». Défaut 'bilan'
  // → le comportement historique du funnel /rdv reste strictement inchangé.
  const isRecrut = (body.bookingType ?? "").trim() === "recrutement";
  const lastName = (body.lastName ?? "").trim();
  const phone = (body.phone ?? "").trim();
  const city = (body.city ?? "").trim();
  const looking = (body.looking ?? "").trim();
  const timing = (body.timing ?? "").trim();
  const note = (body.note ?? "").trim();

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
  //
  // CORRECTIF 2026-07-27 : cette vérification ne regardait que
  // `rdv_bookings` — les réservations venues du funnel. Elle ignorait
  // l'agenda réel du coach (RDV prospects et RDV clients), exactement comme
  // le faisait l'affichage des disponibilités. Mesuré avant correctif :
  // 26 créneaux déjà occupés étaient proposés, dont 18 chez Mélanie.
  //
  // On délègue désormais à `is_coach_slot_free`, la SEULE définition de
  // « ce créneau est libre » : l'affichage et l'écriture partagent la même
  // règle et ne peuvent plus diverger. Un prospect resté sur une page ouverte
  // ne peut donc plus réserver par-dessus un rendez-vous existant.
  const { data: slotFree, error: clashErr } = await sb.rpc("is_coach_slot_free", {
    p_coach_user_id: coachUserId,
    p_start: slotStart.toISOString(),
    p_end: slotEnd.toISOString(),
  });
  if (clashErr) {
    return jsonResponse({ success: false, error: "check_failed" }, 500);
  }
  if (slotFree !== true) {
    return jsonResponse({ success: false, error: "creneau_pris" }, 409);
  }

  // 3. Insert. Le chemin bilan reste STRICTEMENT identique (aucune colonne
  //    booking_type / metadata écrite) → l'edge continue de tourner même si la
  //    migration recrutement n'est pas encore appliquée. Seul le recrutement
  //    écrit ces colonnes, il dépend donc de la migration 20261209100000.
  const insertRow: Record<string, unknown> = {
    coach_user_id: coachUserId,
    coach_slug: coachSlug || null,
    first_name: firstName,
    contact,
    mode,
    slot_start: slotStart.toISOString(),
    slot_end: slotEnd.toISOString(),
    status: "requested",
    online_bilan_id: body.onlineBilanId ?? null,
  };
  if (isRecrut) {
    insertRow.booking_type = "recrutement";
    insertRow.metadata = {
      last_name: lastName || null,
      phone: phone || null,
      city: city || null,
      looking: looking || null,
      timing: timing || null,
      note: note || null,
    };
  }
  const { data: inserted, error: insErr } = await sb
    .from("rdv_bookings")
    .insert(insertRow)
    .select("id")
    .single();
  if (insErr) {
    return jsonResponse({ success: false, error: "insert_failed", detail: insErr.message }, 500);
  }

  // 4. Notif coach (non bloquant)
  const whenParis = new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(slotStart);
  try {
    await sendPushToUser(sb, {
      userId: coachUserId,
      payload: isRecrut
        ? {
            title: "🤝 Nouveau candidat équipe",
            body: `${firstName}${lastName ? " " + lastName : ""} — ${whenParis}${looking ? ` · ${lbl(LOOKING_LABELS, looking)}` : ""}`,
            url: "/crm",
            type: "rdv_recrutement",
          }
        : {
            title: "🗓️ Nouveau RDV demandé",
            body: `${firstName} — ${whenParis} (${mode === "visio" ? "visio" : "présentiel"})`,
            url: "/crm",
            type: "rdv_booking",
          },
    });
  } catch (_e) {
    // push best-effort — la résa est déjà enregistrée
  }

  // 4b. Notif email à l'équipe, sur TOUTE demande de RDV.
  //
  //     Avant le 2026-08-11 cet email ne partait QUE pour le recrutement
  //     (`if (isRecrut)`). Un bilan pris depuis le tunnel colis ou la fiche
  //     coach ne laissait donc qu'un push — et le push n'est pas toujours
  //     activé, ni lu. Demande Thomas : toute demande de RDV atterrit sur
  //     labaseverdun@gmail.com.
  //
  //     Reply-to = le prospect, pour lui répondre en un clic.
  try {
    const dateLabel = parisDateLabel(slotStart.toISOString());
    const hour = parisHourLabel(slotStart.toISOString());
    const fullName = `${firstName}${lastName ? " " + lastName : ""}`.trim();
    const modeLabel = mode === "visio" ? "visio" : "présentiel";
    const row = (k: string, v: string) =>
      `<tr><td style="padding:6px 14px 6px 0;color:#7A8099;font-size:13px;white-space:nowrap;vertical-align:top;">${k}</td><td style="padding:6px 0;color:#17201C;font-size:14px;font-weight:600;">${v}</td></tr>`;

    // Deux histoires différentes : un candidat qui veut ouvrir un club, ou
    // quelqu'un qui vient faire son bilan. Même gabarit, contenu distinct.
    const entete = isRecrut
      ? {
          eyebrow: "🤝 Breakfast Club · Recrutement",
          titre: "Nouveau candidat — ouvrir un club",
          phrase: `${esc(fullName)} veut en parler avec l'équipe, le <b>${esc(dateLabel)} · ${esc(hour)}</b> (${modeLabel}).`,
          sujet: `🤝 Candidat équipe — ${fullName} · ${dateLabel} ${hour}`,
          pied: "Réponds à cet email pour joindre directement le candidat. Retrouve-le aussi dans le CRM (RDV demandés).",
        }
      : {
          eyebrow: "🗓️ La Base 360 · Nouveau RDV",
          titre: "Une demande de rendez-vous",
          phrase: `${esc(fullName || "Quelqu'un")} a réservé un bilan${coachSlug ? ` avec <b>${esc(coachSlug)}</b>` : ""}, le <b>${esc(dateLabel)} · ${esc(hour)}</b> (${modeLabel}).`,
          sujet: `🗓️ Nouveau RDV — ${fullName || "prospect"} · ${dateLabel} ${hour}`,
          pied: "Le RDV est en attente : il faut l'accepter dans le CRM (RDV demandés). Réponds à cet email pour joindre directement la personne.",
        };

    const lignes = isRecrut
      ? [
          row("Prénom / Nom", esc(fullName)),
          row("Ce qu'il/elle cherche", esc(lbl(LOOKING_LABELS, looking))),
          row("Se projette", esc(lbl(TIMING_LABELS, timing))),
          row("Email", contact ? esc(contact) : "—"),
          row("Téléphone", phone ? esc(phone) : "—"),
          row("Ville", city ? esc(city) : "—"),
          row("Créneau", `${esc(dateLabel)} · ${esc(hour)}`),
          note ? row("Son mot", esc(note)) : "",
        ]
      : [
          row("Prénom / Nom", esc(fullName) || "—"),
          row("Contact", contact ? esc(contact) : "—"),
          row("Téléphone", phone ? esc(phone) : "—"),
          row("Coach demandé", coachSlug ? esc(coachSlug) : "—"),
          row("Créneau", `${esc(dateLabel)} · ${esc(hour)}`),
          row("Format", modeLabel),
          note ? row("Son mot", esc(note)) : "",
        ];

    const internalHtml = `
<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#F7F1E6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:26px 22px;">
    <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#E0532A;font-weight:700;">${entete.eyebrow}</div>
    <h1 style="font-size:22px;margin:8px 0 2px;color:#17201C;">${entete.titre}</h1>
    <p style="font-size:14px;color:#5F7154;margin:6px 0 18px;">${entete.phrase}</p>
    <div style="background:#fff;border:1px solid #E7E1D6;border-radius:14px;padding:16px 20px;">
      <table style="border-collapse:collapse;width:100%;">
        ${lignes.join("\n        ")}
      </table>
    </div>
    <p style="font-size:12px;color:#8A8578;margin:16px 0 0;">${entete.pied}</p>
  </div>
</body></html>`.trim();

    await sendViaResend(TEAM_NOTIFY_EMAIL, entete.sujet, internalHtml, contact || undefined);
  } catch (_e) {
    // notif interne best-effort — la résa est déjà enregistrée
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
      const html = rdvEmailHtml({
        kind: "confirm",
        firstName,
        coachName,
        dateLabel: parisDateLabel(slotStart.toISOString()),
        hour: parisHourLabel(slotStart.toISOString()),
        location: whereLine,
        // Tunnel public : la personne réserve son 1er rendez-vous, elle n'a pas
        // de compte. Pas de bouton « mon espace », il ne mènerait qu'à un écran
        // de connexion (retour Thomas 2026-08-09).
        hasAccount: false,
      });
      confirmEmailSent = await sendViaResend(contact, "✅ Ton rendez-vous est bien noté", html);
      if (confirmEmailSent) {
        await sb
          .from("rdv_bookings")
          .update({ confirm_email_sent_at: new Date().toISOString() })
          .eq("id", (inserted as { id: string }).id);
      }
    } catch (_e) {
      // email best-effort — la résa est déjà enregistrée
    }
  }

  return jsonResponse({ success: true, id: (inserted as { id: string }).id, confirmEmailSent });
});
