// =============================================================================
// client-anniversary-check — Edge function cron (chantier 2026-05-08)
// =============================================================================
//
// Tourne 1x/jour (07:00 UTC = 08-09h Paris) via pg_cron. Pour chaque client
// actif :
//   1. Si aujourd'hui = jour/mois de naissance → call record_client_xp
//      avec actionKey 'happy_birthday' (+100 XP, cap yearly)
//   2. Si aujourd'hui = 1er bilan + 30j → 'anniversary_1m' (+200 XP)
//   3. Si aujourd'hui = 1er bilan + 90j → 'anniversary_3m' (+500 XP)
//   4. Si aujourd'hui = 1er bilan + 180j → 'anniversary_6m' (+800 XP)
//
// Le cap SQL gere automatiquement le dedup (lifetime pour milestones,
// yearly pour bday). Donc safe meme si la function tourne plusieurs fois.
//
// Deploy : supabase functions deploy client-anniversary-check
// Schedule : 0 7 * * * (07:00 UTC) via pg_cron (table cron.job).
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface ClientRow {
  id: string;
  birth_date: string | null;
  caa_token: string | null;
  first_assessment_date: string | null;
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function log(level: "info" | "warn" | "error", event: string, data?: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      level,
      fn: "client-anniversary-check",
      event,
      ...data,
    }),
  );
}

/** YYYY-MM-DD pour aujourd'hui (timezone Paris). */
function todayParis(): string {
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** "MM-DD" pour comparaison jour/mois. */
function monthDay(isoDate: string): string {
  return isoDate.slice(5, 10); // "YYYY-MM-DD" → "MM-DD"
}

/** Parse YYYY-MM-DD en Date UTC. */
function parseDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Diff en jours entre deux dates YYYY-MM-DD. */
function daysBetween(a: string, b: string): number {
  const da = parseDate(a).getTime();
  const db = parseDate(b).getTime();
  return Math.round((db - da) / 86400000);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const t0 = Date.now();
  log("info", "start", { method: req.method });

  try {
    // Auth : on accepte les calls cron internes (pas de JWT verifie via
    // --no-verify-jwt). Si header Authorization absent en GET, on continue.
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      log("error", "env_missing");
      return jsonResponse({ error: "env_missing" }, 500);
    }

    const sb = createClient(supabaseUrl, serviceRoleKey);
    const today = todayParis();
    const todayMD = monthDay(today);

    // 1. Fetch tous les clients actifs avec leur token CAA + 1er bilan
    //    (assessment type='initial' min date)
    const { data: clients, error: cliErr } = await sb.rpc(
      "exec_anniversary_query",
      {},
    );

    let rows: ClientRow[] = [];
    if (cliErr || !clients) {
      // Fallback : query directe via select join (au cas ou RPC absente)
      log("info", "fallback_direct_query", { reason: cliErr?.message });
      const { data: directRows, error: dErr } = await sb
        .from("clients")
        .select(`
          id,
          birth_date,
          client_app_accounts!inner(token),
          assessments!inner(date, type)
        `)
        .eq("lifecycle", "active")
        .eq("assessments.type", "initial");
      if (dErr) {
        log("error", "fetch_clients_failed", { message: dErr.message });
        return jsonResponse({ error: dErr.message }, 500);
      }
      rows = (directRows ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        birth_date: r.birth_date as string | null,
        caa_token:
          ((r.client_app_accounts as Record<string, unknown>[] | undefined)?.[0]
            ?.token as string | null) ?? null,
        first_assessment_date:
          ((r.assessments as Record<string, unknown>[] | undefined)?.[0]?.date as
            | string
            | null) ?? null,
      }));
    } else {
      rows = (clients as ClientRow[]) ?? [];
    }

    let bdayCount = 0;
    let m1Count = 0;
    let m3Count = 0;
    let m6Count = 0;
    let xpCalls = 0;
    let xpFails = 0;

    // 2. Pour chaque client, check les 4 conditions
    for (const c of rows) {
      if (!c.caa_token) continue;

      // 2a. Birthday (jour/mois match)
      if (c.birth_date && monthDay(c.birth_date) === todayMD) {
        bdayCount++;
        const { error: e } = await sb.rpc("record_client_xp", {
          p_token: c.caa_token,
          p_action_key: "happy_birthday",
        });
        xpCalls++;
        if (e) {
          xpFails++;
          log("warn", "xp_birthday_failed", { client_id: c.id, message: e.message });
        }
      }

      // 2b/c/d. Milestones programme depuis 1er bilan
      if (c.first_assessment_date) {
        const ageDays = daysBetween(c.first_assessment_date, today);
        if (ageDays === 30) {
          m1Count++;
          const { error: e } = await sb.rpc("record_client_xp", {
            p_token: c.caa_token,
            p_action_key: "anniversary_1m",
          });
          xpCalls++;
          if (e) { xpFails++; log("warn", "xp_1m_failed", { client_id: c.id, message: e.message }); }
        } else if (ageDays === 90) {
          m3Count++;
          const { error: e } = await sb.rpc("record_client_xp", {
            p_token: c.caa_token,
            p_action_key: "anniversary_3m",
          });
          xpCalls++;
          if (e) { xpFails++; log("warn", "xp_3m_failed", { client_id: c.id, message: e.message }); }
        } else if (ageDays === 180) {
          m6Count++;
          const { error: e } = await sb.rpc("record_client_xp", {
            p_token: c.caa_token,
            p_action_key: "anniversary_6m",
          });
          xpCalls++;
          if (e) { xpFails++; log("warn", "xp_6m_failed", { client_id: c.id, message: e.message }); }
        }
      }
    }

    const summary = {
      durationMs: Date.now() - t0,
      today,
      clients_checked: rows.length,
      birthdays: bdayCount,
      milestones_1m: m1Count,
      milestones_3m: m3Count,
      milestones_6m: m6Count,
      xp_calls: xpCalls,
      xp_fails: xpFails,
    };
    log("info", "done", summary);

    return jsonResponse(summary);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("error", "uncaught", { message: msg, durationMs: Date.now() - t0 });
    return jsonResponse({ error: msg }, 500);
  }
});
