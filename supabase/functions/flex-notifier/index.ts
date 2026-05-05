// =============================================================================
// flex-notifier (FLEX Lor'Squad Phase E — 2026-11-05)
//
// Edge function multi-mode invoquée par pg_cron pour pousser les notifs FLEX :
//
//   ?mode=evening        → 20h Paris : "Tu n'as pas fait ton check-in"
//                          si user.notif_flex_evening = true ET pas de
//                          daily_action_checkin pour le jour Paris.
//
//   ?mode=evening_late   → 22h Paris : dernier rappel si toujours pas rempli.
//
//   ?mode=weekly_recap   → Dimanche 20h Paris : "Ton récap est prêt 📊"
//                          si notif_flex_weekly_recap = true.
//
// Auth : tous les flex_* utilisent service_role + dedup via
// push_notifications_sent.entity_type ('flex_evening_reminder',
// 'flex_evening_late', 'flex_weekly_recap', 'flex_drift_alert').
//
// Ne dispatch que aux users qui ont un distributor_action_plan actif
// (= ont fait l'onboarding FLEX). Les autres ne reçoivent rien.
//
// Deploy : supabase functions deploy flex-notifier --no-verify-jwt
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getServiceClient,
  sendPushToUser,
  corsHeaders,
  jsonResponse,
} from "../_shared/push.ts";

type FlexMode = "evening" | "evening_late" | "weekly_recap";

interface DispatchResult {
  mode: FlexMode;
  total_users_with_plan: number;
  pushed: number;
  skipped_already_filled: number;
  skipped_pref_off: number;
  skipped_deduped: number;
  skipped_no_sub: number;
  errors: number;
  dry: boolean;
}

/** Date du jour en heure Paris (YYYY-MM-DD). */
function ymdParisToday(): string {
  const fmt = new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

/** Heure courante (0-23) en heure de Paris. Tient compte DST automatique. */
function parisHourNow(): number {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    hour12: false,
  });
  return Number(fmt.format(new Date()));
}

/** Jour de la semaine (0 = dim, 6 = sam) en heure de Paris. */
function parisDayOfWeek(): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    weekday: "short",
  });
  const day = fmt.format(new Date());
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(day);
}

/**
 * V3.a (2026-11-05) : DST-aware gating. Le cron pg_cron tire 2 fois (1h
 * d'intervalle) pour couvrir été ET hiver, et la function ne dispatche
 * QUE si l'heure Paris correspond à la cible attendue.
 *
 * Bypass via ?force=true en query (debug / test admin).
 */
function shouldDispatchAtThisHour(mode: FlexMode, force: boolean): {
  ok: boolean;
  reason?: string;
} {
  if (force) return { ok: true };
  const hour = parisHourNow();
  const dow = parisDayOfWeek();

  // evening = 20h Paris quel que soit DST
  if (mode === "evening") {
    if (hour !== 20) return { ok: false, reason: `paris_hour_is_${hour}_expected_20` };
    return { ok: true };
  }
  // evening_late = 22h Paris
  if (mode === "evening_late") {
    if (hour !== 22) return { ok: false, reason: `paris_hour_is_${hour}_expected_22` };
    return { ok: true };
  }
  // weekly_recap = dimanche 20h Paris
  if (mode === "weekly_recap") {
    if (dow !== 0) return { ok: false, reason: `not_sunday` };
    if (hour !== 20) return { ok: false, reason: `paris_hour_is_${hour}_expected_20` };
    return { ok: true };
  }
  return { ok: false, reason: "unknown_mode" };
}

