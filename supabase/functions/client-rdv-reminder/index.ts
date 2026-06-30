// =============================================================================
// client-rdv-reminder — rappels de RDV envoyés AU CLIENT (PWA).
//
// Déclenché par pg_cron toutes les 30 min. Par RDV :
//   • « 2h avant »   : PUSH (due_date dans [+105min, +150min])
//   • « veille 18h » : PUSH + EMAIL (RDV du lendemain, ~18h Paris)
//
// Source : follow_ups (status='scheduled', client_id). Push via sendPushToClient.
// Email via Resend (beau rappel : nom du coach + lieu de RDV). Anti-doublon via
// client_rdv_reminders_sent (1 ligne par follow_up + kind : imminent2h / eve /
// eve_email).
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
import { rdvEmailHtml } from "../_shared/rdvEmail.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_DEFAULT = "La Base 360 <rdv@labase360.fr>";
const REPLY_TO_DEFAULT = "contact@labase360.fr";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      .gte("due_date", now.toISOString())
      .lte("due_date", coarseEnd);
    if (fuErr) return jsonResponse({ error: fuErr.message }, 500);

    const rows = (followUps ?? []).filter((f) => f.client_id && f.due_date);
    if (rows.length === 0) return jsonResponse({ ok: true, found: 0, sent: 0 });

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
        coachFirst.set(u.id as string, full.split(/\s+/)[0] || "ton coach");
        coachFull.set(u.id as string, full || "ton coach");
        coachLoc.set(u.id as string, String((u.rdv_location as string) || (u.city as string) || "").trim());
      }
    }
    const distFor = (clientId: string) => coachByClient.get(clientId) ?? null;

    const { data: markers } = await sb
      .from("client_rdv_reminders_sent")
      .select("follow_up_id, kind")
      .in("follow_up_id", rows.map((f) => f.id as string));
    const sentSet = new Set((markers ?? []).map((m) => `${m.follow_up_id}:${m.kind}`));

    let sent = 0;
    let emails = 0;
    let skipped = 0;

    const mark = async (fid: string, kind: string) =>
      sb.from("client_rdv_reminders_sent").upsert(
        { follow_up_id: fid, kind },
        { onConflict: "follow_up_id,kind", ignoreDuplicates: true },
      );

    for (const fu of rows) {
      const fid = fu.id as string;
      const clientId = fu.client_id as string;
      const due = new Date(fu.due_date as string);
      const minsUntil = (due.getTime() - now.getTime()) / 60000;
      const dist = distFor(clientId);
      const coachP = (dist && coachFirst.get(dist)) || "ton coach";
      const hour = parisHourLabel(fu.due_date as string);

      // ─── Rappel « 2h avant » (push) ─────────────────────────────────────
      if (minsUntil >= 105 && minsUntil <= 150 && !sentSet.has(`${fid}:imminent2h`)) {
        const r = await sendPushToClient(sb, clientId, {
          title: "⏰ Ton RDV dans 2h",
          body: `Avec ${coachP} à ${hour}. À tout à l'heure 🌿`,
          url: "/",
          type: "rdv_reminder",
        });
        if (r.sent) {
          await mark(fid, "imminent2h");
          sent += 1;
        } else skipped += 1;
      }

      // ─── Rappel « la veille à 18h » (push + email) ──────────────────────
      const isEve = hourParis === 18 && parisDateStr(due) === tomorrowParis;
      if (isEve && !sentSet.has(`${fid}:eve`)) {
        const r = await sendPushToClient(sb, clientId, {
          title: `📅 RDV demain avec ${coachP}`,
          body: `Demain à ${hour}. Pense à bien t'hydrater d'ici là 💧`,
          url: "/",
          type: "rdv_reminder",
        });
        if (r.sent) {
          await mark(fid, "eve");
          sent += 1;
        } else skipped += 1;
      }
      if (isEve && !sentSet.has(`${fid}:eve_email`)) {
        const to = clientEmail.get(clientId);
        if (to) {
          const html = rdvEmailHtml({
            kind: "reminder",
            firstName: clientFirst.get(clientId) || "",
            coachName: (dist && coachFull.get(dist)) || "ton coach",
            dateLabel: parisDateLabel(fu.due_date as string),
            hour,
            location: (dist && coachLoc.get(dist)) || "ton club La Base",
          });
          const ok = await sendViaResend(to, "📅 Ton rendez-vous, c'est demain", html);
          if (ok) {
            await mark(fid, "eve_email");
            emails += 1;
          } else skipped += 1;
        }
      }
    }

    // ─── Mail J-1 aux PROSPECTS (rdv_bookings, funnel public) ───────────────
    // Pas de push (le prospect n'est pas sur la PWA) — uniquement l'email, et
    // seulement si un email a été laissé. Anti-doublon = reminder_email_sent_at.
    let prospectEmails = 0;
    if (hourParis === 18) {
      const dayStart = new Date(`${tomorrowParis}T00:00:00+02:00`).toISOString();
      const dayEnd = new Date(`${tomorrowParis}T23:59:59+02:00`).toISOString();
      const { data: bookings } = await sb
        .from("rdv_bookings")
        .select("id, coach_user_id, first_name, contact, mode, slot_start")
        .neq("status", "canceled")
        .is("reminder_email_sent_at", null)
        .gte("slot_start", dayStart)
        .lte("slot_start", dayEnd);

      const validBookings = (bookings ?? []).filter(
        (b) => b.contact && EMAIL_RE.test(String(b.contact)),
      );
      if (validBookings.length > 0) {
        const coachIds = [...new Set(validBookings.map((b) => b.coach_user_id).filter(Boolean))] as string[];
        const cFull = new Map<string, string>();
        const cLoc = new Map<string, string>();
        if (coachIds.length > 0) {
          const { data: us } = await sb.from("users").select("id, name, rdv_location, city").in("id", coachIds);
          for (const u of us ?? []) {
            cFull.set(u.id as string, String((u.name as string) ?? "").trim() || "ton coach");
            cLoc.set(u.id as string, String((u.rdv_location as string) || (u.city as string) || "").trim());
          }
        }
        for (const b of validBookings) {
          const cid = b.coach_user_id as string | null;
          const where = (b.mode as string) === "visio"
            ? "En visio — le lien te sera envoyé avant le RDV"
            : ((cid && cLoc.get(cid)) || "ton club La Base");
          const html = rdvEmailHtml({
            kind: "reminder",
            firstName: String((b.first_name as string) ?? "").split(/\s+/)[0] || "",
            coachName: (cid && cFull.get(cid)) || "ton coach",
            dateLabel: parisDateLabel(b.slot_start as string),
            hour: parisHourLabel(b.slot_start as string),
            location: where,
          });
          const ok = await sendViaResend(String(b.contact), "📅 Ton rendez-vous, c'est demain", html);
          if (ok) {
            await sb.from("rdv_bookings").update({ reminder_email_sent_at: new Date().toISOString() }).eq("id", b.id);
            prospectEmails += 1;
          } else skipped += 1;
        }
      }
    }

    return jsonResponse({ ok: true, found: rows.length, hourParis, tomorrowParis, sent, emails, prospectEmails, skipped });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : "unknown" }, 500);
  }
});
