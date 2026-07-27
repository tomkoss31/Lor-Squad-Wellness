// Chantier PWA client v2 (2026-07) — sauvegarde d'une session de mensurations
// depuis l'app cliente (token-only). Le client n'a pas de session auth → il ne
// peut pas écrire dans client_measurements par RLS ; cet endpoint le fait en
// service_role après avoir résolu le client_id depuis le token.
//
// POST { token, measures: { neck?, chest?, waist?, hips?, thigh_left?,
//        thigh_right?, arm_left?, arm_right?, calf_left?, calf_right? } }
//   → insert 1 row client_measurements (measured_by_type='client').
//
// Déployer : supabase functions deploy client-app-save-measurement --no-verify-jwt
//
// Robustesse : valeurs bornées 10–300 cm ; seules les clés fournies valides
// sont écrites ; refuse si aucune valeur exploitable.

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

const ALLOWED_KEYS = [
  "neck", "chest", "waist", "hips",
  "thigh_left", "thigh_right", "arm_left", "arm_right",
  "calf_left", "calf_right",
] as const;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const body = await req.json().catch(() => null);
    const token = body?.token as string | undefined;
    const measures = (body?.measures ?? {}) as Record<string, unknown>;
    if (!token) return json({ error: "missing_token" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return json({ error: "server_misconfigured" }, 500);

    const sb = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Auth : résoudre le client_id depuis le token.
    const { data: account, error: accErr } = await sb
      .from("client_app_accounts")
      .select("id, client_id")
      .eq("token", token)
      .maybeSingle();
    if (accErr) return json({ error: "db_read_failed" }, 500);
    if (!account) return json({ error: "invalid_token" }, 403);
    const clientId = account.client_id as string;

    // Ne garder que les clés autorisées avec une valeur numérique plausible.
    const payload: Record<string, unknown> = {
      client_id: clientId,
      measured_by_type: "client",
      measured_by_user_id: null,
    };
    let count = 0;
    for (const key of ALLOWED_KEYS) {
      const v = Number(measures[key]);
      if (Number.isFinite(v) && v >= 10 && v <= 300) {
        payload[key] = Math.round(v * 10) / 10;
        count++;
      }
    }
    if (count === 0) return json({ error: "no_valid_measure" }, 400);

    const { error: insErr } = await sb.from("client_measurements").insert(payload);
    if (insErr) return json({ error: "insert_failed", detail: insErr.message }, 500);

    return json({ ok: true, saved: count });
  } catch (err) {
    console.error("[save-measurement] unexpected:", err);
    return json({ error: "internal_error" }, 500);
  }
});
