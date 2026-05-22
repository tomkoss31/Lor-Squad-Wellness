// =============================================================================
// rank-threshold-notifier — Extension chantier Aurélie #3 (2026-05-22)
//
// Cron edge function : envoie un push aux distri quand ils franchissent
// un palier PV dans le mois courant. Évite "ah merde j'étais à 950 PV
// j'aurais pu pousser pour 1000 et débloquer 42%".
//
// Logique :
//   - Gate horaire : 8h Paris (cron tire 2× pour DST → on garde 6h/7h UTC).
//   - Liste users actifs internes (pas is_external, pas is_passive_supervisor).
//   - Pour chacun : lit pv_monthly_breakdown mois courant → total PV.
//   - Vérifie chaque palier [500, 1000, 2500, 4000, 7500].
//   - Si total >= palier ET pas déjà notifié ce mois ce palier → push.
//   - Dedup via table rank_threshold_notifications (user_id, month, threshold).
//
// Paliers Herbalife :
//   500  = Senior Consultant (35%)
//   1000 = Success Builder (42%)
//   2500 = qualif intermédiaire (signal motivant)
//   4000 = Supervisor (50%) — palier roi
//   7500 = Millionaire 7500
//
// Deploy : supabase functions deploy rank-threshold-notifier --no-verify-jwt
// Cron   : voir migration 20261122400000_rank_threshold_notifier_cron.sql
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getServiceClient,
  sendPushToUser,
  corsHeaders,
  jsonResponse,
} from "../_shared/push.ts";

const THRESHOLDS: Array<{ pv: number; label: string; emoji: string }> = [
  { pv: 500, label: "Senior Consultant 35%", emoji: "🥉" },
  { pv: 1000, label: "Success Builder 42%", emoji: "🥈" },
  { pv: 2500, label: "palier 2500 PV", emoji: "🔥" },
  { pv: 4000, label: "Supervisor 50%", emoji: "🏆" },
  { pv: 7500, label: "Millionaire 7500", emoji: "💎" },
];

interface DispatchResult {
  total_users: number;
  pushed: number;
  skipped_no_breakdown: number;
  skipped_below_first: number;
  skipped_deduped: number;
  skipped_no_sub: number;
  errors: number;
  dry: boolean;
  hour_paris: number;
}

function parisHour(): number {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    hour12: false,
  });
  return Number(fmt.format(new Date()));
}

function currentMonthIso(): string {
  const fmt = new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date()).slice(0, 7);
}

