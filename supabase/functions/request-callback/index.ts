// =============================================================================
// request-callback — « Fais-toi rappeler par Thomas » (2026-07-18,
// + lead scoring 2026-07-19).
//
// Page publique /resultat-bilan/:token. Un lead pas prêt à payer clique
// « rappelle-moi ». Il a DÉJÀ laissé prénom + contact + canal à l'étape bilan
// → un seul clic. La page envoie aussi son ENGAGEMENT (score de conversion).
//
// POST { token, engagement? }  (online_bilans.result_token)
//   1. Résout le lead par result_token (service_role).
//   2. Horodate callback_requested_at + stocke l'engagement (trace CRM).
//   3. Notifie le coach par push (avec le tier : chaud/tiède/froid).
//
// Déploiement : supabase functions deploy request-callback --no-verify-jwt
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getServiceClient,
  sendPushToUser,
  corsHeaders,
  jsonResponse,
} from "../_shared/push.ts";

// Le canal préféré vit dans online_bilans.payload.finalize.contact_pref
// (phone | email | whatsapp). Remonté pour personnaliser la confirmation.
function readContactPref(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const finalize = (payload as Record<string, unknown>).finalize;
  if (!finalize || typeof finalize !== "object") return null;
  const v = (finalize as Record<string, unknown>).contact_pref as string | undefined;
  return v ? String(v) : null;
}

// Nettoie l'engagement reçu du front (jamais confiance aveugle en un body public).
function sanitizeEngagement(raw: unknown): { score: number; tier: string; signals: string[] } | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const score = Math.max(0, Math.min(100, Math.round(Number(o.score) || 0)));
  const tier = o.tier === "chaud" || o.tier === "tiede" || o.tier === "froid" ? o.tier : "froid";
  const signals = Array.isArray(o.signals)
    ? o.signals.filter((s) => typeof s === "string").slice(0, 8).map((s) => String(s).slice(0, 120))
    : [];
  return { score, tier, signals };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ success: false, error: "method_not_allowed" }, 405);

  let token = "";
  let engagement: { score: number; tier: string; signals: string[] } | null = null;
  try {
    const body = (await req.json()) as { token?: string; engagement?: unknown };
    token = String(body.token ?? "").trim();
    engagement = sanitizeEngagement(body.engagement);
  } catch {
    return jsonResponse({ success: false, error: "invalid_json" }, 400);
  }
  if (!token) return jsonResponse({ success: false, error: "token_requis" }, 400);

  const sb = getServiceClient();

  const { data: bilan, error: bErr } = await sb
    .from("online_bilans")
    .select("id, first_name, coach_user_id, payload, callback_requested_at")
    .eq("result_token", token)
    .maybeSingle();
  if (bErr) return jsonResponse({ success: false, error: "lookup_failed" }, 500);
  if (!bilan) return jsonResponse({ success: false, error: "not_found" }, 404);

  const firstName = String((bilan.first_name as string) ?? "").trim();
  const contactPref = readContactPref(bilan.payload);

  // Horodate + stocke l'engagement (idempotent : relance de page = refresh).
  const patch: Record<string, unknown> = { callback_requested_at: new Date().toISOString() };
  if (engagement) patch.engagement = engagement;
  const { error: upErr } = await sb.from("online_bilans").update(patch).eq("id", bilan.id);
  if (upErr) return jsonResponse({ success: false, error: "update_failed" }, 500);

  const coachUserId = (bilan.coach_user_id as string | null) ?? null;
  if (coachUserId) {
    try {
      const prefLabel = contactPref === "whatsapp"
        ? " (WhatsApp)"
        : contactPref === "phone"
          ? " (par téléphone)"
          : contactPref === "email"
            ? " (par email)"
            : "";
      const tierLabel = engagement
        ? engagement.tier === "chaud"
          ? ` — 🔥 lead CHAUD (${engagement.score}/100), à rappeler en priorité`
          : engagement.tier === "tiede"
            ? ` — lead tiède (${engagement.score}/100)`
            : ` — lead froid (${engagement.score}/100)`
        : "";
      await sendPushToUser(sb, {
        userId: coachUserId,
        payload: {
          title: "🔔 Un lead veut être rappelé",
          body: `${firstName || "Un prospect"} attend ton appel${prefLabel}${tierLabel}.`,
          url: "/crm",
          type: "callback_request",
        },
      });
    } catch (_e) {
      // push best-effort — la trace est déjà posée
    }
  }

  return jsonResponse({ success: true, firstName, contactPref });
});
