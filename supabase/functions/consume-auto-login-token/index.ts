// Chantier Welcome Page + Magic Links (2026-04-24).
// Edge Function : consomme un magic link auto-login. Valide le token,
// génère une session Supabase via admin.generateLink (type magiclink
// → renvoie un action_link qui contient un refresh_token échangeable).
//
// Input  : { token: string }  (pas d'auth requise : le token EST l'auth)
// Output : { success, access_token, refresh_token, user_id, redirect_to, error? }
//
// Deploy: supabase functions deploy consume-auto-login-token

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "method_not_allowed" }, 405);

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "invalid_json" }, 400);
  }

  const token = (body.token ?? "").trim();
  if (!token) return json({ success: false, error: "missing_token" }, 400);

  try {
    const { data: row, error: selErr } = await sb
      .from("auto_login_tokens")
      .select("id, user_auth_id, expires_at, consumed_at, usage_count, max_usage")
      .eq("token", token)
      .maybeSingle();

    if (selErr || !row) {
      return json({ success: false, error: "Lien introuvable." }, 404);
    }

    if (row.consumed_at) {
      return json({ success: false, error: "Ce lien a déjà été utilisé." }, 410);
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return json({ success: false, error: "Ce lien a expiré." }, 410);
    }
    if (row.usage_count >= row.max_usage) {
      return json({ success: false, error: "Lien épuisé (3 utilisations max)." }, 410);
    }

    // Lookup email de l'user pour générer le magic link
    const { data: userRes, error: uErr } = await sb.auth.admin.getUserById(row.user_auth_id);
    if (uErr || !userRes?.user?.email) {
      return json({ success: false, error: "Utilisateur introuvable." }, 404);
    }
    const email = userRes.user.email;

    // On génère un lien magique Supabase ; on ne l'envoie pas par email
    // (on l'utilise directement pour extraire le refresh_token).
    const { data: linkRes, error: linkErr } = await sb.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkErr || !linkRes) {
      return json({ success: false, error: "Impossible de générer la session." }, 500);
    }

    // Incrémente usage_count ; marque consommé si usage == max
    const nextUsage = row.usage_count + 1;
    const patch: Record<string, unknown> = { usage_count: nextUsage };
    if (nextUsage >= row.max_usage) {
      patch.consumed_at = new Date().toISOString();
    }
    await sb.from("auto_login_tokens").update(patch).eq("id", row.id);

    // Détecte le rôle pour la redirection cible
    const { data: userProfile } = await sb
      .from("users")
      .select("role")
      .eq("id", row.user_auth_id)
      .maybeSingle();

    let redirectTo = "/app";
    if (userProfile?.role === "admin" || userProfile?.role === "referent" || userProfile?.role === "distributor") {
      redirectTo = "/co-pilote";
    } else {
      // Client → on cherche son token de recap pour le rediriger vers /client/:token
      const { data: caa } = await sb
        .from("client_app_accounts")
        .select("token")
        .eq("auth_user_id", row.user_auth_id)
        .maybeSingle();
      if (caa?.token) redirectTo = `/client/${caa.token}`;
    }

    // Le "properties.action_link" renvoyé par generateLink contient un
    // hashed_token qui peut être utilisé par le client pour établir la
    // session via verifyOtp(type: 'magiclink', token: hashedToken).
    const actionLink = (linkRes.properties as { action_link?: string; hashed_token?: string } | undefined) ?? {};

    return json({
      success: true,
      user_id: row.user_auth_id,
      email,
      hashed_token: actionLink.hashed_token ?? null,
      action_link: actionLink.action_link ?? null,
      redirect_to: redirectTo,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return json({ success: false, error: msg }, 500);
  }
});
