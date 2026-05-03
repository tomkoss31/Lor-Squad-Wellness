// Chantier C — Onboarding client PWA (2026-11-04)
//
// Endpoint POST pour marquer le tour d'accueil comme complete.
// Auth : token client (uuid) verifie sur client_app_accounts.
//
// Mutation : UPDATE client_app_accounts SET onboarded_at = NOW() WHERE token = ?
//
// Idempotent : si deja onboarded, no-op (renvoie l existing timestamp).
//
// Deployee avec --no-verify-jwt (auth custom via token).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonError(code: string, status: number) {
  return new Response(JSON.stringify({ error: code }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonError("method_not_allowed", 405);
  }

  try {
    const body = await req.json().catch(() => null);
    const token = body?.token as string | undefined;
    if (!token) return jsonError("missing_token", 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return jsonError("server_misconfigured", 500);
    }

    const sb = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Verify token belongs to a real account
    const { data: account, error: accErr } = await sb
      .from("client_app_accounts")
      .select("id, onboarded_at")
      .eq("token", token)
      .maybeSingle();

    if (accErr) {
      console.warn("[mark-onboarded] read failed:", accErr.message);
      return jsonError("db_read_failed", 500);
    }
    if (!account) return jsonError("invalid_token", 403);

    // Idempotent : si deja onboarded, retourne le existing
    if (account.onboarded_at) {
      return new Response(
        JSON.stringify({ ok: true, onboarded_at: account.onboarded_at, idempotent: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const nowIso = new Date().toISOString();
    const { error: upErr } = await sb
      .from("client_app_accounts")
      .update({ onboarded_at: nowIso })
      .eq("id", account.id);

    if (upErr) {
      console.warn("[mark-onboarded] update failed:", upErr.message);
      return jsonError("db_update_failed", 500);
    }

    return new Response(
      JSON.stringify({ ok: true, onboarded_at: nowIso, idempotent: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[mark-onboarded] unexpected:", err);
    return jsonError("internal_error", 500);
  }
});
