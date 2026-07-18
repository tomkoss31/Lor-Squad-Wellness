// =============================================================================
// request-callback — « Fais-toi rappeler par Thomas » (2026-07-18).
//
// Page publique /resultat-bilan/:token. Un lead qui n'est pas prêt à payer tout
// de suite clique « rappelle-moi ». Il a DÉJÀ laissé son prénom, son contact et
// son canal préféré à l'étape bilan → aucune re-saisie, un seul clic.
//
// POST { token }  (online_bilans.result_token)
//   1. Résout le lead par result_token (service_role, comme get-online-bilan-results).
//   2. Horodate online_bilans.callback_requested_at → trace durable dans le CRM.
//   3. Notifie le coach par push (« X veut que tu le rappelles »).
//   4. Renvoie { firstName, contactPref } pour la confirmation à l'écran.
//
// Déploiement : supabase functions deploy request-callback --no-verify-jwt
//   (le prospect n'a pas de JWT Supabase — auth par token UUID dans la fn).
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getServiceClient,
  sendPushToUser,
  corsHeaders,
  jsonResponse,
} from "../_shared/push.ts";

// Le canal préféré vit dans online_bilans.payload.finalize.contact_pref
// (étape « finalize » du bilan online — vérifié en base : phone | email |
// whatsapp). On le remonte tel quel pour personnaliser la confirmation
// (« Thomas te recontacte par WhatsApp »), sans jamais exposer le contact.
function readContactPref(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const finalize = (payload as Record<string, unknown>).finalize;
  if (!finalize || typeof finalize !== "object") return null;
  const v = (finalize as Record<string, unknown>).contact_pref as string | undefined;
  return v ? String(v) : null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ success: false, error: "method_not_allowed" }, 405);

  let token = "";
  try {
    const body = (await req.json()) as { token?: string };
    token = String(body.token ?? "").trim();
  } catch {
    return jsonResponse({ success: false, error: "invalid_json" }, 400);
  }
  if (!token) return jsonResponse({ success: false, error: "token_requis" }, 400);

  const sb = getServiceClient();

  // 1. Lead par token public.
  const { data: bilan, error: bErr } = await sb
    .from("online_bilans")
    .select("id, first_name, coach_user_id, payload, callback_requested_at")
    .eq("result_token", token)
    .maybeSingle();
  if (bErr) return jsonResponse({ success: false, error: "lookup_failed" }, 500);
  if (!bilan) return jsonResponse({ success: false, error: "not_found" }, 404);

  const firstName = String((bilan.first_name as string) ?? "").trim();
  const contactPref = readContactPref(bilan.payload);

  // 2. Horodate la demande (trace CRM). Idempotent : si déjà demandé, on
  //    rafraîchit l'horodatage (le lead relance) plutôt que d'empiler.
  const { error: upErr } = await sb
    .from("online_bilans")
    .update({ callback_requested_at: new Date().toISOString() })
    .eq("id", bilan.id);
  if (upErr) return jsonResponse({ success: false, error: "update_failed" }, 500);

  // 3. Notif coach (best-effort — la trace est déjà posée).
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
      await sendPushToUser(sb, {
        userId: coachUserId,
        payload: {
          title: "🔔 Un lead veut être rappelé",
          body: `${firstName || "Un prospect"} attend ton appel${prefLabel} — depuis sa page Résultat Bilan.`,
          url: "/crm",
          type: "callback_request",
        },
      });
    } catch (_e) {
      // push best-effort
    }
  }

  return jsonResponse({ success: true, firstName, contactPref });
});
