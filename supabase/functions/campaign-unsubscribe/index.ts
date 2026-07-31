// =============================================================================
// campaign-unsubscribe — désinscription publique (chantier Campagnes, étape 6).
//
// Cliquée depuis le lien « Se désabonner » d'un email de campagne, et appelée
// par Gmail (List-Unsubscribe-Post) en 1-clic.
//   GET  ?r=<recipient_id>  → traite + page de confirmation HTML.
//   POST ?r=<recipient_id>  → traite (one-click) + 200.
//
// Effet : ajoute l'email à email_suppressions (liste GLOBALE → exclu de TOUTE
// campagne future), marque campaign_recipients.unsubscribed_at, incrémente le
// compteur. Idempotent.
//
// Sécurité : `r` = l'id (uuid aléatoire) du destinataire = jeton non
// énumérable ; seul le porteur du lien (le destinataire) peut se désabonner.
// Déployé --no-verify-jwt (lien public, pas de session).
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function page(title: string, msg: string): Response {
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;background:#0a0c0a;color:#F1EFE8;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <div style="max-width:420px;text-align:center;padding:32px 24px;">
    <div style="width:64px;height:64px;border-radius:18px;margin:0 auto 20px;background:linear-gradient(150deg,#2ec5c0,#3f8ef0,#7d6bf0);color:#fff;font-family:'Arial Black',sans-serif;font-size:34px;line-height:64px;">B</div>
    <h1 style="font-size:22px;margin:0 0 12px;">${title}</h1>
    <p style="font-size:15px;line-height:1.6;color:#9AA0A6;margin:0;">${msg}</p>
    <p style="font-size:12px;color:#5A6178;margin-top:28px;">La Base 360 · Verdun, France</p>
  </div>
</body></html>`;
  return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

async function unsubscribe(recipientId: string): Promise<{ ok: boolean; already?: boolean }> {
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: rec } = await sb
    .from("campaign_recipients")
    .select("id, campaign_id, email, unsubscribed_at")
    .eq("id", recipientId)
    .maybeSingle();
  if (!rec) return { ok: false };
  const r = rec as { id: string; campaign_id: string; email: string; unsubscribed_at: string | null };

  if (r.unsubscribed_at) return { ok: true, already: true };

  const now = new Date().toISOString();
  const em = r.email.trim().toLowerCase();

  // 1. liste de suppression globale (insert normalisé, doublon avalé).
  const { error: supErr } = await sb
    .from("email_suppressions")
    .insert({ email: em, reason: "unsubscribed", campaign_id: r.campaign_id });
  if (supErr && supErr.code !== "23505") {
    console.warn("[campaign-unsubscribe] suppression échouée:", supErr.message);
  }

  // 2. marque le destinataire + compteur.
  await sb.from("campaign_recipients").update({ unsubscribed_at: now }).eq("id", r.id);
  await sb.rpc("increment_campaign_counter", { p_campaign_id: r.campaign_id, p_column: "unsubscribed_count" });

  return { ok: true };
}

serve(async (req) => {
  const url = new URL(req.url);
  const r = url.searchParams.get("r") ?? "";

  // Gmail one-click : POST → traite, réponse minimale.
  if (req.method === "POST") {
    if (r) await unsubscribe(r);
    return new Response("ok", { status: 200 });
  }

  if (req.method !== "GET") return new Response("method_not_allowed", { status: 405 });

  if (!r) return page("Lien invalide", "Ce lien de désinscription est incomplet.");

  const res = await unsubscribe(r);
  if (!res.ok) return page("Lien introuvable", "Ce lien de désinscription n'est plus valide.");
  return page(
    "C'est fait ✓",
    res.already
      ? "Tu étais déjà désinscrit. Tu ne recevras plus nos emails."
      : "Tu es désinscrit. Tu ne recevras plus aucun email de notre part. À bientôt peut-être.",
  );
});
