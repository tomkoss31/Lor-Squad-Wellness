// =============================================================================
// formation-validation-notifier — push au sponsor quand un filleul valide
// un module formation (2026-05-05)
//
// Déclenché par trigger Postgres sur formation_user_progress quand
// status passe a 'validated' (auto OU sponsor OU admin_relay). Reçoit
// { user_id, module_id, validation_path } du trigger via http_request.
//
// Logique :
//   1. Lookup user (name, sponsor_id)
//   2. Si sponsor_id existe ET user a notif_messages true ET sponsor a
//      notif_messages true → push au sponsor
//   3. Si validation_path = 'auto' (quiz QCM 100% direct) : titre joyeux
//      "🎉 Mandy a validé un module en autonomie !"
//   4. Sinon : titre standard "✅ Mandy a validé le module M1.1"
//   5. URL → /formation/mon-equipe pour voir le détail
//
// Dédup : entity_id = `validation-{user_id}-{module_id}`, fenêtre 1h
// (évite les doubles si trigger refire pour update timestamp).
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  getServiceClient,
  jsonResponse,
  sendPushToUser,
} from "../_shared/push.ts";

interface Payload {
  user_id?: string;
  module_id?: string;
  validation_path?: "auto" | "sponsor" | "admin_relay" | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Body JSON invalide" }, 400);
  }

  const userId = body.user_id;
  const moduleId = body.module_id;
  const validationPath = body.validation_path ?? null;

  if (!userId || !moduleId) {
    return jsonResponse({ error: "user_id et module_id requis" }, 400);
  }

  const sb = getServiceClient();

  try {
    // Lookup user (filleul) + son sponsor
    const { data: user, error: userErr } = await sb
      .from("users")
      .select("id, name, sponsor_id, notif_messages")
      .eq("id", userId)
      .maybeSingle();

    if (userErr || !user) {
      return jsonResponse({ error: "user introuvable", detail: userErr?.message }, 404);
    }

    if (!user.sponsor_id) {
      return jsonResponse({
        ok: true,
        skipped: "no_sponsor",
        message: `${user.name ?? "user"} n'a pas de sponsor — pas de notif`,
      });
    }

    // Lookup sponsor (préférences notif)
    const { data: sponsor, error: spErr } = await sb
      .from("users")
      .select("id, name, notif_messages")
      .eq("id", user.sponsor_id)
      .maybeSingle();

    if (spErr || !sponsor) {
      return jsonResponse({ error: "sponsor introuvable" }, 404);
    }

    if (sponsor.notif_messages === false) {
      return jsonResponse({
        ok: true,
        skipped: "sponsor_opted_out",
        message: `Sponsor ${sponsor.name ?? ""} a désactivé les notifs`,
      });
    }

    // Construction du payload
    const userFirstName = (user.name ?? "Un filleul").trim().split(/\s+/)[0] || "Un filleul";

    const isAuto = validationPath === "auto";
    const title = isAuto
      ? `🎉 ${userFirstName} a validé un module en autonomie`
      : `✅ ${userFirstName} a validé un module`;

    const moduleBody = isAuto
      ? `Module ${moduleId} — quiz 100 %. Bravo de ton accompagnement !`
      : `Module ${moduleId} validé. Tu peux passer voir.`;

    const result = await sendPushToUser(sb, {
      userId: sponsor.id,
      payload: {
        title,
        body: moduleBody,
        url: "/formation/mon-equipe",
        type: "formation_validation_pending",
      },
      dedupe: {
        entityId: `validation-${userId}-${moduleId}`,
        entityType: "formation_validation",
        windowMinutes: 60,
      },
    });

    return jsonResponse({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return jsonResponse({ error: message }, 500);
  }
});
