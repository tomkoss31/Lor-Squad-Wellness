// =============================================================================
// coach-tips-dispatcher (2026-04-30)
//
// Cron daily 8h UTC. Pour chaque user actif avec notif_coach_tips=true et
// >=1 push_subscription, evalue 6 signaux faibles dans l ordre de priorite
// et envoie 1 push avec le tip correspondant.
//
// Si aucun signal ne match → tip aleatoire de la liste (fallback "tip du
// jour" generique).
//
// Dedup : 1 push max par 22h via push_notifications_sent.entity_type =
// 'coach_tip', entity_id = userId. Evite double-tir si le cron tourne 2x.
//
// Deploy : supabase functions deploy coach-tips-dispatcher
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getServiceClient,
  sendPushToUser,
  corsHeaders,
  jsonResponse,
} from "../_shared/push.ts";

// ─── Bibliotheque de tips (subset cible pour les signaux + pool fallback) ──
// On copie les tips utilises pour les signaux, plus un pool large pour le
// fallback aleatoire. Pas d import du fichier front (esm impossible cross-dir).
const SIGNAL_TIPS = {
  pv_retard: {
    emoji: "🎯",
    text: "Fais le point sur tes PV le 25, pas le 30 à 23h59.",
  },
  client_anniv: {
    emoji: "🎂",
    text: "L'anniversaire client = la meilleure occasion de réactiver sans forcer.",
  },
  zero_rdv: {
    emoji: "🗓️",
    text: "Ce qui n'est pas dans ton agenda n'existe pas. Pas de RDV = pas de PV.",
  },
  client_pause: {
    emoji: "💡",
    text: "Un client en pause ≠ client perdu. Un message d'anniv = 70% de réactivation.",
  },
  lundi_tonus: {
    emoji: "🔋",
    text: "Coach épuisé = coach inutile. Bloque tes lundi matin pour TOI.",
  },
  fin_mois_top10: {
    emoji: "🔁",
    text: "Le 1er du mois, regarde tes 10 plus gros clients du mois dernier. Relance-les avant le 5.",
  },
} as const;

const FALLBACK_POOL = [
  { emoji: "📈", text: "10 clients à 80 PV/mois = 800 PV récurrents. La base d'un mois solide." },
  { emoji: "🔄", text: "Le réachat coûte 5x moins cher que la prospection. Ton dossier = ton or." },
  { emoji: "📞", text: "3 appels par jour = 60 par mois. Pas 30 d'un coup le dimanche soir." },
  { emoji: "📸", text: "Une photo 'avant' floue vaut mieux qu'aucune photo. Tes clients oublient leur point de départ." },
  { emoji: "⏰", text: "Le suivi J+3 fait 2x plus de différence que le J+30. C'est la 1ère semaine qui compte." },
  { emoji: "💬", text: "'Ça va ?' = mauvaise question. 'Comment s'est passé ton petit-déj ?' = vraie ouverture." },
  { emoji: "🌟", text: "1 client satisfait = 3 nouveaux contacts s'il en parle. Donne-lui des raisons d'être fier." },
  { emoji: "🚶", text: "5 contacts par jour pendant 30 jours = 150 prospects. Pas besoin de talent." },
  { emoji: "📷", text: "1 post avant/après par semaine = ton meilleur outil de prospection." },
  { emoji: "🎬", text: "30 secondes de vidéo > 5 minutes. Les gens scrollent vite, va à l'essentiel." },
  { emoji: "💰", text: "'C'est cher' = 'Je ne vois pas la valeur.' Reformule en 2,30€/jour, moins qu'un café." },
  { emoji: "🤔", text: "'Je vais réfléchir' = tu n'as pas répondu à sa vraie question. Demande laquelle." },
  { emoji: "🔥", text: "La constance bat le talent. Tous les jours > parfaitement parfois." },
  { emoji: "💧", text: "2L d'eau par jour = règle d'or. -200g/jour les 3 premiers jours = de l'eau, pas du muscle." },
  { emoji: "🏆", text: "Producer Active mensuel = 1000 PV. Découpé sur 30 jours = 33 PV/jour. Plus simple." },
] as const;

