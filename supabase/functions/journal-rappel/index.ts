// =============================================================================
// journal-rappel — le rappel de 20 h du journal nutritionnel (lot 3, 21/09/2026).
//
// Une notification à celles qui se servent de leur journal (une ligne à elles
// dans les 7 jours d'avant) et qui n'ont encore rien noté ce jour-là — le
// petit-déj pré-rempli par le club ne compte pas. Le tri est fait en base :
// `journal_rappel_cibles()` (abonnement push, jeton valide, pas déjà relancée).
// On ne relance pas celles qui ne s'en servent pas : c'est un rappel
// d'habitude, pas une publicité pour le journal.
//
// Cron `16 18,19 * * *` (UTC) : 20 h 16 à Paris été comme hiver — la fonction
// ne travaille que si l'heure de Paris est 20 h (l'autre passage repart à vide).
// Minute 16 : libre, et jamais la minute 0 (incident Nano du 29/07).
// Anti-doublon : `journal_rappels_envoyes`, écrit AVANT l'envoi — mieux vaut un
// rappel perdu qu'un rappel en double.
//
// Réservée au cron (clé service_role) : la clé anon est publique.
// `{ "dry_run": true }` compte les cibles sans rien envoyer, à toute heure.
//
// Mode « semaine » (bloc B, 7 — validé par Thomas le 21/09) : `{ "mode": "semaine" }`,
// cron `journal-semaine` `10 17,18 * * 0` (UTC) = dimanche 19 h 10 à Paris.
// « Camille, ta semaine en 3 chiffres » à celles qui ont noté au moins 3 jours
// dans la semaine ; tri `journal_semaine_cibles()`, anti-doublon
// `journal_semaines_envoyees` (écrit AVANT l'envoi). Le lien ouvre son bilan
// de la semaine (`?tab=journal&semaine=1`).
//
// Déploiement : supabase functions deploy journal-rappel
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getServiceClient, sendPushToClient, corsHeaders, jsonResponse } from "../_shared/push.ts";

function parisHour(d: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hour12: false }).format(d),
  );
}
function parisJourSemaine(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", weekday: "short" }).format(d);
}
function parisDateStr(d: Date): string {
  return new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Même contrôle que bbc-call-reminder : on lit le rôle inscrit dans le jeton. */
function isServiceRole(authHeader: string): boolean {
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;
  const envKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (envKey && token === envKey) return true;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload?.role === "service_role";
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!isServiceRole(req.headers.get("Authorization") ?? "")) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  let dryRun = false;
  let mode: "jour" | "semaine" = "jour";
  try {
    const body = await req.json();
    dryRun = body?.dry_run === true;
    if (body?.mode === "semaine") mode = "semaine";
  } catch {
    // corps vide : l'appel du cron
  }

  const now = new Date();
  if (mode === "semaine") return await semaine(now, dryRun);
  if (!dryRun && parisHour(now) !== 20) {
    return jsonResponse({ ok: true, skipped: "pas 20 h à Paris" });
  }

  const sb = getServiceClient({ reessais: true });
  const { data: cibles, error } = await sb.rpc("journal_rappel_cibles");
  if (error) return jsonResponse({ error: error.message }, 500);
  const liste = (cibles ?? []) as Array<{ client_id: string; jeton: string; prenom: string | null }>;
  if (dryRun) return jsonResponse({ ok: true, dry_run: true, cibles: liste.length });

  const jour = parisDateStr(now);
  let envoyes = 0;
  for (const c of liste) {
    // Le marqueur d'abord : si deux passages se croisent, un seul gagne.
    const { error: dejaFait } = await sb.from("journal_rappels_envoyes").insert({ client_id: c.client_id, jour });
    if (dejaFait) continue;
    const prenom = c.prenom?.trim().split(/\s+/)[0];
    const res = await sendPushToClient(sb, c.client_id, {
      title: prenom ? `${prenom}, ton journal t'attend` : "Ton journal t'attend",
      body: "Tu n'as encore rien noté aujourd'hui : 1 minute et c'est fait.",
      url: `/client/${c.jeton}?tab=journal`,
      type: "journal",
    });
    if (res.sent) envoyes++;
  }
  return jsonResponse({ ok: true, cibles: liste.length, envoyes });
});

/** Dimanche 19 h à Paris : « ta semaine en 3 chiffres ». */
async function semaine(now: Date, dryRun: boolean): Promise<Response> {
  if (!dryRun && !(parisHour(now) === 19 && parisJourSemaine(now) === "Sun")) {
    return jsonResponse({ ok: true, skipped: "pas dimanche 19 h à Paris" });
  }
  const sb = getServiceClient({ reessais: true });
  const { data: cibles, error } = await sb.rpc("journal_semaine_cibles");
  if (error) return jsonResponse({ error: error.message }, 500);
  const liste = (cibles ?? []) as Array<{
    client_id: string; jeton: string; prenom: string | null; lundi: string;
    jours_notes: number; moy_prot: number; jours_eau: number;
  }>;
  if (dryRun) return jsonResponse({ ok: true, dry_run: true, mode: "semaine", cibles: liste.length });

  let envoyes = 0;
  for (const c of liste) {
    // Le marqueur d'abord : si deux passages se croisent, un seul gagne.
    const { error: dejaFait } = await sb.from("journal_semaines_envoyees").insert({ client_id: c.client_id, lundi: c.lundi });
    if (dejaFait) continue;
    const prenom = c.prenom?.trim().split(/\s+/)[0];
    const eau = c.jours_eau > 0 ? ` · l'eau ${c.jours_eau} jour${c.jours_eau > 1 ? "s" : ""} sur 7` : "";
    const res = await sendPushToClient(sb, c.client_id, {
      title: prenom ? `${prenom}, ta semaine en 3 chiffres` : "Ta semaine en 3 chiffres",
      body: `${c.jours_notes} jours notés · ${c.moy_prot} g de protéines par jour${eau}. Touche pour voir ton bilan.`,
      url: `/client/${c.jeton}?tab=journal&semaine=1`,
      type: "journal_semaine",
    });
    if (res.sent) envoyes++;
  }
  return jsonResponse({ ok: true, mode: "semaine", cibles: liste.length, envoyes });
}
