// Chantier Notifications push (2026-04-21)
// Edge Function : digest matinal "X suivis à faire aujourd'hui"
//
// Déclenchée par pg_cron tous les jours à 07:00 UTC. Itère sur tous les
// users actifs (admin / referent / distributor) et pour chaque coach :
//   1. Récupère ses clients
//   2. Filtre éligibilité protocole (4 checks : date 0-10, lifecycle actif,
//      programme assigné, body scan valide)
//   3. Calcule les étapes J+N dues aujourd'hui (N ∈ {1, 3, 7, 10})
//   4. Exclut les étapes déjà loggées dans follow_up_protocol_log
//   5. Si count > 0 → envoie push digest
//
// Deploy: supabase functions deploy morning-suivis-digest

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getServiceClient,
  sendPushToUser,
  corsHeaders,
  jsonResponse,
} from "../_shared/push.ts";

// ─── Constantes protocole (dupliquées depuis followUpProtocolScheduler.ts) ──
const PROTOCOL_STEP_DAYS = [1, 3, 7, 10] as const;
const PROTOCOL_MAX_DAYS = 10;
const INACTIVE_LIFECYCLES = ["stopped", "lost", "paused"] as const;

// Step IDs en DB (follow_up_protocol_log.step_id check : j1, j3, j7, j10, j14)
function stepIdForDay(day: number): string {
  return `j${day}`;
}

function computeDaysSinceInitial(initialDate: Date, now: Date): number {
  const a = new Date(initialDate);
  a.setHours(0, 0, 0, 0);
  const b = new Date(now);
  b.setHours(0, 0, 0, 0);
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

interface AssessmentRow {
  id: string;
  client_id: string;
  date: string;
  type: string;
  program_id: string | null;
  body_scan: { weight?: number } | null;
  questionnaire: { selectedProductIds?: string[] } | null;
}

interface ClientRow {
  id: string;
  distributor_id: string;
  lifecycle_status: string | null;
}

/**
 * Retourne le bilan initial d'un client (type='initial' prioritaire, sinon
 * le plus ancien par date). Même logique que getInitialAssessmentDate côté TS.
 */
function getInitialAssessment(rows: AssessmentRow[]): AssessmentRow | null {
  const initial = rows.find((r) => r.type === "initial");
  if (initial) return initial;
  const sorted = [...rows].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  return sorted[0] ?? null;
}

function isClientEligible(
  client: ClientRow,
  initial: AssessmentRow | null,
  now: Date
): { eligible: boolean; daysSince: number } {
  if (!initial) return { eligible: false, daysSince: -1 };

  const initialDate = new Date(initial.date);
  if (Number.isNaN(initialDate.getTime())) return { eligible: false, daysSince: -1 };

  const daysSince = computeDaysSinceInitial(initialDate, now);
  if (daysSince < 0 || daysSince > PROTOCOL_MAX_DAYS) {
    return { eligible: false, daysSince };
  }

  if (
    client.lifecycle_status &&
    (INACTIVE_LIFECYCLES as readonly string[]).includes(client.lifecycle_status)
  ) {
    return { eligible: false, daysSince };
  }

  const hasProgram =
    typeof initial.program_id === "string" && initial.program_id.trim().length > 0;
  const productIds = initial.questionnaire?.selectedProductIds;
  const hasProducts = Array.isArray(productIds) && productIds.length > 0;
  if (!hasProgram && !hasProducts) {
    return { eligible: false, daysSince };
  }

  const weight = initial.body_scan?.weight;
  if (typeof weight !== "number" || Number.isNaN(weight) || weight <= 0) {
    return { eligible: false, daysSince };
  }

  return { eligible: true, daysSince };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const sb = getServiceClient();
  const now = new Date();

  try {
    // 1. Tous les users actifs avec un rôle coach-side.
    const { data: users, error: usersErr } = await sb
      .from("users")
      .select("id, name, role, active")
      .eq("active", true)
      .in("role", ["admin", "referent", "distributor"]);

    if (usersErr) return jsonResponse({ error: usersErr.message }, 500);
    if (!users || users.length === 0) {
      return jsonResponse({ ok: true, processed: 0, sent: 0, skipped: 0 });
    }

    // 2. Pull TOUS les clients + assessments + logs en un coup pour éviter
    //    N+1 queries. Le volume reste faible (<1000 clients au total pour
    //    l'équipe entière).
    const { data: clients, error: clientsErr } = await sb
      .from("clients")
      .select("id, distributor_id, lifecycle_status");
    if (clientsErr) return jsonResponse({ error: clientsErr.message }, 500);

    const { data: assessments, error: assessmentsErr } = await sb
      .from("assessments")
      .select("id, client_id, date, type, program_id, body_scan, questionnaire");
    if (assessmentsErr) return jsonResponse({ error: assessmentsErr.message }, 500);

    const { data: logs, error: logsErr } = await sb
      .from("follow_up_protocol_log")
      .select("client_id, step_id");
    if (logsErr) return jsonResponse({ error: logsErr.message }, 500);

    // Index par client_id
    const assessmentsByClient = new Map<string, AssessmentRow[]>();
    for (const a of (assessments ?? []) as AssessmentRow[]) {
      const list = assessmentsByClient.get(a.client_id) ?? [];
      list.push(a);
      assessmentsByClient.set(a.client_id, list);
    }
    const loggedSet = new Set(
      (logs ?? []).map((l: { client_id: string; step_id: string }) =>
        `${l.client_id}::${l.step_id}`
      )
    );

    let sent = 0;
    let skipped = 0;

    // 3. Pour chaque user, compter les suivis dus aujourd'hui.
    for (const user of users) {
      const myClients =
        (clients ?? []).filter((c) => c.distributor_id === user.id) as ClientRow[];
      let dueCount = 0;

      for (const c of myClients) {
        const clientAssessments = assessmentsByClient.get(c.id) ?? [];
        const initial = getInitialAssessment(clientAssessments);
        const { eligible, daysSince } = isClientEligible(c, initial, now);
        if (!eligible) continue;

        // Une étape est due aujourd'hui si daysSince === step.dayOffset et
        // qu'elle n'a pas encore été loggée.
        for (const day of PROTOCOL_STEP_DAYS) {
          if (daysSince !== day) continue;
          const stepId = stepIdForDay(day);
          if (loggedSet.has(`${c.id}::${stepId}`)) continue;
          dueCount += 1;
        }
      }

      if (dueCount === 0) {
        skipped += 1;
        continue;
      }

      // Digest date stamp : YYYY-MM-DD du jour local (approximé UTC ici, OK
      // pour un cron qui tourne une fois par 24h).
      const today = now.toISOString().slice(0, 10);
      const entityId = `morning-${today}`;

      const suivisLabel = dueCount === 1 ? "suivi" : "suivis";
      const result = await sendPushToUser(sb, {
        userId: user.id,
        payload: {
          title: `🌅 ${dueCount} ${suivisLabel} à faire aujourd'hui`,
          body: "Ouvre l'app pour les envoyer en 2 clics.",
          url: "/",
          type: "morning_digest",
        },
        dedupe: {
          entityId,
          entityType: "morning_digest",
          // 20h fenêtre : pas de double notif dans la même journée.
          windowMinutes: 20 * 60,
        },
      });

      if (result.sent) sent += 1;
      else skipped += 1;
    }

    return jsonResponse({
      ok: true,
      processed: users.length,
      sent,
      skipped,
      at: now.toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return jsonResponse({ error: message }, 500);
  }
});
