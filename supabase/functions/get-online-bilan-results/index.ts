// =============================================================================
// get-online-bilan-results — données de la page premium « Résultat Bilan ».
//
// Page publique envoyée par le coach (lien /resultat-bilan/<result_token>).
// Le prospect n'est pas authentifié → on résout le token CÔTÉ SERVEUR en
// service_role (bypass RLS, même pattern que client-app-data), et on ne
// renvoie QUE des données non sensibles destinées à l'affichage.
//
// Entrée  : { token: string }   (online_bilans.result_token)
// Sortie  : { bilan, coach, programmes, produits }
//
// Déploiement : supabase functions deploy get-online-bilan-results --no-verify-jwt
//   (le prospect n'a pas de JWT Supabase — auth par token UUID dans la fn).
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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const body = (await req.json().catch(() => ({}))) as { token?: string };
    const token = String(body.token ?? "").trim();
    if (!token) return json({ error: "token requis" }, 400);

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1. Bilan par token public.
    const { data: bilan, error: bErr } = await sb
      .from("online_bilans")
      .select(
        "id, first_name, age, city, objectives, weight_loss_target_kg, current_weight_kg, motivation_score, ai_analysis, coach_user_id, coach_slug, created_at",
      )
      .eq("result_token", token)
      .maybeSingle();

    if (bErr) return json({ error: "lookup_failed", message: bErr.message }, 500);
    // 200 (pas 404) pour que supabase-js expose le corps dans `data` côté front
    // et que la page distingue « lien invalide » d'une vraie erreur réseau.
    if (!bilan) return json({ error: "not_found" }, 200);

    // 2. Coach (prénom affiché + slug pour le lien bilan).
    let coachName = "ton coach";
    let coachSlug = (bilan.coach_slug as string | null) ?? null;
    if (bilan.coach_user_id) {
      const { data: coach } = await sb
        .from("users")
        .select("name")
        .eq("id", bilan.coach_user_id)
        .maybeSingle();
      if (coach?.name) coachName = String(coach.name).split(/\s+/)[0];
    }

    // 3. Programmes + produits depuis la DB (prix réels, dynamiques).
    const [{ data: programs }, { data: links }, { data: products }] = await Promise.all([
      sb
        .from("pv_programs")
        .select("id, name, price_public, active")
        .eq("active", true)
        .order("price_public", { ascending: true }),
      sb.from("pv_program_products").select("program_id, product_id, display_order"),
      sb
        .from("pv_products")
        .select("id, name, category, price_public, quantite_label, active")
        .eq("active", true),
    ]);

    const productById = new Map((products ?? []).map((p) => [p.id as string, p]));
    const linksByProgram = new Map<string, { product_id: string; display_order: number }[]>();
    for (const l of links ?? []) {
      const arr = linksByProgram.get(l.program_id as string) ?? [];
      arr.push({ product_id: l.product_id as string, display_order: (l.display_order as number) ?? 0 });
      linksByProgram.set(l.program_id as string, arr);
    }

    // L'échelle commerciale = programmes payants hors « custom » (suivi 0 €).
    const programmes = (programs ?? [])
      .filter((p) => p.id !== "custom" && Number(p.price_public) > 0)
      .map((p) => {
        const items = (linksByProgram.get(p.id as string) ?? [])
          .sort((a, b) => a.display_order - b.display_order)
          .map((it) => {
            const prod = productById.get(it.product_id);
            return prod
              ? { id: prod.id, name: prod.name, category: prod.category }
              : { id: it.product_id, name: it.product_id, category: "" };
          });
        return {
          id: p.id,
          name: p.name,
          price: Number(p.price_public),
          products: items,
        };
      });

    // Produits à l'unité / combos (le coach cadre les combos côté commercial).
    const produits = (products ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: Number(p.price_public),
      quantiteLabel: p.quantite_label,
    }));

    return json({
      bilan: {
        firstName: bilan.first_name,
        age: bilan.age,
        city: bilan.city,
        objectives: bilan.objectives ?? [],
        weightLossTargetKg: bilan.weight_loss_target_kg,
        currentWeightKg: bilan.current_weight_kg,
        motivationScore: bilan.motivation_score,
        aiAnalysis: bilan.ai_analysis,
        createdAt: bilan.created_at,
      },
      coach: { name: coachName, slug: coachSlug, userId: bilan.coach_user_id },
      programmes,
      produits,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return json({ error: "server_error", message: msg }, 500);
  }
});
