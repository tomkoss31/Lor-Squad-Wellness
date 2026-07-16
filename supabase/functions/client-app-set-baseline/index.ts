// Chantier poids / point de départ — Couche 2 (2026-06-03)
//
// Endpoint POST pour enregistrer le "point de départ" du client depuis l'app
// PWA, à l'onboarding. 3 modes :
//   - { token, mode:"weight", weight }   → MAJ body_scan.weight du bilan initial
//   - { token, mode:"measurements" }     → stamp seulement (les mensurations
//                                           sont insérées côté client via
//                                           MeasurementsPanel, RLS client OK)
//   - { token, mode:"skip" }             → stamp + crée un RAPPEL PRIVÉ coach
//                                           (coach_reminders). Ne fabrique PAS
//                                           de faux message du client (refonte
//                                           2026-07-16, cf. bloc mode skip).
//
// Dans tous les cas : UPDATE client_app_accounts.baseline_at = NOW() pour ne
// plus re-demander. Auth = token client (uuid) sur client_app_accounts.
//
// Déployer : supabase functions deploy client-app-set-baseline --no-verify-jwt
//
// Robustesse : le rappel coach (mode skip) et l'absence de bilan initial sont
// best-effort — on ne fait jamais échouer le flux client là-dessus.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const body = await req.json().catch(() => null);
    const token = body?.token as string | undefined;
    const mode = (body?.mode as string | undefined) ?? "weight";
    if (!token) return json({ error: "missing_token" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return json({ error: "server_misconfigured" }, 500);

    const sb = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Auth : résoudre le compte + client_id depuis le token.
    const { data: account, error: accErr } = await sb
      .from("client_app_accounts")
      .select("id, client_id")
      .eq("token", token)
      .maybeSingle();
    if (accErr) return json({ error: "db_read_failed" }, 500);
    if (!account) return json({ error: "invalid_token" }, 403);
    const clientId = account.client_id as string;

    // ─── Mode weight : MAJ body_scan.weight du bilan initial ────────────────
    if (mode === "weight") {
      const weight = Number(body?.weight);
      if (!Number.isFinite(weight) || weight < 20 || weight > 400) {
        return json({ error: "invalid_weight" }, 400);
      }
      // Bilan initial = type 'initial' sinon le plus ancien.
      const { data: rows } = await sb
        .from("assessments")
        .select("id, type, date, body_scan")
        .eq("client_id", clientId)
        .order("date", { ascending: true });
      const list = (rows ?? []) as Array<{ id: string; type: string; body_scan: Record<string, unknown> | null }>;
      const initial = list.find((a) => a.type === "initial") ?? list[0];
      if (initial) {
        const nextScan = { ...(initial.body_scan ?? {}), weight };
        const { error: upAssessErr } = await sb
          .from("assessments")
          .update({ body_scan: nextScan })
          .eq("id", initial.id);
        if (upAssessErr) return json({ error: "assessment_update_failed" }, 500);
      }
      // Si pas de bilan initial (cas limite) : on stamp quand même baseline_at
      // ci-dessous — le poids sera ressaisi via un vrai bilan côté coach.
    }

    // ─── Mode skip : créer un RAPPEL COACH privé (best-effort) ──────────────
    //
    // Refonte 2026-07-16 (retour Thomas : "pas efficace et pas très
    // professionnel"). AVANT : on fabriquait un FAUX message du client dans la
    // messagerie ("👋 Je préfère faire mon point de départ avec toi...") — le
    // client n'a jamais écrit ça, il a juste tapoté un lien. Ça polluait la
    // messagerie et faisait dire au client des mots qui ne sont pas les siens.
    //
    // MAINTENANT : on écrit dans coach_reminders — la liste privée du coach
    // (in-app, aucune notif/mail au client). C'est une TÂCHE du coach, pas une
    // parole du client.
    if (mode === "skip") {
      try {
        const { data: client } = await sb
          .from("clients")
          .select("first_name, last_name, distributor_id")
          .eq("id", clientId)
          .maybeSingle();
        if (client?.distributor_id) {
          const fullName = `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim();
          // Anti-doublon : un client qui rouvre l'app et re-skippe ne doit pas
          // empiler les rappels.
          const { data: existing } = await sb
            .from("coach_reminders")
            .select("id")
            .eq("coach_id", client.distributor_id)
            .eq("client_id", clientId)
            .eq("status", "pending")
            .ilike("label", "Point de départ%")
            .maybeSingle();

          if (!existing) {
            await sb.from("coach_reminders").insert({
              coach_id: client.distributor_id,
              client_id: clientId,
              label: `Point de départ à faire avec ${client.first_name ?? fullName}`,
              note: "Le client a préféré faire sa pesée / ses mensurations avec toi plutôt que seul depuis l'appli. À caler au prochain échange.",
              remind_on: new Date().toISOString().slice(0, 10),
              status: "pending",
            });
          }
        }
      } catch (e) {
        console.warn("[set-baseline] coach reminder skipped:", e);
      }
    }

    // ─── Mode measurements : coche onboarding_checks.measurements ───────────
    // Rend le client éligible au protocole de suivi côté coach (couche 3),
    // même sans poids. Best-effort (préserve telegram / photo_before).
    if (mode === "measurements") {
      try {
        const { data: c } = await sb
          .from("clients")
          .select("onboarding_checks")
          .eq("id", clientId)
          .maybeSingle();
        const checks = {
          ...((c?.onboarding_checks as Record<string, unknown>) ?? {}),
          measurements: true,
        };
        await sb.from("clients").update({ onboarding_checks: checks }).eq("id", clientId);
      } catch (e) {
        console.warn("[set-baseline] measurements flag skipped:", e);
      }
    }

    // ─── Stamp baseline_at (tous modes) ─────────────────────────────────────
    const nowIso = new Date().toISOString();
    const { error: stampErr } = await sb
      .from("client_app_accounts")
      .update({ baseline_at: nowIso })
      .eq("id", account.id);
    if (stampErr) return json({ error: "stamp_failed" }, 500);

    return json({ ok: true, baseline_at: nowIso, mode });
  } catch (err) {
    console.error("[set-baseline] unexpected:", err);
    return json({ error: "internal_error" }, 500);
  }
});
