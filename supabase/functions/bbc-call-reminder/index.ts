// =============================================================================
// bbc-call-reminder — la séquence de rappels des rituels BBC.
//
// Déclenché par pg_cron toutes les 10 min. Pour chaque membre inscrit à une
// occurrence (club_call_registrations) :
//   • midi  : le jour J entre 12h et 13h (Paris)      → PUSH membre
//   • m30   : ~30 min avant                            → PUSH membre
//   • m15   : ~15 min avant                            → PUSH membre
//   • after : ~30 min après le début                   → PUSH COACH
//             (la « patate chaude » : suivi dans les 10 min, module 05)
//
// Anti-doublon : club_call_reminders_sent (registration_id + kind).
// Le +30 ne part QUE si le suivi n'est pas déjà marqué fait.
//
// Deploy : supabase functions deploy bbc-call-reminder
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getServiceClient,
  sendPushToClient,
  sendPushToUser,
  corsHeaders,
  jsonResponse,
} from "../_shared/push.ts";

const LABELS: Record<string, string> = {
  appel_ambassadeur: "Appel Ambassadeur",
  atelier_coeurs: "Atelier Cœurs",
  coach_academy: "Coach Academy",
};

function parisHour(d: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hour12: false }).format(d),
  );
}
function parisDateStr(d: Date): string {
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
function hourLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const sb = getServiceClient();
    const now = new Date();
    const nowMs = now.getTime();

    // Fenêtre utile : de −2h (retards de suivi) à +14h (le « midi » du jour J).
    const from = new Date(nowMs - 2 * 60 * 60 * 1000).toISOString();
    const to = new Date(nowMs + 14 * 60 * 60 * 1000).toISOString();

    const { data: regs, error } = await sb
      .from("club_call_registrations")
      .select("id, client_id, coach_user_id, call_key, scheduled_at, attended, followed_up_at")
      .gte("scheduled_at", from)
      .lte("scheduled_at", to);

    if (error) return jsonResponse({ error: error.message }, 500);
    if (!regs?.length) return jsonResponse({ ok: true, checked: 0, sent: 0 });

    // Marqueurs déjà envoyés.
    const ids = regs.map((r) => r.id as string);
    const { data: markers } = await sb
      .from("club_call_reminders_sent")
      .select("registration_id, kind")
      .in("registration_id", ids);
    const sentSet = new Set((markers ?? []).map((m) => `${m.registration_id}:${m.kind}`));

    const mark = (rid: string, kind: string) =>
      sb.from("club_call_reminders_sent").upsert(
        { registration_id: rid, kind },
        { onConflict: "registration_id,kind", ignoreDuplicates: true },
      );

    let sent = 0;
    const todayParis = parisDateStr(now);
    const hourParis = parisHour(now);

    for (const r of regs) {
      const at = new Date(r.scheduled_at as string);
      const diffMin = (at.getTime() - nowMs) / 60000; // >0 = à venir
      const label = LABELS[r.call_key as string] ?? "Appel du club";
      const time = hourLabel(r.scheduled_at as string);
      const rid = r.id as string;
      const clientId = r.client_id as string;

      const has = (k: string) => sentSet.has(`${rid}:${k}`);

      // ── midi le jour J (12h-13h Paris) ────────────────────────────────────
      if (
        !has("midi") &&
        parisDateStr(at) === todayParis &&
        hourParis >= 12 && hourParis < 13 &&
        diffMin > 0
      ) {
        const res = await sendPushToClient(sb, clientId, {
          title: `${label} ce soir à ${time}`,
          body: "On compte sur toi 🙌 Tu peux juste écouter.",
          url: "/",
        });
        await mark(rid, "midi");
        if (res.sent) sent++;
      }

      // ── ~30 min avant ─────────────────────────────────────────────────────
      if (!has("m30") && diffMin <= 45 && diffMin >= 25) {
        const res = await sendPushToClient(sb, clientId, {
          title: `${label} dans 30 min`,
          body: `Ça commence à ${time}. Prépare-toi ☕`,
          url: "/",
        });
        await mark(rid, "m30");
        if (res.sent) sent++;
      }

      // ── ~15 min avant (avec le lien) ──────────────────────────────────────
      if (!has("m15") && diffMin <= 20 && diffMin >= 5) {
        const res = await sendPushToClient(sb, clientId, {
          title: `${label} dans 15 min`,
          body: "C'est le moment de te connecter 👉",
          url: "/",
        });
        await mark(rid, "m15");
        if (res.sent) sent++;
      }

      // ── +30 min après : patate chaude, au COACH ───────────────────────────
      if (
        !has("after") &&
        diffMin <= -25 && diffMin >= -75 &&
        !r.followed_up_at
      ) {
        const res = await sendPushToUser(sb, {
          userId: r.coach_user_id as string,
          payload: {
            title: "🥔 Patate chaude — suivi 10 min",
            body: `${label} vient de finir. Écris à tes inscrits maintenant, tant qu'ils sont dans l'énergie.`,
            url: "/co-pilote",
          },
        });
        await mark(rid, "after");
        if (res.sent) sent++;
      }
    }

    return jsonResponse({ ok: true, checked: regs.length, sent });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : "erreur" }, 500);
  }
});
