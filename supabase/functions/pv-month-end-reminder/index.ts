// =============================================================================
// pv-month-end-reminder — Chantier #6 polish arborescence (2026-05-22)
//
// Cron edge function : envoie un push aux admins/référents le 25 du mois
// (heure Paris) qui ont des distri externes sans PV saisis pour le mois
// en cours. Évite la perte d'override en fin de mois.
//
// Logique :
//   - Gate horaire : doit être 10h Paris (cron tire 2× pour DST).
//   - Gate jour : 25 ou + du mois.
//   - Liste admins/référents actifs qui ont au moins 1 distri externe en
//     downline directe (sponsor_id = admin.id, is_external=true).
//   - Pour chacun, compte les externes SANS pv_monthly_breakdown pour le
//     mois courant (YYYY-MM).
//   - Si missing > 0 → push "Plus que X jours pour saisir Y distri".
//   - Dedup via sendPushToUser : 1× / 28 jours / coach.
//
// Deploy : supabase functions deploy pv-month-end-reminder --no-verify-jwt
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getServiceClient,
  sendPushToUser,
  corsHeaders,
  jsonResponse,
} from "../_shared/push.ts";

interface DispatchResult {
  total_admins: number;
  pushed: number;
  skipped_no_externals: number;
  skipped_all_saisi: number;
  skipped_deduped: number;
  skipped_no_sub: number;
  errors: number;
  dry: boolean;
  day_paris: number;
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

function parisDay(): number {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    day: "2-digit",
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
  return fmt.format(new Date()).slice(0, 7); // YYYY-MM
}

function daysLeftInMonth(): number {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(new Date());
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return last - day;
}

async function dispatch(dry: boolean): Promise<DispatchResult> {
  const sb = getServiceClient();
  const result: DispatchResult = {
    total_admins: 0,
    pushed: 0,
    skipped_no_externals: 0,
    skipped_all_saisi: 0,
    skipped_deduped: 0,
    skipped_no_sub: 0,
    errors: 0,
    dry,
    day_paris: parisDay(),
    hour_paris: parisHour(),
  };

  const month = currentMonthIso();
  const daysLeft = daysLeftInMonth();

  // 1. Admins/référents actifs
  const { data: admins, error: adminErr } = await sb
    .from("users")
    .select("id, name")
    .eq("active", true)
    .in("role", ["admin", "referent"]);
  if (adminErr || !admins) {
    console.error("[pv-month-end-reminder] admins fetch failed:", adminErr);
    return result;
  }
  result.total_admins = admins.length;

  for (const admin of admins as Array<{ id: string; name: string }>) {
    // 2. Externes en downline directe
    const { data: externals } = await sb
      .from("users")
      .select("id, name")
      .eq("is_external", true)
      .eq("sponsor_id", admin.id);
    if (!externals || externals.length === 0) {
      result.skipped_no_externals += 1;
      continue;
    }
    const extIds = (externals as Array<{ id: string; name: string }>).map((e) => e.id);

    // 3. Breakdowns saisis pour ce mois
    const { data: breakdowns } = await sb
      .from("pv_monthly_breakdown")
      .select("user_id")
      .eq("month", month)
      .in("user_id", extIds);
    const savedIds = new Set(
      (breakdowns as Array<{ user_id: string }> | null)?.map((b) => b.user_id) ?? [],
    );
    const missing = (externals as Array<{ id: string; name: string }>).filter(
      (e) => !savedIds.has(e.id),
    );
    if (missing.length === 0) {
      result.skipped_all_saisi += 1;
      continue;
    }

    // 4. Push avec dédup via sendPushToUser (entityType coach_tip, 28 jours)
    const title = `📊 PV à saisir avant la fin du mois`;
    const body =
      missing.length === 1
        ? `${daysLeft} jour${daysLeft > 1 ? "s" : ""} restant${daysLeft > 1 ? "s" : ""} pour saisir les PV de ${missing[0].name}.`
        : `${daysLeft} jour${daysLeft > 1 ? "s" : ""} restant${daysLeft > 1 ? "s" : ""} pour saisir les PV de ${missing.length} distri externe${missing.length > 1 ? "s" : ""}.`;

    if (dry) {
      console.log(`[dry] would push ${admin.name}: ${body}`);
      result.pushed += 1;
      continue;
    }

    const sendResult = await sendPushToUser(sb, {
      userId: admin.id,
      payload: {
        title,
        body,
        url: "/parametres/arborescence-herbalife",
        icon: "/icon-192.png",
        badge: "/badge-72.png",
      },
      dedupe: {
        entityId: `pv-month-end-${month}`,
        entityType: "coach_tip",
        windowMinutes: 28 * 24 * 60, // 28 jours = 1× / mois max
      },
    });

    if (sendResult.sent) {
      result.pushed += 1;
    } else if (sendResult.reason === "no_subscription") {
      result.skipped_no_sub += 1;
    } else if (sendResult.reason === "deduped") {
      result.skipped_deduped += 1;
    } else {
      result.errors += 1;
      console.error(
        `[pv-month-end-reminder] push failed for ${admin.name}:`,
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
  const day = parisDay();

  if (!force) {
    if (hour !== 10) {
      return jsonResponse({ skipped: true, reason: `hour_paris=${hour} (expect 10)` });
    }
    if (day < 25) {
      return jsonResponse({ skipped: true, reason: `day_paris=${day} (need >=25)` });
    }
  }

  try {
    const result = await dispatch(dry);
    return jsonResponse(result);
  } catch (err) {
    console.error("[pv-month-end-reminder] fatal:", err);
    return jsonResponse({ error: String(err) }, 500);
  }
});
