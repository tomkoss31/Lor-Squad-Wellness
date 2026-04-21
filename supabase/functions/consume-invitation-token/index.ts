// Chantier Lien d'invitation client app (2026-04-21)
// Edge Function : consomme un token d'invitation.
//   1. Re-valide (non expiré, non consommé).
//   2. Crée le user Supabase Auth (email + mot de passe) via admin API.
//   3. Si cas B (pas d'email en fiche) → update clients.email avec l'email
//      fourni par le client.
//   4. Upsert client_app_accounts avec auth_user_id populé (ou re-link si
//      la ligne existait déjà pour ce client_id).
//   5. Marque le token comme consommé.
//   6. Retourne { access_token, refresh_token, redirect_token } pour que
//      le front auto-login + redirige vers /client/:redirect_token.
//
// Input  : { token: string, password: string, email?: string }
//          email requis en cas B, ignoré en cas A.
// Output : { success: bool, access_token?, refresh_token?, redirect_token?, error? }
//
// Deploy: supabase functions deploy consume-invitation-token

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

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

function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ success: false, error: "method_not_allowed" }, 405);
  }

  const sbAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  try {
    const body = (await req.json().catch(() => ({}))) as {
      token?: string;
      password?: string;
      email?: string;
    };
    const token = (body.token ?? "").trim();
    const password = (body.password ?? "").trim();
    const emailInput = (body.email ?? "").trim().toLowerCase();

    if (!token) return json({ success: false, error: "missing_token" }, 400);
    if (password.length < 6) {
      return json(
        { success: false, error: "Le mot de passe doit contenir au moins 6 caractères." },
        400,
      );
    }

    // 1. Lookup + validate token
    const { data: invitation, error: invErr } = await sbAdmin
      .from("client_invitation_tokens")
      .select("id, client_id, expires_at, consumed_at")
      .eq("token", token)
      .maybeSingle();

    if (invErr || !invitation) {
      return json({ success: false, error: "Lien introuvable." }, 404);
    }
    if (invitation.consumed_at) {
      return json({ success: false, error: "Ce lien a déjà été utilisé." }, 410);
    }
    if (new Date(invitation.expires_at).getTime() < Date.now()) {
      return json({ success: false, error: "Ce lien a expiré." }, 410);
    }

    // 2. Lookup client
    const { data: client, error: clientErr } = await sbAdmin
      .from("clients")
      .select("id, first_name, last_name, email, distributor_id, distributor_name")
      .eq("id", invitation.client_id)
      .maybeSingle();
    if (clientErr || !client) {
      return json({ success: false, error: "Fiche client introuvable." }, 404);
    }

    // 3. Déterminer l'email final
    const hasEmailOnRecord = Boolean((client.email ?? "").trim());
    let finalEmail = hasEmailOnRecord ? client.email.trim().toLowerCase() : emailInput;

    if (!hasEmailOnRecord) {
      if (!emailInput || !isValidEmail(emailInput)) {
        return json(
          { success: false, error: "L'adresse email saisie n'est pas valide." },
          400,
        );
      }
      finalEmail = emailInput;
    }

    // 4. Créer le user Supabase Auth (ou réutiliser s'il existe déjà)
    // admin.createUser échoue si l'email est déjà utilisé → on gère ça
    // explicitement pour un message clair.
    let authUserId: string | null = null;

    const { data: createRes, error: createErr } = await sbAdmin.auth.admin.createUser(
      {
        email: finalEmail,
        password,
        email_confirm: true,
        user_metadata: {
          client_id: client.id,
          first_name: client.first_name,
          origin: "client_invitation",
        },
      },
    );

    if (createErr) {
      // Cas le plus commun : email déjà utilisé.
      const errMsg = (createErr.message || "").toLowerCase();
      if (errMsg.includes("already") || errMsg.includes("registered") || errMsg.includes("exists")) {
        return json(
          {
            success: false,
            error:
              "Cette adresse email a déjà un compte. Connecte-toi ou utilise une autre adresse.",
          },
          409,
        );
      }
      return json({ success: false, error: createErr.message }, 500);
    }
    authUserId = createRes.user?.id ?? null;

    // 5. Update clients.email si cas B
    if (!hasEmailOnRecord) {
      await sbAdmin.from("clients").update({ email: finalEmail }).eq("id", client.id);
    }

    // 6. Upsert client_app_accounts (crée un nouveau token uuid si besoin,
    //    lie auth_user_id).
    let redirectToken: string | null = null;

    const { data: existingAccount } = await sbAdmin
      .from("client_app_accounts")
      .select("id, token")
      .eq("client_id", client.id)
      .maybeSingle();

    if (existingAccount) {
      await sbAdmin
        .from("client_app_accounts")
        .update({ auth_user_id: authUserId })
        .eq("id", existingAccount.id);
      redirectToken = existingAccount.token;
    } else {
      const { data: newAccount, error: accErr } = await sbAdmin
        .from("client_app_accounts")
        .insert({
          client_id: client.id,
          coach_id: client.distributor_id,
          coach_name: client.distributor_name,
          client_first_name: client.first_name,
          client_last_name: client.last_name,
          auth_user_id: authUserId,
        })
        .select("token")
        .single();
      if (accErr) {
        // Non bloquant : on continue avec juste l'auth session, le front
        // peut afficher un fallback.
        console.error("client_app_accounts insert failed:", accErr);
      } else {
        redirectToken = newAccount?.token ?? null;
      }
    }

    // 7. Mark token consumed
    await sbAdmin
      .from("client_invitation_tokens")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", invitation.id);

    // 8. Sign in to get session tokens for auto-login.
    // On utilise un client anon séparé (service role ne peut pas signIn).
    const sbAnon = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false },
    });
    const { data: signInData, error: signInErr } = await sbAnon.auth.signInWithPassword(
      { email: finalEmail, password },
    );

    if (signInErr || !signInData.session) {
      // L'user a été créé mais le signin a échoué → on renvoie quand même
      // un succès partiel avec redirect_token. Le client pourra se connecter
      // via /login classique ensuite.
      return json({
        success: true,
        redirect_token: redirectToken,
        warning: "Compte créé — reconnexion manuelle requise.",
      });
    }

    return json({
      success: true,
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
      redirect_token: redirectToken,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return json({ success: false, error: message }, 500);
  }
});
