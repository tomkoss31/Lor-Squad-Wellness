// Chantier Welcome Page + Magic Links (2026-04-24).
// Edge Function : génère un magic link 24h / max 3 usages pour
// l'utilisateur actuellement connecté. Usage : filet de sécurité
// navigateur → PWA cross-device.
//
// Input  : (Bearer token utilisateur dans Authorization header)
// Output : { token: uuid, expires_at: iso }
//
// Deploy: supabase functions deploy generate-auto-login-token

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "unauthorized" }, 401);
  }
  const accessToken = authHeader.slice("Bearer ".length);

  const adminSb = createClient(SUPABASE_URL, SERVICE_KEY);

  // Résoudre l'utilisateur appelant
  const { data: userData, error: userErr } = await adminSb.auth.getUser(accessToken);
  if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);

  const userAuthId = userData.user.id;

  try {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: inserted, error: insertErr } = await adminSb
      .from("auto_login_tokens")
      .insert({
        user_auth_id: userAuthId,
        expires_at: expiresAt,
        max_usage: 3,
      })
      .select("token, expires_at")
      .single();

    if (insertErr) throw insertErr;

    return json({
      token: (inserted as { token: string }).token,
      expires_at: (inserted as { expires_at: string }).expires_at,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return json({ error: msg }, 500);
  }
});
