// Supabase Edge Function : envoi de notification push
// Deploy: supabase functions deploy send-push
//
// Secrets requis (Supabase Dashboard → Settings → Edge Functions → Secrets):
//   - VAPID_PUBLIC_KEY
//   - VAPID_PRIVATE_KEY
//   - VAPID_EMAIL  (format recommandé: mailto:coach@example.com — le code
//                   normalise automatiquement si le préfixe manque)
//
// Hotfix 2026-04-21 — Apple Push Service compat :
//   1. Import via esm.sh au lieu de npm: spec → polyfilling Node plus
//      fiable en Deno Edge Runtime (fixes "ERR_UNKNOWN_MODULE" sur
//      dépendances http_ece / asn1.js).
//   2. VAPID_EMAIL normalisé : si pas de préfixe mailto:/https:, on
//      force `mailto:`. web-push throw "Vapid subject must be a url or
//      a mailto" sinon.
//   3. setVapidDetails() appelé à l'intérieur du handler dans un try/catch
//      → une erreur de config ne crash plus au load, elle remonte avec
//      le statut 500 et un message explicite.
//   4. SELECT multi-lignes + .order('updated_at' desc) : Thomas a plusieurs
//      devices inscrits → on essaie chaque endpoint.
//   5. Gestion 404/410 Gone → delete sub stale, best-effort. Apple Push
//      renvoie 410 quand l'app a été désinstallée.
//   6. Réponse détaillée : body contient la liste des tentatives avec
//      statusCode/body/endpoint tronqué → diagnostic direct depuis curl.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";

/** Normalise l'email VAPID : ajoute le préfixe mailto: si absent. */
function normalizeVapidSubject(raw: string | undefined): string {
  const value = (raw ?? "coach@lorsquad.com").trim();
  if (value.startsWith("mailto:") || value.startsWith("https://")) {
    return value;
  }
  return `mailto:${value}`;
}

const VAPID_SUBJECT = normalizeVapidSubject(Deno.env.get("VAPID_EMAIL"));

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface PushAttempt {
  endpoint_preview: string;
  ok: boolean;
  statusCode?: number;
  error?: string;
  cleaned_up?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // Garde-fou env vars : on renvoie un 500 explicite si un secret manque,
  // au lieu de laisser webpush crash avec un message générique.
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return json(
      {
        error: "VAPID keys manquantes",
        detail:
          "VAPID_PUBLIC_KEY et VAPID_PRIVATE_KEY doivent être configurés dans les secrets Supabase.",
      },
      500,
    );
  }

  // setVapidDetails dans le handler (pas au module load) pour surfacer
  // proprement une erreur de format plutôt que crasher le cold start.
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json(
      {
        error: "setVapidDetails failed",
        detail: message,
        vapid_subject: VAPID_SUBJECT,
      },
      500,
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body JSON invalide" }, 400);
  }

  const user_id = body.user_id as string | undefined;
  const title = body.title as string | undefined;
  const msgBody = (body.body as string | undefined) ?? "";
  const url = (body.url as string | undefined) ?? "/";
  const type = (body.type as string | undefined) ?? "info";

  if (!user_id || !title) {
    return json({ error: "user_id et title requis" }, 400);
  }

  // ─── Lookup toutes les souscriptions du user ──────────────────────────────
  // Drop .maybeSingle() : le user peut avoir plusieurs devices (mobile +
  // desktop). On essaie chaque endpoint et on nettoie les expirés au passage.
  const { data: subs, error: fetchErr } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", user_id)
    .order("updated_at", { ascending: false });

  if (fetchErr) {
    return json(
      { error: "Lecture push_subscriptions échouée", detail: fetchErr.message },
      500,
    );
  }

  if (!subs || subs.length === 0) {
    return json({ error: "Aucune souscription pour cet utilisateur" }, 404);
  }

  const payload = JSON.stringify({
    title,
    body: msgBody,
    url,
    type,
  });

  // ─── Envoi sur chaque endpoint ────────────────────────────────────────────
  const attempts: PushAttempt[] = [];
  let anyOk = false;

  for (const sub of subs) {
    const preview = String(sub.endpoint).slice(0, 60) + "…";
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload,
        { TTL: 60 },
      );
      attempts.push({ endpoint_preview: preview, ok: true });
      anyOk = true;
    } catch (err) {
      // La lib expose statusCode pour les réponses HTTP du push service.
      const anyErr = err as { statusCode?: number; body?: string; message?: string };
      const statusCode = typeof anyErr.statusCode === "number" ? anyErr.statusCode : undefined;
      const detail = anyErr.body || anyErr.message || String(err);

      // 404 / 410 → endpoint expiré (app désinstallée, token Apple révoqué).
      // On supprime la ligne pour ne plus retenter.
      let cleaned_up = false;
      if (statusCode === 404 || statusCode === 410) {
        const { error: delErr } = await supabase
          .from("push_subscriptions")
          .delete()
          .eq("id", sub.id);
        cleaned_up = !delErr;
      }

      attempts.push({
        endpoint_preview: preview,
        ok: false,
        statusCode,
        error: detail,
        cleaned_up,
      });
    }
  }

  // Politique de réponse : si au moins 1 envoi OK → 200 success. Sinon, on
  // remonte 502 avec le détail pour diagnostic côté client (Apple, etc.).
  if (anyOk) {
    return json({
      success: true,
      attempts,
      vapid_subject: VAPID_SUBJECT,
    });
  }

  return json(
    {
      success: false,
      error: "Aucun push n'a abouti",
      attempts,
      vapid_subject: VAPID_SUBJECT,
    },
    502,
  );
});
