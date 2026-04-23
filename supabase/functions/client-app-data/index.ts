// Chantier Migration RLS app client → Edge Function (2026-04-26).
// Architecture OPTION C : l'app client n'interroge plus Supabase directement
// pour les données sensibles (clients, follow_ups, pv_client_products).
// Elle appelle cette function qui :
//   1. Valide le token client contre client_app_accounts.token (uuid)
//   2. Fait les 3 SELECT en service_role → bypass RLS propre
//   3. Renvoie un payload normalisé ISO 8601 pour next_follow_up
//
// Déployée avec --no-verify-jwt : l'auth Supabase classique n'est PAS utilisée,
// le token custom dans ?token=XXX fait foi. Rôle service_role limite la
// surface d'attaque : aucune mutation, juste des SELECT scopés au clientId
// extrait du token validé.
//
// Pattern repris de supabase/functions/resolve-public-share/index.ts.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function jsonError(code: string, status: number) {
  return new Response(JSON.stringify({ error: code }), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function toIsoOrNull(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === "string") {
    // Texte stocké tel quel (follow_ups.due_date ou client_app_accounts.next_follow_up).
    // On normalise en ISO pour que le front puisse toujours faire new Date(value).
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (v instanceof Date) return v.toISOString();
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return jsonError("missing_token", 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      console.error("[client-app-data] missing env SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return jsonError("server_misconfigured", 500);
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // ─── 1. Validation token + récupération client_id ─────────────────
    // Source canonique d'auth : client_app_accounts.token (uuid).
    // Les tables client_recaps / client_evolution_reports ont aussi un token
    // mais sont des snapshots legacy, pas des sources d'auth.
    const { data: account, error: accountError } = await supabase
      .from("client_app_accounts")
      .select("client_id, expires_at, program_title, next_follow_up")
      .eq("token", token)
      .maybeSingle();

    if (accountError) {
      console.error("[client-app-data] account lookup error", accountError);
      return jsonError("lookup_error", 500);
    }
    if (!account) {
      return jsonError("invalid_token", 401);
    }

    // Expiration (expires_at default = now() + 1 year à la création)
    if (account.expires_at && new Date(account.expires_at).getTime() < Date.now()) {
      return jsonError("token_expired", 401);
    }

    // client_app_accounts.client_id est TEXT, clients.id est UUID.
    // Postgres cast implicitement mais log pour monitoring pendant les tests.
    const clientId = account.client_id as string;
    console.log(`[client-app-data] token resolved → clientId=${clientId} (type=${typeof clientId})`);

    // ─── 2. Fetch des 3 sources en parallèle (service_role = RLS bypass) ─
    const [clientRes, followUpRes, productsRes] = await Promise.all([
      supabase
        .from("clients")
        .select("current_program, notes")
        .eq("id", clientId)
        .maybeSingle(),

      supabase
        .from("follow_ups")
        .select("id, due_date, status, type")
        .eq("client_id", clientId)
        .in("status", ["scheduled", "pending"])
        .gte("due_date", new Date().toISOString())
        .order("due_date", { ascending: true })
        .limit(1)
        .maybeSingle(),

      supabase
        .from("pv_client_products")
        .select(
          "id, product_id, product_name, quantite_label, price_public_per_unit, pv_per_unit, note_metier, start_date, active",
        )
        .eq("client_id", clientId)
        .eq("active", true)
        .order("start_date", { ascending: false }),
    ]);

    if (clientRes.error) {
      console.error("[client-app-data] client select error", clientRes.error);
    }
    if (followUpRes.error) {
      console.error("[client-app-data] follow_ups select error", followUpRes.error);
    }
    if (productsRes.error) {
      console.error("[client-app-data] products select error", productsRes.error);
    }

    // ─── 3. Normalisation + response ──────────────────────────────────
    const nextFollowUpIso = followUpRes.data?.due_date
      ? toIsoOrNull(followUpRes.data.due_date)
      : null;

    const payload = {
      client: clientRes.data
        ? {
            current_program: clientRes.data.current_program ?? null,
            notes: clientRes.data.notes ?? null,
          }
        : null,
      next_follow_up: followUpRes.data
        ? {
            id: (followUpRes.data as { id: string }).id,
            due_date: nextFollowUpIso,
            status: (followUpRes.data as { status: string }).status,
            type: (followUpRes.data as { type?: string | null }).type ?? null,
          }
        : null,
      current_products: productsRes.data ?? [],
      fetched_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        // 30s cache navigateur : absorbe les multi-renders sans masquer une
        // vraie modif coach (SELECT refresh au window focus dès 30s passés).
        "Cache-Control": "private, max-age=30",
      },
    });
  } catch (err) {
    console.error("[client-app-data] uncaught error", err);
    return jsonError("internal_error", 500);
  }
});
