// =============================================================================
// Chantier #11 Sprint 2 — Edge fn request-testimonial (cron J+60, 2026-05-18)
// =============================================================================
// Cron daily : envoie une push notif PWA aux clients ayant leur premier bilan
// valide 60 jours plus tot (+/- 1 jour de marge), n'ayant PAS encore de
// temoignage (pending OU approved). Push -> /temoignage/{token}.
//
// Best-effort : un echec push n'invalide pas les autres clients.
//
// Deploy : supabase functions deploy request-testimonial --no-verify-jwt
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

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  // Cible : clients ayant un assessment cree il y a 60 jours (+/- 1 jour de marge)
  // sans temoignage existant ET ayant un client_app_accounts.token actif.
  // On ne se base PAS sur clients.created_at mais sur le premier assessment
  // valide (= activite reelle commencee).

  const now = new Date();
  const startWindow = new Date(now.getTime() - 61 * 24 * 60 * 60 * 1000).toISOString();
  const endWindow = new Date(now.getTime() - 59 * 24 * 60 * 60 * 1000).toISOString();

  const { data: candidates, error } = await sb.rpc("get_testimonial_request_candidates", {
    p_start: startWindow,
    p_end: endWindow,
  });

  if (error) {
    // Fallback : si la RPC n'existe pas encore (migration en cours de deploy),
    // on tente une query directe (moins efficace mais ok pour des volumes faibles).
    const { data: directRows, error: directErr } = await sb
      .from("clients")
      .select("id, first_name, client_app_accounts!inner(token)")
      .gte("created_at", startWindow)
      .lte("created_at", endWindow);
    if (directErr) {
      return json({ success: false, error: directErr.message }, 500);
    }
    return await processCandidates(
      sb,
      (directRows as unknown as Array<{ id: string; first_name: string | null; client_app_accounts: Array<{ token: string }> }>).map((c) => ({
        client_id: c.id,
        first_name: c.first_name ?? null,
        token: c.client_app_accounts[0]?.token ?? null,
      })),
    );
  }

  return await processCandidates(sb, candidates ?? []);
});

interface Candidate {
  client_id: string;
  first_name: string | null;
  token: string | null;
}

async function processCandidates(sb: ReturnType<typeof createClient>, candidates: Candidate[]) {
  let pushed = 0;
  let skipped = 0;

  for (const c of candidates) {
    if (!c.token) {
      skipped++;
      continue;
    }
    // Anti-doublon temoignage : skip si deja pending/approved
    const { data: existing } = await sb
      .from("client_testimonials")
      .select("id")
      .eq("client_id", c.client_id)
      .in("status", ["pending", "approved"])
      .maybeSingle();
    if (existing) {
      skipped++;
      continue;
    }

    // Fetch subscriptions client (via client_app_accounts pas connecte avec user → V1 skip)
    // Pour V1, on ne push que les coachs admin actifs qui peuvent relayer au client.
    // Note : si futur push direct vers client app PWA, ajouter logique ici.

    // V1 : push admin "Relancer Marie pour temoignage" — admin clique → relaie WhatsApp
    const { data: admins } = await sb
      .from("users")
      .select("id")
      .eq("role", "admin")
      .eq("active", true);
    if (admins && admins.length > 0) {
      const subsPromises = admins.map((a) =>
        sb
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth")
          .eq("user_id", (a as { id: string }).id),
      );
      const subsResults = await Promise.all(subsPromises);
      const allSubs = subsResults.flatMap((r) => r.data ?? []);
      if (allSubs.length > 0) {
        const firstName = c.first_name?.trim() || "Un client";
        try {
          await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
            signal: AbortSignal.timeout(2500),
            method: "POST",
            headers: {
              Authorization: `Bearer ${SERVICE_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              subscriptions: allSubs,
              payload: {
                title: "Relance temoignage 🌱",
                body: `${firstName} : 2 mois — envoie-lui /temoignage/${c.token}`,
                url: "/admin/testimonials",
                icon: "/icon-192.png",
                badge: "/badge-72.png",
              },
            }),
          });
          pushed++;
        } catch {
          skipped++;
        }
      }
    }
  }

  return json({ success: true, pushed, skipped, total: candidates.length });
}