async function dispatch(dry: boolean): Promise<DispatchResult> {
  const sb = getServiceClient();
  const result: DispatchResult = {
    total_users: 0,
    pushed: 0,
    skipped_no_breakdown: 0,
    skipped_below_first: 0,
    skipped_deduped: 0,
    skipped_no_sub: 0,
    errors: 0,
    dry,
    hour_paris: parisHour(),
  };

  const month = currentMonthIso();

  // 1. Distri internes actifs (pas externes, pas passifs)
  const { data: users, error: usersErr } = await sb
    .from("users")
    .select("id, name, is_external, is_passive_supervisor")
    .eq("active", true)
    .neq("is_external", true)
    .neq("is_passive_supervisor", true);

  if (usersErr || !users) {
    console.error("[rank-threshold-notifier] users fetch failed:", usersErr);
    return result;
  }
  result.total_users = users.length;

  // 2. Breakdowns du mois en 1 seul SELECT
  const userIds = (users as Array<{ id: string }>).map((u) => u.id);
  const { data: breakdowns } = await sb
    .from("pv_monthly_breakdown")
    .select("user_id, pv_15, pv_25, pv_35, pv_42, pv_royalty")
    .eq("month", month)
    .in("user_id", userIds);

  const totalByUser = new Map<string, number>();
  for (const b of (breakdowns ?? []) as Array<{
    user_id: string;
    pv_15: number;
    pv_25: number;
    pv_35: number;
    pv_42: number;
    pv_royalty: number;
  }>) {
    const t =
      Number(b.pv_15 ?? 0) +
      Number(b.pv_25 ?? 0) +
      Number(b.pv_35 ?? 0) +
      Number(b.pv_42 ?? 0) +
      Number(b.pv_royalty ?? 0);
    totalByUser.set(b.user_id, t);
  }

  // 3. Dedup : notifs déjà envoyées ce mois
  const { data: already } = await sb
    .from("rank_threshold_notifications")
    .select("user_id, threshold")
    .eq("month", month)
    .in("user_id", userIds);

  const alreadyKey = new Set(
    ((already ?? []) as Array<{ user_id: string; threshold: number }>).map(
      (a) => `${a.user_id}:${a.threshold}`,
    ),
  );

  // 4. Loop
  for (const u of users as Array<{ id: string; name: string }>) {
    const total = totalByUser.get(u.id);
    if (total === undefined) {
      result.skipped_no_breakdown += 1;
      continue;
    }
    if (total < THRESHOLDS[0].pv) {
      result.skipped_below_first += 1;
      continue;
    }

    // Plus haut palier franchi pour lequel pas encore notifié ce mois.
    // On notifie UN seul palier par run (le plus haut nouveau) pour éviter
    // une rafale "tu as franchi 500, 1000, 2500" si breakdown saisi tard.
    let crossed: typeof THRESHOLDS[number] | null = null;
    for (let i = THRESHOLDS.length - 1; i >= 0; i--) {
      if (total >= THRESHOLDS[i].pv && !alreadyKey.has(`${u.id}:${THRESHOLDS[i].pv}`)) {
        crossed = THRESHOLDS[i];
        break;
      }
    }
    if (!crossed) {
      result.skipped_deduped += 1;
      continue;
    }

    const title = `${crossed.emoji} Palier ${crossed.pv} PV franchi !`;
    const body = `Tu es à ${Math.round(total)} PV ce mois — tu débloques le palier ${crossed.label}. Bravo ${u.name.split(" ")[0]} !`;

    if (dry) {
      console.log(`[dry] ${u.name} → ${crossed.pv} PV (total=${total})`);
      result.pushed += 1;
      continue;
    }

    const sendResult = await sendPushToUser(sb, {
      userId: u.id,
      payload: {
        title,
        body,
        url: "/rentabilite",
        type: "rank_threshold",
      },
    });

    if (sendResult.sent) {
      // Log dédup même si dry=false. Si push fail no_sub on log quand
      // même pour pas re-pinger un user sans device chaque jour.
      await sb.from("rank_threshold_notifications").insert({
        user_id: u.id,
        month,
        threshold: crossed.pv,
        total_pv: total,
      });
      result.pushed += 1;
    } else if (sendResult.reason === "no_subscription") {
      // Log aussi pour dedup → un user sans push abonné ne sera pas re-tenté
      // tous les jours. Quand il s'abonnera, il sera notifié au palier
      // suivant uniquement (compromis acceptable).
      await sb.from("rank_threshold_notifications").insert({
        user_id: u.id,
        month,
        threshold: crossed.pv,
        total_pv: total,
      });
      result.skipped_no_sub += 1;
    } else {
      result.errors += 1;
      console.error(
        `[rank-threshold-notifier] push failed for ${u.name}:`,
        sendResult.error,
      );
    }
  }

  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const url = new URL(req.url);
  const dry = url.searchParams.get("dry") === "true";
  const force = url.searchParams.get("force") === "true";

  const hour = parisHour();
  if (!force && hour !== 8) {
    return jsonResponse({ skipped: true, reason: `hour_paris=${hour} (expect 8)` });
  }

  try {
    const result = await dispatch(dry);
    return jsonResponse(result);
  } catch (err) {
    console.error("[rank-threshold-notifier] fatal:", err);
    return jsonResponse({ error: String(err) }, 500);
  }
});