async function dispatch(mode: FlexMode, dry: boolean): Promise<DispatchResult> {
  const sb = getServiceClient();
  const result: DispatchResult = {
    mode,
    total_users_with_plan: 0,
    pushed: 0,
    skipped_already_filled: 0,
    skipped_pref_off: 0,
    skipped_deduped: 0,
    skipped_no_sub: 0,
    errors: 0,
    dry,
  };

  // 1. Liste des users avec un plan FLEX actif (non paused)
  const { data: plans, error: planErr } = await sb
    .from("distributor_action_plan")
    .select("user_id")
    .eq("is_paused", false);
  if (planErr || !plans) {
    console.error("[flex-notifier] plans fetch failed:", planErr);
    return result;
  }
  const userIds = plans.map((p: { user_id: string }) => p.user_id);
  result.total_users_with_plan = userIds.length;
  if (userIds.length === 0) return result;

  // 2. Récupère prefs notif des users
  const { data: users, error: userErr } = await sb
    .from("users")
    .select("id, name, active, notif_flex_evening, notif_flex_weekly_recap")
    .in("id", userIds)
    .eq("active", true);
  if (userErr || !users) {
    console.error("[flex-notifier] users fetch failed:", userErr);
    return result;
  }

  // 3. Pour evening + evening_late : on filtre les users qui ont déjà
  //    rempli leur check-in du jour (Paris).
  const today = ymdParisToday();
  let filledToday = new Set<string>();
  if (mode === "evening" || mode === "evening_late") {
    const { data: checkins } = await sb
      .from("daily_action_checkin")
      .select("user_id")
      .eq("date", today)
      .in("user_id", userIds);
    filledToday = new Set(
      (checkins ?? []).map((c: { user_id: string }) => c.user_id),
    );
  }

  // 4. Boucle envoi
  for (const u of users as Array<{
    id: string;
    name: string;
    notif_flex_evening: boolean;
    notif_flex_weekly_recap: boolean;
  }>) {
    try {
      // Pref check
      if (mode === "weekly_recap" && !u.notif_flex_weekly_recap) {
        result.skipped_pref_off += 1;
        continue;
      }
      if ((mode === "evening" || mode === "evening_late") && !u.notif_flex_evening) {
        result.skipped_pref_off += 1;
        continue;
      }

      // Skip si déjà rempli (modes evening only)
      if ((mode === "evening" || mode === "evening_late") && filledToday.has(u.id)) {
        result.skipped_already_filled += 1;
        continue;
      }

      const firstName = (u.name ?? "").trim().split(/\s+/)[0];
      const payload = buildPayload(mode, firstName);
      const entityType = entityTypeFor(mode);

      if (dry) {
        console.log(`[dry] ${u.id} → ${mode}: ${payload.title} | ${payload.body}`);
        continue;
      }

      const sendResult = await sendPushToUser(sb, {
        userId: u.id,
        payload,
        dedupe: {
          entityId: u.id,
          entityType,
          // evening = 4h window (entre 20h et minuit, dedup resserré)
          // weekly_recap = 22h window (1 par dimanche)
          windowMinutes:
            mode === "weekly_recap"
              ? 22 * 60
              : mode === "evening_late"
                ? 4 * 60
                : 4 * 60,
        },
      });

      if (sendResult.sent) result.pushed += 1;
      else if (sendResult.reason === "no_subscription") result.skipped_no_sub += 1;
      else if (sendResult.reason === "deduped") result.skipped_deduped += 1;
      else result.errors += 1;
    } catch (err) {
      console.error(`[flex-notifier] user ${u.id} failed:`, err);
      result.errors += 1;
    }
  }

  return result;
}

function buildPayload(mode: FlexMode, firstName: string) {
  const greeting = firstName ? `, ${firstName}` : "";
  if (mode === "evening") {
    return {
      title: `🎯 Ton check-in FLEX${greeting}`,
      body: "30 sec pour saisir tes 4 KPI du jour. Garde la chaîne !",
      url: "/flex",
      type: "flex" as const,
    };
  }
  if (mode === "evening_late") {
    return {
      title: `⏰ Dernière chance${greeting}`,
      body: "Pose tes chiffres avant minuit, tu casses pas le streak.",
      url: "/flex",
      type: "warning" as const,
    };
  }
  // weekly_recap
  return {
    title: `📊 Ton récap FLEX est prêt${greeting}`,
    body: "Vois où tu en es vs tes cibles cette semaine + plan lundi.",
    url: "/flex",
    type: "info" as const,
  };
}

function entityTypeFor(
  mode: FlexMode,
): "flex_evening_reminder" | "flex_evening_late" | "flex_weekly_recap" {
  if (mode === "evening") return "flex_evening_reminder";
  if (mode === "evening_late") return "flex_evening_late";
  return "flex_weekly_recap";
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const url = new URL(req.url);
    const modeRaw = url.searchParams.get("mode") ?? "evening";
    const dry = url.searchParams.get("dry") === "true";
    const force = url.searchParams.get("force") === "true";
    if (!["evening", "evening_late", "weekly_recap"].includes(modeRaw)) {
      return jsonResponse({ error: "invalid_mode" }, 400);
    }
    // V3.a — DST gate : on ne dispatche que si l'heure Paris matche la
    // target. Le cron tire 2 fois (1h d'écart) pour couvrir été+hiver.
    const gate = shouldDispatchAtThisHour(modeRaw as FlexMode, force);
    if (!gate.ok) {
      console.log(`[flex-notifier] gate skipped: ${gate.reason}`);
      return jsonResponse({ skipped: gate.reason, mode: modeRaw });
    }
    const result = await dispatch(modeRaw as FlexMode, dry);
    console.log("[flex-notifier] result:", JSON.stringify(result));
    return jsonResponse(result);
  } catch (err) {
    console.error("[flex-notifier] fatal:", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "unknown" },
      500,
    );
  }
});
