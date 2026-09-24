// Le geste d'une coach (+XP) arrive chez la membre (24/09/2026).
//
// « Thomas t'a donné 20 XP · défi tenu » + son mot, en notification, avec le
// lien vers son journal. Déclenché par le trigger `xp_don_notifier` sur
// client_xp_events (AFTER INSERT, coach_id non nul) — même motif que la
// remarque du journal : la base ne passe que l'identifiant, l'edge relit tout.
//
// POST { event_id, dry_run? } — service_role seulement.
// Déployer : supabase functions deploy xp-don-notifier --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, getServiceClient, jsonResponse, sendPushToClient } from "../_shared/push.ts";

const RAISONS: Record<string, string> = {
  coach_bravo: "bravo",
  coach_defi: "défi tenu",
  coach_club: "geste du club",
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
  if (!isServiceRole(req.headers.get("Authorization") ?? "")) return jsonResponse({ error: "unauthorized" }, 401);

  const body = (await req.json().catch(() => ({}))) as { event_id?: string; dry_run?: boolean };
  if (!body.event_id) return jsonResponse({ error: "event_id requis" }, 400);

  const sb = getServiceClient({ reessais: true });
  const { data: ev, error } = await sb
    .from("client_xp_events")
    .select("client_id, action_key, xp_amount, coach_id, mot")
    .eq("id", body.event_id)
    .maybeSingle();
  if (error) return jsonResponse({ error: error.message }, 500);
  if (!ev || !ev.coach_id) return jsonResponse({ error: "événement introuvable" }, 404);

  const [{ data: coach }, { data: comptes }, { data: tous }] = await Promise.all([
    sb.from("users").select("name").eq("id", ev.coach_id).maybeSingle(),
    sb.from("client_app_accounts").select("token").eq("client_id", String(ev.client_id)).limit(1),
    sb.from("client_xp_events").select("xp_amount").eq("client_id", String(ev.client_id)),
  ]);
  const token = comptes?.[0]?.token as string | undefined;
  if (!token) return jsonResponse({ ok: true, skipped: "pas d'espace" });

  const prenomCoach = String(coach?.name ?? "").trim().split(/\s+/)[0] || "Ta coach";
  const total = (tous ?? []).reduce((s, e) => s + Number(e.xp_amount ?? 0), 0);
  const raison = RAISONS[String(ev.action_key)] ?? "un geste";
  const mot = String(ev.mot ?? "").replace(/\s+/g, " ").trim();
  const notification = {
    title: `${prenomCoach} t'a donné ${ev.xp_amount} XP · ${raison}`,
    body: mot ? `« ${mot.length > 120 ? mot.slice(0, 119).trimEnd() + "…" : mot} » — tu es à ${total} XP.` : `Tu es à ${total} XP.`,
    url: `/client/${token}?tab=journal`,
    type: "xp_don",
  };
  if (body.dry_run) return jsonResponse({ ok: true, dry_run: true, notification: { ...notification, url: "/client/…?tab=journal" } });

  const result = await sendPushToClient(sb, String(ev.client_id), notification);
  return jsonResponse({ ok: true, sent: result.sent, reason: result.reason });
});
