// =============================================================================
// passive-supervisor-data — chantier Aurélie 2026-05-22
//
// Edge function service_role qui consomme un token magic link et retourne
// les données agrégées pour un distri Supervisor passif (pas de session
// Supabase). Calcule :
//   - profile : nom, rang
//   - currentMonth : montant gagné ce mois (override chain via RPC)
//   - history12 : montant gagné par mois sur 12 derniers mois
//   - downlineCount : nombre de filleuls actifs (anonymisé : juste count)
//   - downlineNames : noms des filleuls directs (sans bilans)
//
// Pas d'accès clients/follow_ups/etc — strictement rentabilité only.
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return json({ ok: false, error: "Token manquant." }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);

  // 1. Lookup token
  const { data: acc, error: accErr } = await sb
    .from("passive_supervisor_accounts")
    .select("user_id, revoked_at")
    .eq("token", token)
    .maybeSingle();
  if (accErr || !acc) {
    return json({ ok: false, error: "Token invalide." }, 401);
  }
  if (acc.revoked_at) {
    return json({ ok: false, error: "Lien révoqué." }, 401);
  }
  const userId = acc.user_id;

  // 2. Update last_seen
  await sb
    .from("passive_supervisor_accounts")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("token", token);

  // 3. Profile
  const { data: profile } = await sb
    .from("users")
    .select("id, name, current_rank")
    .eq("id", userId)
    .single<{ id: string; name: string; current_rank: string | null }>();
  if (!profile) {
    return json({ ok: false, error: "User introuvable." }, 404);
  }

  // 4. Current month rentability (call existing RPC as user)
  // On simule l'appel en passant le userId
  const { data: rentabRows, error: rentabErr } = await sb.rpc("get_users_rentability", {
    p_user_ids: [userId],
    p_month: null,
  });
  const rentab = Array.isArray(rentabRows) && rentabRows.length > 0
    ? (rentabRows[0] as Record<string, unknown>)
    : null;

  // 5. History 12 months
  const { data: historyRows } = await sb.rpc("get_user_rentability_history", {
    p_user_ids: [userId],
    p_months: 12,
  });

  // 6. Downline directe (filleuls)
  const { data: downline } = await sb
    .from("users")
    .select("id, name, current_rank, is_external, active")
    .eq("sponsor_id", userId);

  // Return payload
  return json({
    ok: true,
    profile: {
      id: profile.id,
      name: profile.name,
      currentRank: profile.current_rank,
    },
    currentMonth: rentab
      ? {
          margin_eur: rentab.margin_eur ?? 0,
          revenue_brut: rentab.revenue_brut ?? 0,
          month_start: rentab.month_start ?? null,
          products_count: rentab.products_count ?? 0,
          prev_month_eur: rentab.prev_month_eur ?? 0,
          projection_eur: rentab.projection_eur ?? 0,
          days_elapsed: rentab.days_elapsed ?? 0,
          days_in_month: rentab.days_in_month ?? 30,
        }
      : null,
    history12: Array.isArray(historyRows)
      ? historyRows.map((r: Record<string, unknown>) => ({
          month: r.month_start,
          margin_eur: Number(r.margin_eur ?? 0),
        }))
      : [],
    downline: Array.isArray(downline)
      ? (downline as Array<{ id: string; name: string; current_rank: string | null; is_external: boolean; active: boolean }>).map((d) => ({
          name: d.name,
          rank: d.current_rank,
          external: d.is_external,
          active: d.active,
        }))
      : [],
    rentabError: rentabErr ? String(rentabErr.message) : null,
  });
});
