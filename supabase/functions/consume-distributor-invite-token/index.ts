// Chantier Onboarding distributeur complet (2026-04-24)
// Edge Function : consomme un token d'invitation distributeur.
//
//   1. Re-valide le token (non expiré, non consommé).
//   2. Crée l'utilisateur Supabase Auth (email confirmé, password).
//   3. Insert dans public.users avec role='distributor', sponsor_id,
//      phone, city, herbalife_id, avatar_url + sponsor_name dénormalisé.
//   4. Marque le token consommé.
//   5. signInWithPassword pour retourner les tokens d'auto-login.
//
// Input  : {
//   token, password,
//   first_name, last_name,
//   phone, city, herbalife_id, avatar_url?
// }
// Output : { success, access_token?, refresh_token?, user_id?, error? }
//
// Deploy: supabase functions deploy consume-distributor-invite-token

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
      first_name?: string;
      last_name?: string;
      phone?: string;
      city?: string;
      herbalife_id?: string;
      avatar_url?: string;
    };
    const token = (body.token ?? "").trim();
    const password = (body.password ?? "").trim();
    const firstName = (body.first_name ?? "").trim();
    const lastName = (body.last_name ?? "").trim();
    const phone = (body.phone ?? "").trim();
    const city = (body.city ?? "").trim();
    const herbalifeId = (body.herbalife_id ?? "").trim();
    const avatarUrl = body.avatar_url ? String(body.avatar_url).trim() : null;

    // ─── 1. Validation input ─────────────────────────────────────────────────
    if (!token) return json({ success: false, error: "missing_token" }, 400);
    if (password.length < 6) {
      return json({ success: false, error: "Le mot de passe doit contenir au moins 6 caractères." }, 400);
    }
    if (!firstName || !lastName) {
      return json({ success: false, error: "Prénom et nom obligatoires." }, 400);
    }
    if (!phone) return json({ success: false, error: "Numéro de téléphone obligatoire." }, 400);
    if (!city) return json({ success: false, error: "Ville obligatoire." }, 400);
    if (!herbalifeId) return json({ success: false, error: "ID Herbalife obligatoire." }, 400);

    // ─── 2. Re-validation token ─────────────────────────────────────────────
    const { data: invitation, error: invErr } = await sbAdmin
      .from("distributor_invitation_tokens")
      .select("id, email, sponsor_id, expires_at, consumed_at")
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

    const email = invitation.email.trim().toLowerCase();

    // ─── 3. Lookup sponsor_name dénormalisé ─────────────────────────────────
    let sponsorName: string | null = null;
    if (invitation.sponsor_id) {
      const { data: sponsor } = await sbAdmin
        .from("users")
        .select("name")
        .eq("id", invitation.sponsor_id)
        .maybeSingle();
      sponsorName = sponsor?.name ?? null;
    }

    // ─── 4. Création auth.users ──────────────────────────────────────────────
    const { data: createRes, error: createErr } = await sbAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        sponsor_id: invitation.sponsor_id,
        origin: "distributor_invitation",
      },
    });

    if (createErr) {
      const msg = (createErr.message || "").toLowerCase();
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        return json(
          {
            success: false,
            error: "Cette adresse email a déjà un compte. Contacte ton parrain.",
          },
          409,
        );
      }
      return json({ success: false, error: createErr.message }, 500);
    }
    const authUserId = createRes.user?.id;
    if (!authUserId) {
      return json({ success: false, error: "Création du compte impossible." }, 500);
    }

    // ─── 5. Insert public.users ─────────────────────────────────────────────
    const fullName = `${firstName} ${lastName}`.trim();
    const { error: userInsertErr } = await sbAdmin.from("users").insert({
      id: authUserId,
      email,
      name: fullName,
      role: "distributor",
      sponsor_id: invitation.sponsor_id,
      sponsor_name: sponsorName,
      active: true,
      title: "Accès distributeur",
      phone,
      city,
      herbalife_id: herbalifeId,
      avatar_url: avatarUrl,
    });

    if (userInsertErr) {
      // Rollback auth user pour éviter un compte orphelin.
      await sbAdmin.auth.admin.deleteUser(authUserId);
      return json({ success: false, error: userInsertErr.message }, 500);
    }

    // ─── 6. Mark token consumed ─────────────────────────────────────────────
    await sbAdmin
      .from("distributor_invitation_tokens")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", invitation.id);

    // ─── 7. Sign in pour retourner la session ───────────────────────────────
    const sbAnon = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false },
    });
    const { data: signInData, error: signInErr } = await sbAnon.auth.signInWithPassword({
      email,
      password,
    });

    if (signInErr || !signInData.session) {
      return json({
        success: true,
        user_id: authUserId,
        warning: "Compte créé — reconnexion manuelle requise.",
      });
    }

    return json({
      success: true,
      user_id: authUserId,
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return json({ success: false, error: message }, 500);
  }
});
