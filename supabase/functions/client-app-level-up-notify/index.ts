// Une cliente passe un niveau (XP) → sa coach le sait (24/09/2026).
//
// Avant : le front appelait cette fonction au passage de niveau, qui écrivait
// une ligne dans `coach_reminders`… qu'aucun écran ne lit. Cinq montées ont
// attendu là depuis août sans être vues. Maintenant :
//   · une push à la coach (« Joel passe Champion 🥇 »), dédupée par cliente
//     et niveau — jamais deux fois pour la même montée ;
//   · plus rien dans coach_reminders : le bloc « niveaux » du Matin / Co-pilote
//     lit `xp_apercu_coach()`, et « Contacter » propose de féliciter.
//
// Deux appelants :
//   POST { token, level }                 — le front de la membre (jeton), comme avant ;
//   POST { client_id, level, total_xp }   — la base elle-même (_record_client_xp_interne,
//                                           jeton service_role) : un pointage ou un geste coach
//                                           peuvent faire passer un niveau sans que son écran soit ouvert.
// Déployer : supabase functions deploy client-app-level-up-notify --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, getServiceClient, jsonResponse, sendPushToUser } from "../_shared/push.ts";

const NIVEAUX: Record<number, { titre: string; badge: string }> = {
  2: { titre: "En route", badge: "🥉" },
  3: { titre: "Engagé·e", badge: "🥈" },
  4: { titre: "Champion·ne", badge: "🥇" },
  5: { titre: "Légende", badge: "💎" },
};

function isServiceRole(authHeader: string): boolean {
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;
  const envKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (envKey && token === envKey) return true;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload?.role === "service_role";
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  try {
    const body = (await req.json().catch(() => ({}))) as {
      token?: string; client_id?: string; level?: number; total_xp?: number; dry_run?: boolean;
    };
    const level = Number(body.level);
    if (!Number.isFinite(level) || level < 2 || level > 5) return jsonResponse({ error: "invalid_level" }, 400);

    const sb = getServiceClient();
    let clientId: string | null = null;

    if (body.client_id) {
      // Seule la base (service_role) peut désigner une cliente sans son jeton.
      if (!isServiceRole(req.headers.get("Authorization") ?? "")) return jsonResponse({ error: "unauthorized" }, 401);
      clientId = String(body.client_id);
    } else if (body.token) {
      const { data: account } = await sb
        .from("client_app_accounts")
        .select("client_id")
        .eq("token", body.token)
        .maybeSingle();
      if (!account) return jsonResponse({ error: "invalid_token" }, 403);
      clientId = String(account.client_id);
    } else {
      return jsonResponse({ error: "missing_token" }, 400);
    }

    const { data: client } = await sb
      .from("clients")
      .select("first_name, distributor_id, ebe_bbc")
      .eq("id", clientId)
      .maybeSingle();
    const coachId = client?.distributor_id as string | undefined;
    if (!coachId) return jsonResponse({ ok: true, skipped: "no_coach" });

    let total = Number(body.total_xp);
    if (!Number.isFinite(total)) {
      const { data: ev } = await sb.from("client_xp_events").select("xp_amount").eq("client_id", clientId);
      total = (ev ?? []).reduce((s, e) => s + Number(e.xp_amount ?? 0), 0);
    }

    const prenom = String(client?.first_name ?? "Ta cliente").trim() || "Ta cliente";
    const n = NIVEAUX[level];
    const notification = {
      title: `${prenom} passe ${n.titre} ${n.badge}`,
      body: `${total} XP · un mot de toi, c'est le moment.`,
      url: `/clients/${clientId}`,
      type: "client_level_up",
    };
    if (body.dry_run) return jsonResponse({ ok: true, dry_run: true, notification });

    const result = await sendPushToUser(sb, {
      userId: coachId,
      payload: notification,
      dedupe: { entityId: `${clientId}:${level}`, entityType: "client_level_up", windowMinutes: 60 * 24 * 60 },
    });
    return jsonResponse({ ok: true, sent: result.sent, reason: result.reason });
  } catch (err) {
    console.error("[level-up-notify] unexpected:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
});
