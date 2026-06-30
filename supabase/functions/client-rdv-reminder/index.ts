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

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_DEFAULT = "La Base 360 <rdv@labase360.fr>";
const REPLY_TO_DEFAULT = "contact@labase360.fr";

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
function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
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

function rdvEmailHtml(p: {
  clientFirst: string;
  coachName: string;
  dateLabel: string;
  hour: string;
  location: string;
}): string {
  return `
<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#0B0D11;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#F0EDE8;">
  <div style="max-width:480px;margin:0 auto;padding:28px 22px;">
    <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#2DD4BF;font-weight:700;">La Base 360</div>
    <h1 style="font-size:24px;margin:14px 0 4px;color:#F0EDE8;">À demain, ${esc(p.clientFirst)} 🌿</h1>
    <p style="font-size:15px;line-height:1.55;color:#C3CCC0;margin:8px 0 22px;">
      Petit rappel : ton rendez-vous avec <b style="color:#F0EDE8;">${esc(p.coachName)}</b> c'est demain.
    </p>
    <div style="background:#13161C;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:18px 20px;">
      <div style="font-size:13px;color:#7A8099;text-transform:uppercase;letter-spacing:.08em;">Quand</div>
      <div style="font-size:18px;font-weight:700;color:#C9A84C;margin:2px 0 14px;">${esc(p.dateLabel)} · ${esc(p.hour)}</div>
      <div style="font-size:13px;color:#7A8099;text-transform:uppercase;letter-spacing:.08em;">Où</div>
      <div style="font-size:16px;font-weight:600;color:#F0EDE8;margin-top:2px;">${esc(p.location)}</div>
    </div>
    <p style="font-size:14px;line-height:1.55;color:#C3CCC0;margin:20px 0 0;">
      Pense à bien t'hydrater d'ici là 💧 Une question, un empêchement ? Réponds à cet email, on s'arrange.
    </p>
    <p style="font-size:12px;color:#4A5068;margin:26px 0 0;">La Base 360 · The wellness nutrition club</p>
  </div>
</body></html>`.trim();
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
      .select("id, distributor_id, name, email")
      .in("id", clientIds);
    const coachByClient = new Map<string, string | null>();
    const clientEmail = new Map<string, string | null>();
    const clientFirst = new Map<string, string>();
    const distributorIds = new Set<string>();
    for (const c of clients ?? []) {
      coachByClient.set(c.id as string, (c.distributor_id as string) ?? null);
      clientEmail.set(c.id as string, (c.email as string) ?? null);
      clientFirst.set(c.id as string, String((c.name as string) ?? "").split(/\s+/)[0] || "");
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
            clientFirst: clientFirst.get(clientId) || "",
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

    return jsonResponse({ ok: true, found: rows.length, hourParis, tomorrowParis, sent, emails, skipped });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : "unknown" }, 500);
  }
});
