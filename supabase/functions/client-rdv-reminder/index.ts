// =============================================================================
// client-rdv-reminder — rappel de RDV envoyé AU CLIENT (PWA).
//
// Déclenché par pg_cron toutes les 30 min. Deux rappels par RDV :
//   • « 2h avant »   : due_date dans [+105min, +150min]
//   • « veille 18h » : RDV du lendemain, uniquement quand il est ~18h à Paris
//
// Source : follow_ups (status='scheduled', client_id). Envoi via
// sendPushToClient (table client_push_subscriptions). Anti-doublon via
// client_rdv_reminders_sent (1 ligne par follow_up + kind).
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

function parisHour(d: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Paris",
      hour: "2-digit",
      hour12: false,
    }).format(d),
  );
}
function parisDateStr(d: Date): string {
  // fr-CA → format YYYY-MM-DD, stable pour comparer des jours.
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
function parisHourLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = getServiceClient();
  const now = new Date();
  const hourParis = parisHour(now);
  const tomorrowParis = parisDateStr(new Date(now.getTime() + 24 * 60 * 60 * 1000));
  const coarseEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

  try {
    // Fenêtre large : tous les RDV clients à venir dans les 48h.
    const { data: followUps, error: fuErr } = await sb
      .from("follow_ups")
      .select("id, client_id, due_date, type, status")
      .eq("status", "scheduled")
      .gte("due_date", now.toISOString())
      .lte("due_date", coarseEnd);
    if (fuErr) return jsonResponse({ error: fuErr.message }, 500);

    const rows = (followUps ?? []).filter((f) => f.client_id && f.due_date);
    if (rows.length === 0) {
      return jsonResponse({ ok: true, found: 0, sent: 0 });
    }

    // Clients → coach (prénom affiché dans la notif).
    const clientIds = [...new Set(rows.map((f) => f.client_id as string))];
    const { data: clients } = await sb
      .from("clients")
      .select("id, distributor_id")
      .in("id", clientIds);
    const coachByClient = new Map<string, string | null>();
    const distributorIds = new Set<string>();
    for (const c of clients ?? []) {
      coachByClient.set(c.id as string, (c.distributor_id as string) ?? null);
      if (c.distributor_id) distributorIds.add(c.distributor_id as string);
    }
    const coachNameById = new Map<string, string>();
    if (distributorIds.size > 0) {
      const { data: users } = await sb
        .from("users")
        .select("id, name")
        .in("id", [...distributorIds]);
      for (const u of users ?? []) {
        coachNameById.set(u.id as string, String((u.name as string) ?? "").split(/\s+/)[0]);
      }
    }
    const coachFirstFor = (clientId: string): string => {
      const dist = coachByClient.get(clientId);
      return (dist && coachNameById.get(dist)) || "ton coach";
    };

    // Marqueurs déjà envoyés pour ces RDV.
    const { data: markers } = await sb
      .from("client_rdv_reminders_sent")
      .select("follow_up_id, kind")
      .in("follow_up_id", rows.map((f) => f.id as string));
    const sentSet = new Set((markers ?? []).map((m) => `${m.follow_up_id}:${m.kind}`));

    let sent = 0;
    let skipped = 0;

    for (const fu of rows) {
      const fid = fu.id as string;
      const clientId = fu.client_id as string;
      const due = new Date(fu.due_date as string);
      const minsUntil = (due.getTime() - now.getTime()) / 60000;
      const coach = coachFirstFor(clientId);
      const hour = parisHourLabel(fu.due_date as string);

      // ─── Rappel « 2h avant » ───────────────────────────────────────────
      if (minsUntil >= 105 && minsUntil <= 150 && !sentSet.has(`${fid}:imminent2h`)) {
        const r = await sendPushToClient(sb, clientId, {
          title: "⏰ Ton RDV dans 2h",
          body: `Avec ${coach} à ${hour}. À tout à l'heure 🌿`,
          url: "/",
          type: "rdv_reminder",
        });
        if (r.sent) {
          await sb
            .from("client_rdv_reminders_sent")
            .upsert({ follow_up_id: fid, kind: "imminent2h" }, { onConflict: "follow_up_id,kind", ignoreDuplicates: true });
          sent += 1;
        } else skipped += 1;
      }

      // ─── Rappel « la veille à 18h » ─────────────────────────────────────
      if (
        hourParis === 18 &&
        parisDateStr(due) === tomorrowParis &&
        !sentSet.has(`${fid}:eve`)
      ) {
        const r = await sendPushToClient(sb, clientId, {
          title: `📅 RDV demain avec ${coach}`,
          body: `Demain à ${hour}. Pense à bien t'hydrater d'ici là 💧`,
          url: "/",
          type: "rdv_reminder",
        });
        if (r.sent) {
          await sb
            .from("client_rdv_reminders_sent")
            .upsert({ follow_up_id: fid, kind: "eve" }, { onConflict: "follow_up_id,kind", ignoreDuplicates: true });
          sent += 1;
        } else skipped += 1;
      }
    }

    return jsonResponse({
      ok: true,
      found: rows.length,
      hourParis,
      tomorrowParis,
      sent,
      skipped,
    });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : "unknown" }, 500);
  }
});
