// =============================================================================
// Chantier #11 — Edge fn get-testimonial-context (2026-05-18)
// =============================================================================
// GET ?token=<uuid> publique. Renvoie { firstName, city, coachFirstName,
// alreadySubmitted } pour pre-remplir TestimonialFormPage. Pas d'auth Supabase
// (token client suffit). Echec silencieux : 404 si token invalide.
//
// Deploy : supabase functions deploy get-testimonial-context --no-verify-jwt
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return json({ success: false, error: "method_not_allowed" }, 405);

  const url = new URL(req.url);
  const token = (url.searchParams.get("token") ?? "").trim();
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
    return json({ success: false, error: "Token invalide." }, 400);
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: account, error: accountErr } = await sb
    .from("client_app_accounts")
    .select("client_id")
    .eq("token", token)
    .maybeSingle();
  if (accountErr || !account?.client_id) {
    return json({ success: false, error: "Lien expire ou invalide." }, 404);
  }

  const { data: clientRow } = await sb
    .from("clients")
    .select("first_name, city, coach_user_id")
    .eq("id", account.client_id)
    .maybeSingle();

  let coachFirstName: string | null = null;
  const coachId = clientRow?.coach_user_id as string | undefined;
  if (coachId) {
    const { data: coach } = await sb
      .from("users")
      .select("first_name")
      .eq("id", coachId)
      .maybeSingle();
    coachFirstName = (coach?.first_name as string | undefined) ?? null;
  }

  const { data: existing } = await sb
    .from("client_testimonials")
    .select("status")
    .eq("client_id", account.client_id)
    .in("status", ["pending", "approved"])
    .maybeSingle();

  return json({
    success: true,
    firstName: (clientRow?.first_name as string | undefined) ?? null,
    city: (clientRow?.city as string | undefined) ?? null,
    coachFirstName,
    alreadySubmitted: !!existing,
  });
});
