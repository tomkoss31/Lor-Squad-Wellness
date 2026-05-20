// =============================================================================
// daily-actions-notifier — Chantier #2 Check-list quotidienne (2026-05-20)
//
// Edge function invoquée par pg_cron à 20h Paris : envoie une push notif
// "Tu as encore X actions à finir" aux coachs qui n'ont pas tout coché.
//
// Logique :
//   - DST gate (heure Paris doit être 20h, sinon skip — cron tire 2x).
//   - Liste users actifs avec role distributor/referent/admin.
//   - Filtre par pref notif_daily_actions (default true).
//   - Récupère coach_daily_actions du jour Paris.
//   - Si done_count < 5 (ou pas de ligne → 0 done) : push.
//   - Skip si user a déjà reçu un push aujourd'hui (dedup entity_type).
//
// Deploy : supabase functions deploy daily-actions-notifier --no-verify-jwt
// Cron : voir migration 20261120110000_daily_actions_notifier_cron.sql
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getServiceClient,
  sendPushToUser,
  corsHeaders,
  jsonResponse,
} from "../_shared/push.ts";

interface DispatchResult {
  total_coaches: number;
  pushed: number;
  skipped_complete: number;
  skipped_pref_off: number;
  skipped_deduped: number;
  skipped_no_sub: number;
  errors: number;
  dry: boolean;
}

function ymdParisToday(): string {
  const fmt = new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

function parisHourNow(): number {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    hour12: false,
  });
  return Number(fmt.format(new Date()));
}

async function dispatch(dry: boolean): Promise<DispatchResult> {
  const sb = getServiceClient();
  const result: DispatchResult = {
    total_coaches: 0,
    pushed: 0,
    skipped_complete: 0,
    skipped_pref_off: 0,
    skipped_deduped: 0,
    skipped_no_sub: 0,
    errors: 0,
    dry,
  };

  // 1. Coachs actifs (distri / référent / admin)
  const { data: users, error: userErr } = await sb
    .from("users")
    .select("id, name, active, role, notif_daily_actions")
    .eq("active", true)
    .in("role", ["distributor", "referent", "admin"]);
  if (userErr || !users) {
    console.error("[daily-actions-notifier] users fetch failed:", userErr);
    return result;
  }
  result.total_coaches = users.length;
  if (users.length === 0) return result;

  // 2. Récupère coach_daily_actions du jour (Paris)
  const today = ymdParisToday();
  const userIds = users.map((u: { id: string }) => u.id);
  const { data: actions } = await sb
    .from("coach_daily_actions")
    .select("coach_id, status")
    .eq("action_date", today)
    .in("coach_id", userIds);

  // Map coach_id → done count
  const doneCount = new Map<string, number>();
  for (const a of actions ?? []) {
    if (a.status === "done") {
      doneCount.set(a.coach_id, (doneCount.get(a.coach_id) ?? 0) + 1);
    }
  }

  // 3. Loop envoi
  const TOTAL_ACTIONS = 5;
  for (const u of users as Array<{
    id: string;
    name: string;
    notif_daily_actions: boolean | null;
  }>) {
    try {
      // Pref check (default true si null)
      if (u.notif_daily_actions === false) {
        result.skipped_pref_off += 1;
        continue;
      }

      const done = doneCount.get(u.id) ?? 0;
      const remaining = TOTAL_ACTIONS - done;
      if (remaining <= 0) {
        result.skipped_complete += 1;
        continue;
      }

      const firstName = (u.name ?? "").trim().split(/\s+/)[0];
      const payload = buildPayload(firstName, remaining);

      if (dry) {
        console.log(`[dry] ${u.id} → daily_actions: ${payload.title} | ${payload.body}`);
        continue;
      }

      const sendResult = await sendPushToUser(sb, {
        userId: u.id,
        payload,
        dedupe: {
          entityId: u.id,
          entityType: "daily_actions_evening",
          windowMinutes: 4 * 60, // 1 push max entre 20h et minuit
        },
      });

      if (sendResult.sent) result.pushed += 1;
      else if (sendResult.reason === "no_subscription") result.skipped_no_sub += 1;
      else if (sendResult.reason === "deduped") result.skipped_deduped += 1;
      else result.errors += 1;
    } catch (err) {
      console.error(`[daily-actions-notifier] user ${u.id} failed:`, err);
      result.errors += 1;
    }
  }

  return result;
}

function buildPayload(firstName: string, remaining: number) {
  const greeting = firstName ? `, ${firstName}` : "";
  const s = remaining > 1 ? "s" : "";
  return {
    title: `🌙 ${remaining} action${s} à finir${greeting}`,
    body: "5 min sur ton Co-pilote avant minuit, et tu boucles ta journée.",
    url: "/co-pilote",
    type: "info" as const,
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const url = new URL(req.url);
    const dry = url.searchParams.get("dry") === "true";
    const force = url.searchParams.get("force") === "true";

    // DST gate : doit être 20h Paris (cron tire 2x à 1h d'écart)
    if (!force) {
      const hour = parisHourNow();
      if (hour !== 20) {
        console.log(`[daily-actions-notifier] gate skipped: paris_hour=${hour}`);
        return jsonResponse({ skipped: `paris_hour_is_${hour}_expected_20` });
      }
    }

    const result = await dispatch(dry);
    console.log("[daily-actions-notifier] result:", JSON.stringify(result));
    return jsonResponse(result);
  } catch (err) {
    console.error("[daily-actions-notifier] fatal:", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "unknown" },
      500,
    );
  }
});
