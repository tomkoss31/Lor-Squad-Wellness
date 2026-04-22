// Chantier Invitation distributeur V2 (2026-04-24)
// Edge Function : génère un token d'invitation distributeur "lite/sponsor".
// Seul prénom + téléphone requis — l'invité saisira email + nom lui-même
// dans le wizard /bienvenue-distri.
//
// Input  : { first_name: string, phone: string }
// Auth   : Bearer token utilisateur (SUPABASE anon key côté client)
// Output : { token: string, expires_at: string } ou { error: string }
//
// Deploy: supabase functions deploy generate-distributor-invite-token

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

function randomToken(): string {
  // 32 chars hex base — lisible dans une URL, robuste
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "unauthorized" }, 401);
  }
  const accessToken = authHeader.slice("Bearer ".length);

  const adminSb = createClient(SUPABASE_URL, SERVICE_KEY);

  // Résoudre l'utilisateur appelant via le token
  const { data: userData, error: userErr } = await adminSb.auth.getUser(accessToken);
  if (userErr || !userData?.user) {
    return json({ error: "unauthorized" }, 401);
  }
  const sponsorId = userData.user.id;

  // Vérifier que c'est bien un user actif dans public.users
  const { data: sponsor, error: sponsorErr } = await adminSb
    .from("users")
    .select("id, active, role")
    .eq("id", sponsorId)
    .maybeSingle();
  if (sponsorErr || !sponsor || !sponsor.active) {
    return json({ error: "sponsor_inactive_or_not_found" }, 403);
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      first_name?: string;
      phone?: string;
    };
    const firstName = (body.first_name ?? "").trim();
    const phone = (body.phone ?? "").trim();

    if (!firstName || firstName.length < 2) {
      return json({ error: "invalid_first_name" }, 400);
    }
    if (!phone || phone.replace(/\D/g, "").length < 6) {
      return json({ error: "invalid_phone" }, 400);
    }

    const token = randomToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error: insertErr } = await adminSb
      .from("distributor_invitation_tokens")
      .insert({
        token,
        first_name: firstName,
        phone,
        sponsor_id: sponsorId,
        invited_by: sponsorId,
        expires_at: expiresAt,
        variant: "sponsor",
        // email / last_name sont NULL ici — l'invité les saisira dans le wizard
      });

    if (insertErr) {
      return json({ error: `insert_failed: ${insertErr.message}` }, 500);
    }

    return json({ token, expires_at: expiresAt });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return json({ error: msg }, 500);
  }
});
