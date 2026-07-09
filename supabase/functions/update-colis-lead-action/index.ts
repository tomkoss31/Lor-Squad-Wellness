// =============================================================================
// update-colis-lead-action — affine le choix final du funnel /colis
// (2026-07-08), SANS créer de doublon dans prospect_leads.
//
// handleCapture (ColisPage) insère déjà le lead une seule fois via
// submit-prospect-lead (next_action="email_only" par défaut). Si la personne
// clique ensuite « Réserver mon bilan » ou « Bilan en ligne complet » sur
// l'écran de confirmation, cette edge met à jour metadata.colis_next_action
// sur CE MÊME lead — pas de 2e insert. RLS ne permet pas d'UPDATE public sur
// prospect_leads (volontaire), d'où cette edge en service_role, minimale et
// strictement scopée (1 champ, 1 table, valeurs whitelist).
//
// Input  : { prospect_lead_id: string, next_action: "rdv" | "bilan" }
// Output : { success: true } ou { success: false, error }
//
// Deploy: supabase functions deploy update-colis-lead-action --no-verify-jwt
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  if (req.method !== "POST") return json({ success: false, error: "method_not_allowed" }, 405);

  let body: { prospect_lead_id?: string; next_action?: string };
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "invalid_json" }, 400);
  }
  const leadId = (body.prospect_lead_id ?? "").trim();
  const nextAction = body.next_action;
  if (!leadId) return json({ success: false, error: "missing_prospect_lead_id" }, 400);
  if (nextAction !== "rdv" && nextAction !== "bilan") {
    return json({ success: false, error: "invalid_next_action" }, 400);
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    // On ne touche QUE les leads source='colis' — scope strict, pas un
    // endpoint générique de modification de prospect_leads.
    const { data: lead, error: fetchErr } = await sb
      .from("prospect_leads")
      .select("id, source, metadata")
      .eq("id", leadId)
      .eq("source", "colis")
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!lead) return json({ success: true, skipped: "not_found_or_not_colis" });

    const meta = (lead.metadata ?? {}) as Record<string, unknown>;
    const { error: updateErr } = await sb
      .from("prospect_leads")
      .update({ metadata: { ...meta, colis_next_action: nextAction } })
      .eq("id", leadId);
    if (updateErr) throw updateErr;

    return json({ success: true });
  } catch (e) {
    return json({ success: false, error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
