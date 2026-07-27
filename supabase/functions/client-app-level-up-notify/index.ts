// Chantier PWA client v2 (2026-07) — notif coach au passage de niveau du client.
//
// Quand le client passe un niveau (gamification XP), on prévient son coach :
//   1. coach_reminders : une tâche privée « {Prénom} a passé un niveau »
//      (anti-doublon par niveau) → le coach peut préparer une petite attention.
//   2. push best-effort au coach.
// Aucun effet côté client (pas de faux message). Token-only, service_role.
//
// POST { token, level }
// Déployer : supabase functions deploy client-app-level-up-notify --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const body = await req.json().catch(() => null);
    const token = body?.token as string | undefined;
    const level = Number(body?.level);
    if (!token) return json({ error: "missing_token" }, 400);
    if (!Number.isFinite(level) || level < 2) return json({ error: "invalid_level" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return json({ error: "server_misconfigured" }, 500);

    const sb = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: account } = await sb
      .from("client_app_accounts")
      .select("client_id")
      .eq("token", token)
      .maybeSingle();
    if (!account) return json({ error: "invalid_token" }, 403);
    const clientId = account.client_id as string;

    const { data: client } = await sb
      .from("clients")
      .select("first_name, last_name, distributor_id")
      .eq("id", clientId)
      .maybeSingle();
    const coachId = client?.distributor_id as string | undefined;
    if (!coachId) return json({ ok: true, skipped: "no_coach" });
    const firstName = (client?.first_name as string) ?? "Ton client";

    // 1) Rappel coach privé — anti-doublon par (client, niveau).
    const label = `${firstName} a atteint le niveau ${level} 🎉`;
    const { data: existing } = await sb
      .from("coach_reminders")
      .select("id")
      .eq("coach_id", coachId)
      .eq("client_id", clientId)
      .eq("label", label)
      .maybeSingle();
    if (!existing) {
      await sb.from("coach_reminders").insert({
        coach_id: coachId,
        client_id: clientId,
        label,
        note: "Passage de niveau dans l'app. Une petite attention (message, surprise au bar) renforce la régularité.",
        remind_on: new Date().toISOString().slice(0, 10),
        status: "pending",
      });
    }

    // (Push coach best-effort : à ajouter dans une passe ultérieure via
    //  _shared/push.ts. Le rappel coach ci-dessus suffit à ne rien manquer.)

    return json({ ok: true });
  } catch (err) {
    console.error("[level-up-notify] unexpected:", err);
    return json({ error: "internal_error" }, 500);
  }
});
