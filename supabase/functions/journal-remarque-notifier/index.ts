// =============================================================================
// journal-remarque-notifier — la remarque de la coach arrive en notification
// chez la membre (bloc A du journal, 21/09/2026 ; texte validé par Thomas :
// « Thomas t'a laissé un mot dans ton journal »).
//
// Déclenchée par le trigger `journal_remarque_notifier` (AFTER INSERT ON
// journal_remarques), qui ne passe que `{ remarque_id }` : on relit tout en
// base (le texte, la coach, le jeton de l'espace membre). La notification
// ouvre l'onglet Journal (`?tab=journal`), où la remarque s'affiche en tête.
//
// Réservée au service_role (verify_jwt + rôle lu dans le jeton, comme
// journal-rappel) : la clé anon est publique.
// `{ "remarque_id": "…", "dry_run": true }` montre la notification sans l'envoyer.
//
// Déploiement : supabase functions deploy journal-remarque-notifier
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getServiceClient, sendPushToClient, corsHeaders, jsonResponse } from "../_shared/push.ts";

/** Même contrôle que journal-rappel : on lit le rôle inscrit dans le jeton (vérifié par la passerelle). */
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

function tronquer(texte: string, max: number): string {
  const t = texte.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : t.slice(0, max - 1).trimEnd() + "…";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!isServiceRole(req.headers.get("Authorization") ?? "")) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const body = (await req.json().catch(() => ({}))) as { remarque_id?: string; dry_run?: boolean };
  if (!body.remarque_id) return jsonResponse({ error: "remarque_id requis" }, 400);

  const sb = getServiceClient({ reessais: true });
  const { data: remarque, error } = await sb
    .from("journal_remarques")
    .select("client_id, coach_user_id, texte")
    .eq("id", body.remarque_id)
    .maybeSingle();
  if (error) return jsonResponse({ error: error.message }, 500);
  if (!remarque) return jsonResponse({ error: "remarque introuvable" }, 404);

  const [{ data: coach }, { data: comptes }] = await Promise.all([
    sb.from("users").select("name").eq("id", remarque.coach_user_id).maybeSingle(),
    // Le jeton le plus récent encore valide (client_id est en texte dans cette table).
    sb
      .from("client_app_accounts")
      .select("token, expires_at")
      .eq("client_id", String(remarque.client_id))
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  const maintenant = Date.now();
  const compte = (comptes ?? []).find(
    (c) => !c.expires_at || new Date(c.expires_at as string).getTime() > maintenant,
  );
  // Sans espace membre, aucune notification possible (l'abonnement se prend dans l'app).
  if (!compte?.token) return jsonResponse({ ok: true, skipped: "pas d'espace membre" });

  const prenomCoach = String(coach?.name ?? "").trim().split(/\s+/)[0] || "Ta coach";
  const notification = {
    title: `${prenomCoach} t'a laissé un mot dans ton journal`,
    body: tronquer(String(remarque.texte ?? ""), 110),
    url: `/client/${compte.token}?tab=journal`,
    type: "journal_remarque",
  };
  if (body.dry_run) {
    return jsonResponse({ ok: true, dry_run: true, notification: { ...notification, url: "/client/…?tab=journal" } });
  }

  const result = await sendPushToClient(sb, String(remarque.client_id), notification);
  return jsonResponse({ ok: true, result });
});