interface Tip { emoji: string; text: string }

function pickFallbackTip(seed: string): Tip {
  // Pseudo-random deterministe par user pour qu un meme user ne voit pas
  // toujours le meme tip fallback (varie par user-id + day).
  let hash = 0;
  const today = new Date().toISOString().slice(0, 10);
  const key = seed + today;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % FALLBACK_POOL.length;
  return FALLBACK_POOL[idx];
}

// ─── Detection signaux ──────────────────────────────────────────────────────

interface SignalContext {
  isMonday: boolean;
  dayOfMonth: number;
  daysInMonth: number;
}

function buildSignalContext(now: Date): SignalContext {
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return {
    isMonday: now.getDay() === 1,
    dayOfMonth: now.getDate(),
    daysInMonth: lastDay,
  };
}

interface UserSignal {
  trigger: keyof typeof SIGNAL_TIPS | "fallback";
  tip: Tip;
}

/**
 * Evalue les signaux pour 1 user dans l ordre de priorite. Premier match
 * gagne. Si aucun → fallback aleatoire deterministe.
 */
async function detectSignal(
  sb: ReturnType<typeof getServiceClient>,
  userId: string,
  ctx: SignalContext,
): Promise<UserSignal> {
  // ─── Signal 1 : Fin de mois + PV en retard (J25+ et ratio < 0.85) ────────
  if (ctx.dayOfMonth >= 25) {
    try {
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString().slice(0, 10);
      const { data: targetRow } = await sb
        .from("users").select("monthly_pv_target").eq("id", userId).maybeSingle();
      const target = (targetRow?.monthly_pv_target ?? 2500) as number;

      const { data: pvRows } = await sb
        .from("pv_transactions")
        .select("pv, quantity")
        .eq("responsible_id", userId)
        .gte("date", monthStart);
      const currentPv = (pvRows ?? []).reduce(
        (sum: number, r: { pv: number; quantity: number | null }) =>
          sum + (r.pv ?? 0) * (r.quantity ?? 1), 0);
      const prorata = (ctx.dayOfMonth / ctx.daysInMonth) * target;
      const ratio = prorata > 0 ? currentPv / prorata : 1;
      if (ratio < 0.85) {
        return { trigger: "pv_retard", tip: SIGNAL_TIPS.pv_retard };
      }
    } catch { /* fallthrough */ }
  }

  // ─── Signal 2 : Anniversaire client demain ───────────────────────────────
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const md = `${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
    const { data: rows } = await sb
      .from("clients")
      .select("id, birth_date")
      .eq("distributor_id", userId)
      .not("birth_date", "is", null)
      .limit(50);
    const hasBirthdayTomorrow = (rows ?? []).some((r: { birth_date: string | null }) => {
      if (!r.birth_date) return false;
      return r.birth_date.slice(5, 10) === md;
    });
    if (hasBirthdayTomorrow) {
      return { trigger: "client_anniv", tip: SIGNAL_TIPS.client_anniv };
    }
  } catch { /* fallthrough */ }

  // ─── Signal 3 : Lundi + 0 RDV cette semaine ──────────────────────────────
  if (ctx.isMonday) {
    try {
      const weekStart = new Date();
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const { data: rdvRows } = await sb
        .from("follow_ups")
        .select("id")
        .eq("distributor_id", userId)
        .gte("due_date", weekStart.toISOString())
        .lt("due_date", weekEnd.toISOString())
        .limit(1);
      if (!rdvRows || rdvRows.length === 0) {
        return { trigger: "zero_rdv", tip: SIGNAL_TIPS.zero_rdv };
      }
    } catch { /* fallthrough */ }
  }

  // ─── Signal 4 : Client en pause depuis >90j ──────────────────────────────
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const { data: pausedRows } = await sb
      .from("clients")
      .select("id, lifecycle_status")
      .eq("distributor_id", userId)
      .eq("lifecycle_status", "paused")
      .lte("updated_at", ninetyDaysAgo.toISOString())
      .limit(1);
    if (pausedRows && pausedRows.length > 0) {
      return { trigger: "client_pause", tip: SIGNAL_TIPS.client_pause };
    }
  } catch { /* fallthrough */ }

  // ─── Signal 5 : Lundi tonus (defaut lundi sans signal stronger) ──────────
  if (ctx.isMonday) {
    return { trigger: "lundi_tonus", tip: SIGNAL_TIPS.lundi_tonus };
  }

  // ─── Signal 6 : Debut de mois (J1-J3) → top 10 clients du mois passe ────
  if (ctx.dayOfMonth <= 3) {
    return { trigger: "fin_mois_top10", tip: SIGNAL_TIPS.fin_mois_top10 };
  }

  // ─── Fallback : tip aleatoire deterministe par user/day ─────────────────
  return { trigger: "fallback", tip: pickFallbackTip(userId) };
}

// ─── Handler principal ──────────────────────────────────────────────────────

interface DispatchResult {
  total_users: number;
  pushed: number;
  skipped_no_sub: number;
  skipped_deduped: number;
  skipped_pref_off: number;
  errors: number;
  by_trigger: Record<string, number>;
  dry: boolean;
}

async function dispatch(dry: boolean): Promise<DispatchResult> {
  const sb = getServiceClient();
  const now = new Date();
  const ctx = buildSignalContext(now);
  const result: DispatchResult = {
    total_users: 0, pushed: 0, skipped_no_sub: 0, skipped_deduped: 0,
    skipped_pref_off: 0, errors: 0, by_trigger: {}, dry,
  };

  // Liste des users actifs eligibles (notif_coach_tips=true)
  const { data: users, error } = await sb
    .from("users")
    .select("id, name, notif_coach_tips")
    .eq("active", true);
  if (error || !users) {
    console.error("[coach-tips-dispatcher] users fetch failed:", error);
    return result;
  }

  result.total_users = users.length;

  for (const u of users as Array<{ id: string; name: string; notif_coach_tips: boolean }>) {
    if (!u.notif_coach_tips) {
      result.skipped_pref_off += 1;
      continue;
    }
    try {
      const signal = await detectSignal(sb, u.id, ctx);
      const firstName = (u.name ?? "").trim().split(/\s+/)[0];
      const greeting = firstName ? `Tip du matin, ${firstName}` : "Tip du matin";
      const payload = {
        title: `${signal.tip.emoji} ${greeting}`,
        body: signal.tip.text,
        url: "/co-pilote",
        type: "info",
      };

      result.by_trigger[signal.trigger] = (result.by_trigger[signal.trigger] ?? 0) + 1;

      if (dry) {
        // Mode dry-run : log seulement, pas d envoi
        console.log(`[dry] ${u.id} → ${signal.trigger}: ${signal.tip.text}`);
        continue;
      }

      const sendResult = await sendPushToUser(sb, {
        userId: u.id,
        payload,
        dedupe: {
          entityId: u.id, // 1 push max par user / fenetre
          entityType: "coach_tip",
          windowMinutes: 22 * 60, // 22h pour eviter double-tir cron
        },
      });

      if (sendResult.sent) result.pushed += 1;
      else if (sendResult.reason === "no_subscription") result.skipped_no_sub += 1;
      else if (sendResult.reason === "deduped") result.skipped_deduped += 1;
      else result.errors += 1;
    } catch (err) {
      console.error(`[coach-tips-dispatcher] user ${u.id} failed:`, err);
      result.errors += 1;
    }
  }

  return result;
}

// ─── Serve ──────────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const url = new URL(req.url);
    const dry = url.searchParams.get("dry") === "true";
    const result = await dispatch(dry);
    console.log("[coach-tips-dispatcher] result:", JSON.stringify(result));
    return jsonResponse(result);
  } catch (err) {
    console.error("[coach-tips-dispatcher] fatal:", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "unknown" },
      500,
    );
  }
});
