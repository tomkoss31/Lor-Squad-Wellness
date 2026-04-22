// Chantier Onboarding distributeur complet (2026-04-24)
// Edge Function : valide un token d'invitation distributeur.
//
// Input  : { token: string }
// Output : {
//   valid: boolean,
//   invited_first_name?: string,
//   invited_last_name?: string,
//   invited_email?: string,
//   sponsor_first_name?: string,
//   sponsor_name?: string,
//   reason?: 'expired' | 'consumed' | 'not_found' | 'missing_token'
// }
//
// Deploy: supabase functions deploy validate-distributor-invite-token

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
      .from("distributor_invitation_tokens")
      .select("id, email, first_name, last_name, sponsor_id, expires_at, consumed_at")
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

    // Lookup sponsor (name + first name).
    let sponsorName = "Ton parrain";
    let sponsorFirstName = "ton parrain";
    if (invitation.sponsor_id) {
      const { data: sponsor } = await sb
        .from("users")
        .select("name")
        .eq("id", invitation.sponsor_id)
        .maybeSingle();
      if (sponsor?.name) {
        sponsorName = sponsor.name.trim();
        sponsorFirstName = sponsorName.split(/\s+/)[0] || sponsorName;
      }
    }

    return json({
      valid: true,
      invited_first_name: invitation.first_name ?? "",
      invited_last_name: invitation.last_name ?? "",
      invited_email: invitation.email,
      sponsor_name: sponsorName,
      sponsor_first_name: sponsorFirstName,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return json({ valid: false, reason: "server_error", detail: message }, 500);
  }
});
