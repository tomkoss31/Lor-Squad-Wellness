// Chantier Notifications push (2026-04-21)
// Edge Function : notif "RDV dans 1h"
//
// Déclenchée par pg_cron toutes les 5 min. Scanne :
//   - follow_ups (status='scheduled', due_date dans [now+55min, now+65min])
//   - prospects  (status='scheduled', rdv_date dans [now+55min, now+65min])
//
// Envoie 1 push par RDV au coach propriétaire, avec dédup fenêtre 2h pour
// éviter les doublons entre ticks cron (le cron tourne toutes les 5min mais
// la notif doit partir une seule fois).
//
// Deploy: supabase functions deploy rdv-imminent-notifier

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getServiceClient,
  sendPushToUser,
  corsHeaders,
  jsonResponse,
} from "../_shared/push.ts";

function formatHour(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const sb = getServiceClient();
  const now = new Date();
  // Hotfix I/O budget (2026-04-30) : fenetre elargie [+30min, +90min] pour
  // accompagner le cron passe de 5 min -> 30 min (cf migration 20260430220000).
  // Coach recoit sa notif entre 30 min et 1h30 avant le RDV.
  const windowStart = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
  const windowEnd = new Date(now.getTime() + 90 * 60 * 1000).toISOString();

  try {
    // ─── 1. Follow-ups clients ────────────────────────────────────────────
    const { data: followUps, error: fuErr } = await sb
      .from("follow_ups")
      .select("id, client_id, client_name, due_date, type, status")
      .eq("status", "scheduled")
      .gte("due_date", windowStart)
      .lte("due_date", windowEnd);

    if (fuErr) return jsonResponse({ error: fuErr.message }, 500);

    // Pour récupérer le distributor_id, on lookup les clients concernés.
    const followUpClientIds = [
      ...new Set((followUps ?? []).map((f) => f.client_id)),
    ];
    let clientMap = new Map<string, { distributor_id: string; first_name: string; last_name: string }>();
    if (followUpClientIds.length > 0) {
      const { data: clients, error: cErr } = await sb
        .from("clients")
        .select("id, distributor_id, first_name, last_name")
        .in("id", followUpClientIds);
      if (cErr) return jsonResponse({ error: cErr.message }, 500);
      clientMap = new Map(
        (clients ?? []).map((c) => [
          c.id,
          {
            distributor_id: c.distributor_id,
            first_name: c.first_name,
            last_name: c.last_name,
          },
        ])
      );
    }

    // ─── 2. RDV prospects ─────────────────────────────────────────────────
    const { data: prospects, error: pErr } = await sb
      .from("prospects")
      .select("id, first_name, last_name, rdv_date, distributor_id, status")
      .eq("status", "scheduled")
      .gte("rdv_date", windowStart)
      .lte("rdv_date", windowEnd);

    if (pErr) return jsonResponse({ error: pErr.message }, 500);

    let sent = 0;
    let skipped = 0;

    // ─── 3. Envois follow-ups clients ────────────────────────────────────
    for (const fu of followUps ?? []) {
      const client = clientMap.get(fu.client_id);
      if (!client) {
        skipped += 1;
        continue;
      }

      const clientName =
        fu.client_name?.trim() ||
        `${client.first_name} ${client.last_name}`.trim();
      const hour = formatHour(fu.due_date);

      const result = await sendPushToUser(sb, {
        userId: client.distributor_id,
        payload: {
          title: `⏰ RDV dans 1h avec ${clientName}`,
          body: `${hour} · ${fu.type}`,
          url: "/agenda?filter=today",
          type: "rdv_imminent",
        },
        dedupe: {
          entityId: `followup-${fu.id}`,
          entityType: "followup",
          windowMinutes: 120,
        },
      });

      if (result.sent) sent += 1;
      else skipped += 1;
    }

    // ─── 4. Envois prospects ──────────────────────────────────────────────
    for (const p of prospects ?? []) {
      const prospectName = `${p.first_name} ${p.last_name}`.trim();
      const hour = formatHour(p.rdv_date);

      const result = await sendPushToUser(sb, {
        userId: p.distributor_id,
        payload: {
          title: `⏰ RDV dans 1h avec ${prospectName}`,
          body: `${hour} · Prospect`,
          url: "/agenda?filter=today",
          type: "rdv_imminent",
        },
        dedupe: {
          entityId: `prospect-${p.id}`,
          entityType: "prospect_meeting",
          windowMinutes: 120,
        },
      });

      if (result.sent) sent += 1;
      else skipped += 1;
    }

    return jsonResponse({
      ok: true,
      window: { start: windowStart, end: windowEnd },
      followUpsFound: followUps?.length ?? 0,
      prospectsFound: prospects?.length ?? 0,
      sent,
      skipped,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return jsonResponse({ error: message }, 500);
  }
});
