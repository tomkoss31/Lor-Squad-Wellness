// =============================================================================
// client-rdv-reminder — rappels de RDV envoyés AU CLIENT / PROSPECT.
//
// Déclenché par pg_cron toutes les 30 min. TROIS sources de RDV :
//   1. follow_ups (client PWA existant) : « 2h avant » PUSH + « veille 18h »
//      PUSH + EMAIL. Anti-doublon client_rdv_reminders_sent (imminent2h/eve/
//      eve_email).
//   2. rdv_bookings (prospect via réservation publique) : EMAIL « veille 18h »
//      + SMS si un téléphone existe (anti-doublon reminder_email_sent_at /
//      reminder_sms_sent_at). Pas de push.
//   3. prospects (RDV ajouté À LA MAIN par le coach dans l'Agenda) : EMAIL
//      « veille 18h » uniquement, si un email a été renseigné. Anti-doublon
//      prospects.reminder_email_sent_at.
//
// Push via sendPushToClient. Email via Resend (nom du coach + lieu de RDV).
//
// SMS (02/09, chantier no-show RDV club) — pourquoi seulement rdv_bookings :
// c'est LA source où le lapin coûte cher (créneau perdu, personne d'autre ne
// peut le prendre) et où l'email seul s'est révélé insuffisant (mesuré :
// 4 lapins sur 7 depuis le 25/08, les 7 avaient pourtant reçu leur rappel
// email). `rdv_bookings` n'a pas de colonne téléphone — on le récupère par
// email dans `prospect_leads` (best-effort : si aucune fiche ou pas de
// téléphone, on envoie l'email seul, jamais d'erreur bloquante). Expéditeur
// alphanumérique Twilio (TWILIO_SENDER) : sens unique, transactionnel donc
// pas de fenêtre horaire imposée par les opérateurs français. Message SANS
// EMOJI volontairement — un seul emoji fait basculer le SMS de l'encodage
// GSM-7 (160 car./segment) à l'UCS-2 (70 car./segment) = jusqu'à ×3 le prix.
//
// Deploy : supabase functions deploy client-rdv-reminder
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getServiceClient,
  sendPushToClient,
  corsHeaders,
  jsonResponse,
} from "../_shared/push.ts";
import { rdvEmailHtml, expediteurPour, type RdvEmailTheme } from "../_shared/rdvEmail.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_DEFAULT = "La Base 360 <rdv@labase360.fr>";
const REPLY_TO_DEFAULT = "labaseverdun@gmail.com";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
const TWILIO_SENDER = Deno.env.get("TWILIO_SENDER") ?? "";

function parisHour(d: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hour12: false }).format(d),
  );
}
function parisDateStr(d: Date): string {
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
function parisHourLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
}
function parisDateLabel(iso: string): string {
  // ex : « mardi 1 juillet »
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(iso));
}
async function sendViaResend(to: string, subject: string, html: string, from?: string): Promise<boolean> {
  if (!RESEND_API_KEY || !to) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: from ?? FROM_DEFAULT, to: [to], subject, reply_to: REPLY_TO_DEFAULT, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Les numéros en base sont saisis à la main sous 4 formats au moins :
// 0672831599 / +33608338106 / 06 28 28 68 78 / 07 63 92 01 09. Twilio exige
// du E.164 strict (+33XXXXXXXXX). Rend null plutôt que d'envoyer à l'aveugle
// sur un numéro mal formé (fixe, incomplet, étranger non géré).
function toE164FR(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+33") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `+33${digits.slice(1)}`;
  if (digits.startsWith("33") && digits.length === 11) return `+${digits}`;
  return null;
}

async function sendViaTwilio(to: string, body: string): Promise<boolean> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_SENDER || !to) return false;
  try {
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const params = new URLSearchParams({ To: to, From: TWILIO_SENDER, Body: body });
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}


serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = getServiceClient();
  const now = new Date();
  const hourParis = parisHour(now);
  const tomorrowParis = parisDateStr(new Date(now.getTime() + 24 * 60 * 60 * 1000));
  const coarseEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

  try {
    const { data: followUps, error: fuErr } = await sb
      .from("follow_ups")
      .select("id, client_id, due_date, type, status")
      .eq("status", "scheduled")
      .neq("notify_client", false) // opt-out : RDV modifié en silence = pas de rappel
      .gte("due_date", now.toISOString())
      .lte("due_date", coarseEnd);
    if (fuErr) return jsonResponse({ error: fuErr.message }, 500);

    const rows = (followUps ?? []).filter((f) => f.client_id && f.due_date);

    // Compteurs partagés — les blocs PROSPECTS (rdv_bookings + prospects) tournent
    // MÊME sans follow_up client. Avant : un return anticipé ici quand rows vide
    // court-circuitait les rappels prospects (jamais envoyés les jours sans suivi
    // client programmé).
    let sent = 0;
    let emails = 0;
    let skipped = 0;
    // Rappels ecartes parce que DEJA envoyes pour ce RDV. Sans ce compteur,
    // un blocage total est indiscernable d'une journee sans RDV.
    let dejaFait = 0;

    // ── Bloc 1 : rappels aux CLIENTS PWA (source follow_ups) ─────────────────
    if (rows.length > 0) {
    // Clients → email + nom + coach.
    const clientIds = [...new Set(rows.map((f) => f.client_id as string))];
    const { data: clients } = await sb
      .from("clients")
      .select("id, distributor_id, first_name, last_name, email")
      .in("id", clientIds);
    const coachByClient = new Map<string, string | null>();
    const clientEmail = new Map<string, string | null>();
    const clientFirst = new Map<string, string>();
    const distributorIds = new Set<string>();
    for (const c of clients ?? []) {
      coachByClient.set(c.id as string, (c.distributor_id as string) ?? null);
      clientEmail.set(c.id as string, (c.email as string) ?? null);
      clientFirst.set(c.id as string, String((c.first_name as string) ?? "").trim());
      if (c.distributor_id) distributorIds.add(c.distributor_id as string);
    }

    // Coachs → prénom (push) + nom complet + lieu de RDV (email).
    const coachFirst = new Map<string, string>();
    const coachFull = new Map<string, string>();
    const coachLoc = new Map<string, string>();
    if (distributorIds.size > 0) {
      const { data: users } = await sb
        .from("users")
        .select("id, name, rdv_location, city")
        .in("id", [...distributorIds]);
      for (const u of users ?? []) {
        const full = String((u.name as string) ?? "").trim();
        coachFirst.set(u.id as string, full.split(/\s+/)[0] || "votre coach");
        coachFull.set(u.id as string, full || "votre coach");
        coachLoc.set(u.id as string, String((u.rdv_location as string) || (u.city as string) || "").trim());
      }
    }
    const distFor = (clientId: string) => coachByClient.get(clientId) ?? null;

    // ⚠️ La DATE DU RDV fait partie de la clé. Sans elle (jusqu'au 2026-08-14),
    // un suivi replanifié gardait son marqueur : le client ne recevait plus
    // jamais de rappel, à vie. Christophe avait RDV le 14/08 et son marqueur
    // datait du 16/07 — rien n'est parti, et rien ne le disait.
    const { data: markers } = await sb
      .from("client_rdv_reminders_sent")
      .select("follow_up_id, kind, rdv_date")
      .in("follow_up_id", rows.map((f) => f.id as string));
    const sentSet = new Set(
      (markers ?? []).map((m) => `${m.follow_up_id}:${m.kind}:${m.rdv_date}`),
    );

    /** La clé d'un rappel : un suivi, un type, ET le jour visé. */
    const cle = (fid: string, kind: string, rdvDate: string) => `${fid}:${kind}:${rdvDate}`;

    const mark = async (fid: string, kind: string, rdvDate: string) =>
      sb.from("client_rdv_reminders_sent").upsert(
        { follow_up_id: fid, kind, rdv_date: rdvDate },
        { onConflict: "follow_up_id,kind,rdv_date", ignoreDuplicates: true },
      );

    for (const fu of rows) {
      const fid = fu.id as string;
      const clientId = fu.client_id as string;
      const due = new Date(fu.due_date as string);
      const minsUntil = (due.getTime() - now.getTime()) / 60000;
      const dist = distFor(clientId);
      const coachP = (dist && coachFirst.get(dist)) || "votre coach";
      const hour = parisHourLabel(fu.due_date as string);
      const jourRdv = parisDateStr(due);

      // ─── Rappel « 2h avant » (push) ─────────────────────────────────────
      const imminent = minsUntil >= 105 && minsUntil <= 150;
      if (imminent && sentSet.has(cle(fid, "imminent2h", jourRdv))) dejaFait += 1;
      if (imminent && !sentSet.has(cle(fid, "imminent2h", jourRdv))) {
        const r = await sendPushToClient(sb, clientId, {
          title: "⏰ Votre RDV dans 2h",
          body: `Avec ${coachP} à ${hour}. À tout à l'heure 🌿`,
          url: "/",
          type: "rdv_reminder",
        });
        if (r.sent) {
          await mark(fid, "imminent2h", jourRdv);
          sent += 1;
        } else skipped += 1;
      }

      // ─── Rappel « la veille à 18h » (push + email) ──────────────────────
      const isEve = hourParis === 18 && parisDateStr(due) === tomorrowParis;
      if (isEve && sentSet.has(cle(fid, "eve", jourRdv))) dejaFait += 1;
      if (isEve && !sentSet.has(cle(fid, "eve", jourRdv))) {
        const r = await sendPushToClient(sb, clientId, {
          title: `📅 RDV demain avec ${coachP}`,
          body: `Demain à ${hour}. Pense à bien t'hydrater d'ici là 💧`,
          url: "/",
          type: "rdv_reminder",
        });
        if (r.sent) {
          await mark(fid, "eve", jourRdv);
          sent += 1;
        } else skipped += 1;
      }
      if (isEve && sentSet.has(cle(fid, "eve_email", jourRdv))) dejaFait += 1;
      if (isEve && !sentSet.has(cle(fid, "eve_email", jourRdv))) {
        const to = clientEmail.get(clientId);
        if (to) {
          const html = rdvEmailHtml({
            kind: "reminder",
            firstName: clientFirst.get(clientId) || "",
            coachName: (dist && coachFull.get(dist)) || "votre coach",
            dateLabel: parisDateLabel(fu.due_date as string),
            hour,
            location: (dist && coachLoc.get(dist)) || "votre club La Base",
          });
          const ok = await sendViaResend(to, "📅 Votre rendez-vous, c'est demain", html);
          if (ok) {
            await mark(fid, "eve_email", jourRdv);
            emails += 1;
          } else skipped += 1;
        }
      }
    }
    } // ── fin Bloc 1 (follow_ups)

    // ─── Mail J-1 aux PROSPECTS (rdv_bookings, funnel public) ───────────────
    // Pas de push (le prospect n'est pas sur la PWA) — uniquement l'email, et
    // seulement si un email a été laissé. Anti-doublon = reminder_email_sent_at.
    let prospectEmails = 0;
    if (hourParis === 18) {
      // Fenêtre large en UTC, puis filtre par DATE Paris en JS. NE PAS coder
      // l'offset en dur (+02:00) : faux en hiver (CET = +01:00) → fenêtre décalée
      // d'1h, rappels ratés/erronés. parisDateStr gère le fuseau correctement.
      const { data: bookings } = await sb
        .from("rdv_bookings")
        // ⚠️ 28/08 — `club_id` sert à choisir la CHARTE du rappel. Sans lui, une
        // personne qui réserve sur le site du Breakfast Club recevait sa
        // confirmation en crème et orange, puis un rappel vert La Base 360 la
        // veille : deux marques pour un même rendez-vous.
        .select("id, coach_user_id, club_id, first_name, contact, mode, slot_start, manage_token, reminder_sms_sent_at")
        // ⚠️ 25/08 — c'était `.neq("status", "canceled")`, donc le rappel partait
        // AUSSI sur les demandes jamais acceptées : toute réservation du club
        // naît en « requested ». La personne recevait « ton rendez-vous, c'est
        // demain » pour un créneau que personne n'avait validé — et le drapeau
        // anti-doublon était posé au passage, donc le VRAI rappel ne pouvait
        // plus jamais partir.
        //
        // On ne rappelle que ce qui est CONFIRMÉ. Ça écarte du même coup
        // `honored` et `no_show`, qui n'ont plus rien à rappeler.
        .eq("status", "confirmed")
        .is("reminder_email_sent_at", null)
        .gte("slot_start", now.toISOString())
        .lte("slot_start", coarseEnd);

      const validBookings = (bookings ?? []).filter(
        (b) =>
          b.contact &&
          EMAIL_RE.test(String(b.contact)) &&
          parisDateStr(new Date(b.slot_start as string)) === tomorrowParis,
      );
      if (validBookings.length > 0) {
        const coachIds = [...new Set(validBookings.map((b) => b.coach_user_id).filter(Boolean))] as string[];
        const cFull = new Map<string, string>();
        const cLoc = new Map<string, string>();
        if (coachIds.length > 0) {
          const { data: us } = await sb.from("users").select("id, name, rdv_location, city").in("id", coachIds);
          for (const u of us ?? []) {
            cFull.set(u.id as string, String((u.name as string) ?? "").trim() || "votre coach");
            cLoc.set(u.id as string, String((u.rdv_location as string) || (u.city as string) || "").trim());
          }
        }

        // Téléphone du prospect — best-effort. `rdv_bookings` n'a pas de
        // colonne téléphone, on le cherche dans `prospect_leads` par email
        // (seule clé commune). Un lead absent, sans téléphone, ou un numéro
        // qui ne se normalise pas en E.164 ne bloque JAMAIS l'email : le SMS
        // est un plus, jamais une condition.
        const phoneByEmail = new Map<string, string>();
        const contactEmails = validBookings.map((b) => String(b.contact ?? "").toLowerCase()).filter(Boolean);
        if (contactEmails.length > 0) {
          const { data: leads } = await sb
            .from("prospect_leads")
            .select("email, phone")
            .not("phone", "is", null)
            .limit(1000);
          for (const l of leads ?? []) {
            const em = String((l.email as string) ?? "").toLowerCase();
            if (em && contactEmails.includes(em)) phoneByEmail.set(em, String(l.phone as string));
          }
        }

        for (const b of validBookings) {
          const cid = b.coach_user_id as string | null;
          const isVisio = (b.mode as string) === "visio";
          const where = isVisio
            ? "En visio — le lien te sera envoyé avant le RDV"
            : ((cid && cLoc.get(cid)) || "votre club La Base");
          const themeRdv: RdvEmailTheme = b.club_id ? "club" : "app";
          // ⚠️ 03/09/2026 — le rappel ne passait PAS `manageUrl`, alors que le
          // jeton est lu juste au-dessus pour le SMS. Le gabarit retombait donc
          // sur « Accéder à mon espace → », envoyé a des PROSPECTS qui n'ont
          // aucun compte : une page de connexion en guise de porte de sortie.
          // Agnes Florentin a du annuler par mail le 03/09 faute de bouton.
          const html = rdvEmailHtml({
            kind: "reminder",
            theme: themeRdv,
            firstName: String((b.first_name as string) ?? "").split(/\s+/)[0] || "",
            coachName: (cid && cFull.get(cid)) || "votre coach",
            dateLabel: parisDateLabel(b.slot_start as string),
            hour: parisHourLabel(b.slot_start as string),
            location: where,
            manageUrl: b.manage_token
              ? `https://www.labase-nutrition.com/rdv/gerer/${b.manage_token}`
              : undefined,
            // Sans jeton : aucun bouton plutot qu'un cul-de-sac.
            hasAccount: false,
          });
          const ok = await sendViaResend(String(b.contact), "📅 Votre rendez-vous, c'est demain", html, expediteurPour(themeRdv));
          if (ok) {
            await sb.from("rdv_bookings").update({ reminder_email_sent_at: new Date().toISOString() }).eq("id", b.id);
            prospectEmails += 1;
          } else skipped += 1;

          if (!b.reminder_sms_sent_at) {
            const phone = toE164FR(phoneByEmail.get(String(b.contact ?? "").toLowerCase()));
            if (phone) {
              const whereSms = isVisio ? "en visio (lien envoye par email)" : (where || "votre club La Base");
              const manageUrl = b.manage_token ? `https://www.labase-nutrition.com/rdv/gerer/${b.manage_token}` : null;
              const smsBody = [
                `Rappel : votre RDV decouverte est demain ${parisHourLabel(b.slot_start as string)}, ${whereSms}.`,
                manageUrl ? `Empechement ? ${manageUrl}` : "Empechement ? Contactez-nous.",
              ].join(" ");
              const smsOk = await sendViaTwilio(phone, smsBody);
              if (smsOk) {
                await sb.from("rdv_bookings").update({ reminder_sms_sent_at: new Date().toISOString() }).eq("id", b.id);
              }
            }
          }
        }
      }
    }

    // ─── Mail J-1 aux PROSPECTS ajoutés MANUELLEMENT dans l'Agenda ──────────
    // (table `prospects`, RDV saisi à la main par le coach). Même logique que
    // rdv_bookings : pas de push (le prospect n'est pas sur la PWA), email
    // uniquement si un email a été renseigné. Anti-doublon = reminder_email_sent_at.
    let manualProspectEmails = 0;
    if (hourParis === 18) {
      // Idem : filtre par DATE Paris en JS, pas d'offset codé en dur.
      const { data: prospects } = await sb
        .from("prospects")
        .select("id, distributor_id, first_name, email, rdv_date, status")
        .eq("status", "scheduled")
        .is("reminder_email_sent_at", null)
        .gte("rdv_date", now.toISOString())
        .lte("rdv_date", coarseEnd);

      const validProspects = (prospects ?? []).filter(
        (p) =>
          p.email &&
          EMAIL_RE.test(String(p.email)) &&
          parisDateStr(new Date(p.rdv_date as string)) === tomorrowParis,
      );
      if (validProspects.length > 0) {
        const coachIds = [...new Set(validProspects.map((p) => p.distributor_id).filter(Boolean))] as string[];
        const pFull = new Map<string, string>();
        const pLoc = new Map<string, string>();
        if (coachIds.length > 0) {
          const { data: us } = await sb.from("users").select("id, name, rdv_location, city").in("id", coachIds);
          for (const u of us ?? []) {
            pFull.set(u.id as string, String((u.name as string) ?? "").trim() || "votre coach");
            pLoc.set(u.id as string, String((u.rdv_location as string) || (u.city as string) || "").trim());
          }
        }
        for (const p of validProspects) {
          const cid = p.distributor_id as string | null;
          const html = rdvEmailHtml({
            kind: "reminder",
            firstName: String((p.first_name as string) ?? "").split(/\s+/)[0] || "",
            coachName: (cid && pFull.get(cid)) || "votre coach",
            dateLabel: parisDateLabel(p.rdv_date as string),
            hour: parisHourLabel(p.rdv_date as string),
            location: (cid && pLoc.get(cid)) || "votre club La Base",
            // RDV saisi a la main depuis l'agenda : la personne n'a ni espace
            // client ni lien de gestion. Mieux vaut aucun bouton.
            hasAccount: false,
          });
          const ok = await sendViaResend(String(p.email), "📅 Votre rendez-vous, c'est demain", html);
          if (ok) {
            await sb.from("prospects").update({ reminder_email_sent_at: new Date().toISOString() }).eq("id", p.id);
            manualProspectEmails += 1;
          } else skipped += 1;
        }
      }
    }

    return jsonResponse({ ok: true, found: rows.length, hourParis, tomorrowParis, sent, emails, prospectEmails, manualProspectEmails, skipped, dejaFait });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : "unknown" }, 500);
  }
});
