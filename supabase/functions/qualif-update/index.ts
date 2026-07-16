// =============================================================================
// qualif-update — chantier Qualif, avance le parcours /qualif/:token après
// l'enregistrement (2026-07-16). Compagnon de qualif-bootstrap (mode
// "register" pour la création, celui-ci pour les étapes suivantes).
//
// { token, mode: "flavor" | "skip_flavor" | "app_opened" | "telegram" | "complete", productId? }
// → écrit dans client_qualif_onboarding (service_role — aucune policy RLS
// d'écriture, cohérent avec le reste du chantier).
//
// Déploiement : supabase functions deploy qualif-update --no-verify-jwt
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

const VALID_MODES = ["flavor", "skip_flavor", "app_opened", "telegram", "complete"] as const;
type Mode = (typeof VALID_MODES)[number];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  try {
    const body = (await req.json().catch(() => ({}))) as {
      token?: string;
      mode?: string;
      productId?: string;
    };
    const token = String(body.token ?? "").trim();
    const mode = body.mode as Mode | undefined;
    if (!token) return json({ ok: false, error: "missing_token" }, 400);
    if (!mode || !VALID_MODES.includes(mode)) return json({ ok: false, error: "invalid_mode" }, 400);

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: bilan, error: bErr } = await sb
      .from("online_bilans")
      .select("id, converted_to_client_id")
      .eq("result_token", token)
      .maybeSingle();
    if (bErr) return json({ ok: false, error: "server_error", message: bErr.message }, 500);
    if (!bilan) return json({ ok: false, error: "not_found" }, 200);
    const clientId = bilan.converted_to_client_id as string | null;
    if (!clientId) return json({ ok: false, error: "not_registered" }, 409);

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = {};
    if (mode === "flavor") {
      const productId = String(body.productId ?? "").trim();
      if (!productId) return json({ ok: false, error: "missing_product_id" }, 400);
      patch.flavor_product_id = productId;
    } else if (mode === "skip_flavor") {
      patch.flavor_skipped = true;
    } else if (mode === "app_opened") {
      patch.app_opened_at = now;
    } else if (mode === "telegram") {
      patch.telegram_at = now;
    } else if (mode === "complete") {
      patch.completed_at = now;
    }

    const { data: updated, error: updErr } = await sb
      .from("client_qualif_onboarding")
      .update(patch)
      .eq("client_id", clientId)
      .select("consent_at, flavor_product_id, flavor_skipped, app_opened_at, telegram_at, completed_at")
      .single();
    if (updErr) return json({ ok: false, error: "server_error", message: updErr.message }, 500);

    return json({
      ok: true,
      step: {
        consentAt: updated.consent_at as string | null,
        flavorProductId: updated.flavor_product_id as string | null,
        flavorSkipped: Boolean(updated.flavor_skipped),
        appOpenedAt: updated.app_opened_at as string | null,
        telegramAt: updated.telegram_at as string | null,
        completedAt: updated.completed_at as string | null,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return json({ ok: false, error: "server_error", message: msg }, 500);
  }
});
