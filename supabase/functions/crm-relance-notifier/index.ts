// =============================================================================
// crm-relance-notifier — push du matin « ⏳ X leads attendent dans ton CRM »
// (wagon 2 chantier 4, 2026-06-10).
//
// Le tueur silencieux d'un CRM, c'est l'oubli : ce cron compte, par coach,
// les leads qui dorment et le rappelle une fois par jour.
//
// Compte par propriétaire :
//   - online_bilans  : lead_status='new' depuis >24h, OU relance J+3 due
//                      (owner = assigned_to_user_id ?? coach_user_id)
//   - prospect_leads : status='new' depuis >24h
//                      (owner = assigned_to_user_id ?? referrer_user_id)
//   - client_referrals : status='new' depuis >24h (owner = coach_id)
// Les leads sans propriétaire remontent aux admins actifs.
//
// Dédup : 1 push max / user / jour (push_notifications_sent, fenêtre 20h).
// Cron : 0 7 * * * UTC (8h/9h Paris) — cf. docs/cron_crm_relance.sql (Vault).
// Déploiement : supabase functions deploy crm-relance-notifier
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getServiceClient,
  sendPushToUser,
  corsHeaders,
  jsonResponse,
} from "../_shared/push.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const sb = getServiceClient();
    const now = new Date();
    const nowIso = now.toISOString();
    const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const [bilansNew, bilansRelance, prospects, referrals, adminsRes] = await Promise.all([
      sb
        .from("online_bilans")
        .select("coach_user_id, assigned_to_user_id")
        .eq("lead_status", "new")
        .lt("created_at", cutoff24h),
      sb
        .from("online_bilans")
        .select("coach_user_id, assigned_to_user_id")
        .lte("relance_due_at", nowIso)
        .is("relance_done_at", null),
      sb
        .from("prospect_leads")
        .select("referrer_user_id, assigned_to_user_id")
        .eq("status", "new")
        .lt("created_at", cutoff24h),
      sb
        .from("client_referrals")
        .select("coach_id")
        .eq("status", "new")
        .lt("created_at", cutoff24h),
      sb.from("users").select("id").eq("role", "admin").eq("active", true),
    ]);

    const adminIds = (adminsRes.data ?? []).map((a) => a.id as string);
    const counts = new Map<string, number>();
    const bump = (ownerId: string | null | undefined) => {
      if (ownerId) {
        counts.set(ownerId, (counts.get(ownerId) ?? 0) + 1);
      } else {
        // Lead orphelin → chaque admin le voit dans son compteur.
        for (const id of adminIds) counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    };

    for (const r of bilansNew.data ?? []) bump((r.assigned_to_user_id ?? r.coach_user_id) as string | null);
    for (const r of bilansRelance.data ?? []) bump((r.assigned_to_user_id ?? r.coach_user_id) as string | null);
    for (const r of prospects.data ?? []) bump((r.assigned_to_user_id ?? r.referrer_user_id) as string | null);
    for (const r of referrals.data ?? []) bump(r.coach_id as string | null);

    const today = nowIso.slice(0, 10);
    let sent = 0;
    let skipped = 0;

    for (const [userId, count] of counts) {
      if (count <= 0) continue;
      const result = await sendPushToUser(sb, {
        userId,
        payload: {
          title: `⏳ ${count} lead${count > 1 ? "s" : ""} attend${count > 1 ? "ent" : ""} dans ton CRM`,
          body: "Réponds sous 24h — c'est là que ça convertit. 2 min suffisent.",
          url: "/crm",
          type: "crm_relance",
        },
        dedupe: {
          entityId: `crm-relance-${today}`,
          entityType: "crm_relance",
          windowMinutes: 20 * 60,
        },
      });
      if (result.sent) sent += 1;
      else skipped += 1;
    }

    return jsonResponse({ ok: true, owners: counts.size, sent, skipped });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.warn("[crm-relance-notifier]", message);
    return jsonResponse({ error: message }, 500);
  }
});
