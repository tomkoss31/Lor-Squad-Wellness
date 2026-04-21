// Chantier Lien d'invitation client app (2026-04-21)
// Edge Function : valide un token d'invitation, renvoie les infos nécessaires
// au front /bienvenue pour afficher le bon formulaire (cas A avec email en
// fiche, ou cas B sans email).
//
// Input  : { token: string }
// Output : {
//   valid: boolean,
//   client_first_name?: string,
//   coach_first_name?: string,
//   has_email_on_record?: boolean,
//   reason?: 'expired' | 'consumed' | 'not_found' | 'missing_token'
// }
//
// Deploy: supabase functions deploy validate-invitation-token

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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ valid: false, reason: "method_not_allowed" }, 405);
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = (await req.json().catch(() => ({}))) as { token?: string };
    const token = (body.token ?? "").trim();
    if (!token) {
      return json({ valid: false, reason: "missing_token" }, 400);
    }

    const { data: invitation, error: invErr } = await sb
      .from("client_invitation_tokens")
      .select("id, client_id, expires_at, consumed_at")
      .eq("token", token)
      .maybeSingle();

    if (invErr) {
      return json({ valid: false, reason: "not_found", detail: invErr.message }, 500);
    }
    if (!invitation) {
      return json({ valid: false, reason: "not_found" });
    }
    if (invitation.consumed_at) {
      return json({ valid: false, reason: "consumed" });
    }
    if (new Date(invitation.expires_at).getTime() < Date.now()) {
      return json({ valid: false, reason: "expired" });
    }

    // Lookup client (first_name + email) + coach (first_name).
    const { data: client, error: clientErr } = await sb
      .from("clients")
      .select("first_name, email, distributor_id, distributor_name")
      .eq("id", invitation.client_id)
      .maybeSingle();

    if (clientErr || !client) {
      return json({ valid: false, reason: "not_found" });
    }

    // Coach first name : on extrait juste le prénom pour l'accueil.
    const coachFirstName = (client.distributor_name ?? "")
      .trim()
      .split(/\s+/)[0] || "Ton coach";

    return json({
      valid: true,
      client_first_name: client.first_name,
      coach_first_name: coachFirstName,
      has_email_on_record: Boolean((client.email ?? "").trim()),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return json({ valid: false, reason: "server_error", detail: message }, 500);
  }
});
