// Chantier J (2026-04-26) : endpoint POST sécurisé pour permettre au client
// de confirmer "Ajouté à mon agenda" sur un RDV depuis l'app cliente.
//
// Auth : token client (uuid) résolu en cascade sur les 3 mêmes tables que
// `client-app-data` (client_app_accounts, client_recaps,
// client_evolution_reports). Le followUpId fourni doit appartenir au client
// résolu — sinon 403.
//
// Mutation : UPDATE follow_ups SET added_to_calendar_at = now() WHERE id = ?
//
// Déployée avec --no-verify-jwt (auth custom via token).

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
    const followUpId = body?.followUpId as string | undefined;

    if (!token || !followUpId) {
      return jsonError("missing_params", 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return jsonError("server_misconfigured", 500);
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Résolution token → client_id (cascade 3 tables, idem client-app-data)
    let clientId: string | null = null;
    {
      const { data } = await supabase
        .from("client_app_accounts")
        .select("client_id, expires_at")
        .eq("token", token)
        .maybeSingle();
      if (data) {
        if (data.expires_at && new Date(data.expires_at as string).getTime() < Date.now()) {
          return jsonError("token_expired", 401);
        }
        clientId = data.client_id as string;
      }
    }
    if (!clientId) {
      const { data } = await supabase
        .from("client_recaps")
        .select("client_id, expires_at")
        .eq("token", token)
        .maybeSingle();
      if (data) {
        if (data.expires_at && new Date(data.expires_at as string).getTime() < Date.now()) {
          return jsonError("token_expired", 401);
        }
        clientId = data.client_id as string;
      }
    }
    if (!clientId) {
      const { data } = await supabase
        .from("client_evolution_reports")
        .select("client_id, expires_at")
        .eq("token", token)
        .maybeSingle();
      if (data) {
        if (data.expires_at && new Date(data.expires_at as string).getTime() < Date.now()) {
          return jsonError("token_expired", 401);
        }
        clientId = data.client_id as string;
      }
    }

    if (!clientId) {
      return jsonError("invalid_token", 401);
    }

    // Vérification : le followUp appartient bien à ce client
    const { data: followUp, error: fuErr } = await supabase
      .from("follow_ups")
      .select("id, client_id")
      .eq("id", followUpId)
      .maybeSingle();

    if (fuErr || !followUp) {
      return jsonError("not_found", 404);
    }
    if (followUp.client_id !== clientId) {
      return jsonError("forbidden", 403);
    }

    const nowIso = new Date().toISOString();
    const { error: updErr } = await supabase
      .from("follow_ups")
      .update({ added_to_calendar_at: nowIso })
      .eq("id", followUpId);

    if (updErr) {
      return new Response(
        JSON.stringify({ error: "update_failed", message: updErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ ok: true, added_to_calendar_at: nowIso }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: "internal_error", message: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
