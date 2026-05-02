// =============================================================================
// formation-relay-to-admin (Phase E, 2026-11-01)
//
// Cron horaire qui escalade les modules en attente sponsor depuis >48h vers
// la file admin_relay. Notifie l admin (action) et le sponsor (rappel doux).
//
// Logique :
//   1. SELECT formation_user_progress
//      WHERE status = 'pending_review_sponsor'
//        AND submitted_at < now() - interval '48 hours'
//   2. Pour chaque row :
//      a. UPDATE status = 'pending_review_admin'
//      b. Push tous les admins actifs (notif_formation_admin=true)
//         entity_type='formation_admin_relay', dedup 22h sur (admin_id, progress_id)
//      c. Push sponsor (rappel doux) si notif_formation_to_review=true
//         entity_type='formation_validation_pending', dedup 22h
//   3. Logs stats
//
// Mode ?dry=true pour tester sans envoyer.
//
// Deploy : supabase functions deploy formation-relay-to-admin
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getServiceClient,
  sendPushToUser,
  corsHeaders,
  jsonResponse,
} from "../_shared/push.ts";

interface DispatchResult {
  total_candidates: number;
  escalated: number;
  admin_pushed: number;
  sponsor_pushed: number;
  skipped_no_sub: number;
  errors: number;
  dry: boolean;
}

interface ProgressRow {
  id: string;
  user_id: string;
  module_id: string;
  submitted_at: string;
  quiz_score: number | null;
}

interface UserRow {
  id: string;
  name: string;
  parent_user_id: string | null;
  notif_formation_admin: boolean | null;
  notif_formation_to_review: boolean | null;
}

async function dispatch(dry: boolean): Promise<DispatchResult> {
  const sb = getServiceClient();
  const result: DispatchResult = {
    total_candidates: 0,
    escalated: 0,
    admin_pushed: 0,
    sponsor_pushed: 0,
    skipped_no_sub: 0,
    errors: 0,
    dry,
  };

  // 1. Recupere les candidats > 48h sans review sponsor
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: candidates, error: fetchErr } = await sb
    .from("formation_user_progress")
    .select("id, user_id, module_id, submitted_at, quiz_score")
    .eq("status", "pending_review_sponsor")
    .lt("submitted_at", cutoff);
  if (fetchErr) {
    console.error("[formation-relay-to-admin] candidates fetch failed:", fetchErr);
    return result;
  }

  result.total_candidates = (candidates ?? []).length;
  if (result.total_candidates === 0) return result;

  // 2. Recupere les admins actifs
  const { data: admins, error: adminErr } = await sb
    .from("users")
    .select("id, name, notif_formation_admin")
    .eq("role", "admin")
    .eq("active", true);
  if (adminErr) {
    console.error("[formation-relay-to-admin] admins fetch failed:", adminErr);
    return result;
  }
  const adminList = (admins ?? []) as Array<{
    id: string;
    name: string;
    notif_formation_admin: boolean | null;
  }>;

  // 3. Pour chaque candidat
  for (const row of (candidates ?? []) as ProgressRow[]) {
    try {
      // Recupere user + sponsor
      const { data: userRow } = await sb
        .from("users")
        .select("id, name, parent_user_id, notif_formation_admin, notif_formation_to_review")
        .eq("id", row.user_id)
        .maybeSingle();
      const user = (userRow ?? null) as UserRow | null;
      if (!user) {
        result.errors += 1;
        continue;
      }
      const userName = user.name || "un distri";

      let sponsor: UserRow | null = null;
      if (user.parent_user_id) {
        const { data: spRow } = await sb
          .from("users")
          .select("id, name, parent_user_id, notif_formation_admin, notif_formation_to_review")
          .eq("id", user.parent_user_id)
          .maybeSingle();
        sponsor = (spRow ?? null) as UserRow | null;
      }

      if (dry) {
        console.log(`[dry] would escalate ${row.id} (${userName} / ${row.module_id})`);
        continue;
      }

      // 3a. UPDATE status -> pending_review_admin
      const { error: updateErr } = await sb
        .from("formation_user_progress")
        .update({ status: "pending_review_admin" })
        .eq("id", row.id)
        .eq("status", "pending_review_sponsor"); // garde-fou race condition
      if (updateErr) {
        console.error(`[relay] update ${row.id} failed:`, updateErr);
        result.errors += 1;
        continue;
      }
      result.escalated += 1;

      // 3b. Push admins (action)
      const adminPayload = {
        title: "🟣 Formation : module à arbitrer",
        body: `${userName} attend depuis 48h. Sponsor ${sponsor?.name ?? "?"} absent.`,
        url: "/formation/admin",
        type: "formation_admin_relay",
      };
      for (const admin of adminList) {
        if (admin.notif_formation_admin === false) continue;
        const sendResult = await sendPushToUser(sb, {
          userId: admin.id,
          payload: adminPayload,
          dedupe: {
            entityId: row.id,
            entityType: "formation_admin_relay",
            windowMinutes: 22 * 60,
          },
        });
        if (sendResult.sent) result.admin_pushed += 1;
        else if (sendResult.reason === "no_subscription") result.skipped_no_sub += 1;
      }

      // 3c. Push sponsor (rappel doux)
      if (sponsor && sponsor.notif_formation_to_review !== false) {
        const sponsorPayload = {
          title: "💡 Rappel Formation",
          body: `${userName} attendait depuis 48h — l'admin a pris le relais. Sois plus réactif la prochaine fois 🙏`,
          url: "/messages?tab=formation",
          type: "formation_validation_pending",
        };
        const sendResult = await sendPushToUser(sb, {
          userId: sponsor.id,
          payload: sponsorPayload,
          dedupe: {
            entityId: row.id,
            entityType: "formation_validation_pending",
            windowMinutes: 22 * 60,
          },
        });
        if (sendResult.sent) result.sponsor_pushed += 1;
      }
    } catch (err) {
      console.error(`[relay] row ${row.id} exception:`, err);
      result.errors += 1;
    }
  }

  return result;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const url = new URL(req.url);
    const dry = url.searchParams.get("dry") === "true";
    const result = await dispatch(dry);
    console.log("[formation-relay-to-admin] result:", JSON.stringify(result));
    return jsonResponse(result);
  } catch (err) {
    console.error("[formation-relay-to-admin] fatal:", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "unknown" },
      500,
    );
  }
});
