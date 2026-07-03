// =============================================================================
// coach-reminder-notifier — push AU COACH quand un rappel « à relancer » arrive
// à échéance (2026-07-03).
//
// Déclenché par pg_cron toutes les 30 min. Lit coach_reminders (status=pending,
// remind_at <= now, notified_at null) et envoie un push AU COACH (jamais au
// client — ce sont des rappels privés). Anti-doublon : notified_at.
//
// Le rappel reste visible in-app sur le Co-pilote (widget « À relancer ») ; ce
// cron ne fait qu'AJOUTER le push le jour J.
//
// Deploy : supabase functions deploy coach-reminder-notifier
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getServiceClient,
  sendPushToUser,
  corsHeaders,
  jsonResponse,
} from "../_shared/push.ts";

interface DueReminder {
  id: string;
  coach_id: string;
  client_id: string | null;
  label: string | null;
  note: string | null;
  remind_at: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = getServiceClient();
  const nowIso = new Date().toISOString();

  const { data: due, error } = await sb
    .from("coach_reminders")
    .select("id, coach_id, client_id, label, note, remind_at")
    .eq("status", "pending")
    .is("notified_at", null)
    .lte("remind_at", nowIso)
    .limit(200);

  if (error) {
    return jsonResponse({ ok: false, error: error.message }, 500);
  }

  let sent = 0;
  for (const r of (due ?? []) as DueReminder[]) {
    // Nom : first_name du client si lié, sinon le label libre.
    let name = r.label?.trim() || "un contact";
    if (r.client_id) {
      const { data: c } = await sb
        .from("clients")
        .select("first_name, last_name")
        .eq("id", r.client_id)
        .maybeSingle();
      if (c) {
        const full = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim();
        if (full) name = full;
      }
    }

    const res = await sendPushToUser(sb, {
      userId: r.coach_id,
      payload: {
        title: "🔔 Relance à faire",
        body: r.note?.trim() ? `${name} — ${r.note.trim()}` : `Pense à relancer ${name}`,
        url: "/co-pilote",
        type: "coach_reminder",
      },
    });

    // Marque notifié dans tous les cas (évite le spam si pas d'abonnement push ;
    // le rappel reste in-app sur le Co-pilote).
    await sb
      .from("coach_reminders")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", r.id);

    if (res.sent) sent += 1;
  }

  return jsonResponse({ ok: true, due: due?.length ?? 0, sent });
});
