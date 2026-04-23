// Chantier RGPD partage public (2026-04-24).
// Edge Function : création d'un token /partage/:token par un coach authentifié.
// Vérifie le consentement explicite du client avant de créer le token.
//
// Input  : { client_id: string } + Bearer auth (coach)
// Output : { success: true, token, expires_at, view_count } ou { success: false, error, reason }
//
// Deploy: supabase functions deploy create-public-share-token

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

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
  if (req.method !== "POST") {
    return json({ success: false, error: "method_not_allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) {
    return json({ success: false, error: "unauthorized", reason: "missing_token" }, 401);
  }

  let body: { client_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "invalid_json" }, 400);
  }
  const clientId = (body.client_id ?? "").trim();
  if (!clientId) {
    return json({ success: false, error: "client_id_required" }, 400);
  }

  // Client authentifié (pour identifier le coach)
  const sbUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: userData, error: userErr } = await sbUser.auth.getUser();
  if (userErr || !userData?.user) {
    return json({ success: false, error: "unauthorized", reason: "invalid_jwt" }, 401);
  }
  const userId = userData.user.id;

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    // Vérifier propriété + consentement client
    const { data: client, error: clientErr } = await sb
      .from("clients")
      .select(
        "id, distributor_id, public_share_consent, public_share_revoked_at",
      )
      .eq("id", clientId)
      .maybeSingle();

    if (clientErr) throw clientErr;
    if (!client) {
      return json({ success: false, error: "client_not_found" }, 404);
    }

    // Propriétaire ou admin actif
    const c = client as {
      id: string;
      distributor_id: string | null;
      public_share_consent: boolean;
      public_share_revoked_at: string | null;
    };
    let authorized = c.distributor_id === userId;
    if (!authorized) {
      const { data: u } = await sb
        .from("users")
        .select("role, active")
        .eq("id", userId)
        .maybeSingle();
      if (u && (u as { role: string; active: boolean }).role === "admin" && (u as { active: boolean }).active) {
        authorized = true;
      }
    }
    if (!authorized) {
      return json({ success: false, error: "forbidden" }, 403);
    }

    if (!c.public_share_consent || c.public_share_revoked_at) {
      return json(
        { success: false, error: "consent_missing", reason: "client_did_not_consent" },
        403,
      );
    }

    // Créer le token (expires_at par défaut +30j)
    const { data: inserted, error: insertErr } = await sb
      .from("client_public_share_tokens")
      .insert({
        client_id: clientId,
        created_by_user_id: userId,
      })
      .select("token, expires_at, view_count")
      .single();

    if (insertErr) throw insertErr;

    const row = inserted as { token: string; expires_at: string; view_count: number };
    return json({
      success: true,
      token: row.token,
      expires_at: row.expires_at,
      view_count: row.view_count,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[create-public-share-token]", msg);
    return json({ success: false, error: msg }, 500);
  }
});
