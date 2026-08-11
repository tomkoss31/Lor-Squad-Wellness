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
import { rdvEmailHtml, notifInterneHtml } from "../_shared/rdvEmail.ts";

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
  // 3. Vérification ET écriture dans la MÊME transaction, sous verrou.
  //
  //    Avant le 2026-08-11, `is_coach_slot_free` était appelée ici puis l'INSERT
  //    suivait séparément. Entre les deux, une autre demande pouvait passer le
  //    même contrôle : les deux le réussissaient, les deux écrivaient, et deux
  //    personnes se présentaient au même rendez-vous. La fenêtre est courte mais
  //    réelle — deux prospects sur la même page qui tapent « Confirmer » à la
  //    même seconde.
  //
  //    `book_coach_rdv` prend un verrou sur (coach, créneau), recontrôle SOUS le
  //    verrou avec la même fonction que l'affichage, puis insère. Elle renvoie
  //    NULL si le créneau vient d'être pris — c'est le 409.
  //    (Même mécanique que `book_club_discovery` côté Breakfast Club.)
  const metadataRecrut = isRecrut
    ? {
        last_name: lastName || null,
        phone: phone || null,
        city: city || null,
        looking: looking || null,
        timing: timing || null,
        note: note || null,
      }
    : null;

  const { data: nouvelId, error: insErr } = await sb.rpc("book_coach_rdv", {
    p_coach_user_id: coachUserId,
    p_slot_start: slotStart.toISOString(),
    p_slot_end: slotEnd.toISOString(),
    p_first_name: firstName,
    p_contact: contact,
    p_mode: mode,
    p_coach_slug: coachSlug || null,
    p_online_bilan_id: body.onlineBilanId ?? null,
    p_booking_type: isRecrut ? "recrutement" : "bilan",
    p_metadata: metadataRecrut,
  });

  if (!insErr && !nouvelId) {
    // Le créneau a été pris pendant qu'on regardait.
    return jsonResponse({ success: false, error: "creneau_pris" }, 409);
  }
  const inserted = nouvelId ? { id: nouvelId as string } : null;
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

    // Deux histoires différentes : un candidat qui veut ouvrir un club, ou
    // quelqu'un qui vient faire son bilan. Deux MARQUES différentes aussi —
    // d'où deux thèmes. Avant le 2026-08-11 les deux partaient en crème +
    // orange Breakfast Club, y compris pour annoncer un RDV La Base 360.
    const entete = isRecrut
      ? {
          theme: "club" as const,
          eyebrow: "🤝 Breakfast Club · Recrutement",
          titre: "Nouveau candidat — ouvrir un club",
          phrase: `${esc(fullName)} veut en parler avec l'équipe, le <b>${esc(dateLabel)} · ${esc(hour)}</b> (${modeLabel}).`,
          sujet: `🤝 Candidat équipe — ${fullName} · ${dateLabel} ${hour}`,
          pied: "Réponds à cet email pour joindre directement le candidat. Retrouve-le aussi dans le CRM (RDV demandés).",
        }
      : {
          theme: "app" as const,
          eyebrow: "🗓️ La Base 360 · Nouveau RDV",
          titre: "Une demande de rendez-vous",
          phrase: `${esc(fullName || "Quelqu'un")} a réservé un bilan${coachSlug ? ` avec <b>${esc(coachSlug)}</b>` : ""}, le <b>${esc(dateLabel)} · ${esc(hour)}</b> (${modeLabel}).`,
          sujet: `🗓️ Nouveau RDV — ${fullName || "prospect"} · ${dateLabel} ${hour}`,
          pied: "Le RDV est en attente : il faut l'accepter dans le CRM (RDV demandés). Réponds à cet email pour joindre directement la personne.",
        };

    const lignes: Array<[string, string]> = isRecrut
      ? [
          ["Prénom / Nom", esc(fullName)],
          ["Ce qu'il/elle cherche", esc(lbl(LOOKING_LABELS, looking))],
          ["Se projette", esc(lbl(TIMING_LABELS, timing))],
          ["Email", contact ? esc(contact) : "—"],
          ["Téléphone", phone ? esc(phone) : "—"],
          ["Ville", city ? esc(city) : "—"],
          ["Créneau", `${esc(dateLabel)} · ${esc(hour)}`],
          ["Son mot", note ? esc(note) : "—"],
        ]
      : [
          ["Prénom / Nom", esc(fullName) || "—"],
          ["Contact", contact ? esc(contact) : "—"],
          ["Téléphone", phone ? esc(phone) : "—"],
          ["Coach demandé", coachSlug ? esc(coachSlug) : "—"],
          ["Créneau", `${esc(dateLabel)} · ${esc(hour)}`],
          ["Format", modeLabel],
          ["Son mot", note ? esc(note) : "—"],
        ];

    const internalHtml = notifInterneHtml({
      theme: entete.theme,
      eyebrow: entete.eyebrow,
      titre: entete.titre,
      phrase: entete.phrase,
      lignes,
      pied: entete.pied,
    });

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
        kind: "requested",
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
      // Le RDV est créé en `requested` : ce mail accuse réception d'une
      // DEMANDE, il ne confirme rien. Le « c'est confirmé » part quand le
      // coach accepte dans le CRM (edge rdv-accepted-notify, 2026-08-11).
      confirmEmailSent = await sendViaResend(contact, "On a bien reçu ta demande de rendez-vous", html);
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
