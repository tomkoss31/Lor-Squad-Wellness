import { createClient } from "@supabase/supabase-js";

function getTeamHierarchySetupError(error: { message?: string } | null | undefined) {
  const message = String(error?.message ?? "").toLowerCase();

  if (!message) {
    return null;
  }

  if (message.includes("sponsor_id") || message.includes("sponsor_name")) {
    return "Le rattachement d'equipe n'est pas encore active sur cette base Supabase. Lance le fichier supabase/fix-team-hierarchy.sql dans SQL Editor, puis recharge l'application.";
  }

  return null;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Methode non autorisee." });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authHeader = String(req.headers.authorization ?? "");
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({
      ok: false,
      error: "Les variables Supabase ne sont pas configurees sur le serveur."
    });
    return;
  }

  if (!accessToken) {
    res.status(401).json({ ok: false, error: "Session admin manquante." });
    return;
  }

  const payload = req.body ?? {};
  const name = String(payload.name ?? "").trim();
  const email = String(payload.email ?? "").trim().toLowerCase();
  const role =
    payload.role === "admin" || payload.role === "referent" ? payload.role : "distributor";
  const sponsorId = String(payload.sponsorId ?? "").trim();
  const active = Boolean(payload.active);
  const password = String(payload.mockPassword ?? "").trim();

  if (!name || !email || !password) {
    res.status(400).json({
      ok: false,
      error: "Nom, email et mot de passe initial sont obligatoires."
    });
    return;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const {
    data: { user: requester },
    error: authError
  } = await admin.auth.getUser(accessToken);

  if (authError || !requester?.id) {
    res.status(401).json({
      ok: false,
      error: "La session admin n'est plus valide. Reconnecte-toi puis recommence."
    });
    return;
  }

  const { data: profile, error: profileError } = await admin
    .from("users")
    .select("role, active")
    .eq("id", requester.id)
    .single<{ role: string; active: boolean }>();

  if (profileError || !profile || profile.role !== "admin" || !profile.active) {
    res.status(403).json({
      ok: false,
      error: "Seul un admin actif peut creer un nouvel acces."
    });
    return;
  }

  let sponsorName: string | null = null;
  if (role === "distributor" && sponsorId) {
    const { data: sponsor } = await admin
      .from("users")
      .select("id, name, role, active")
      .eq("id", sponsorId)
      .single<{ id: string; name: string; role: string; active: boolean }>();

    if (!sponsor || !sponsor.active || !["admin", "referent"].includes(sponsor.role)) {
      res.status(400).json({
        ok: false,
        error: "Le sponsor d'equipe selectionne est introuvable."
      });
      return;
    }

    sponsorName = sponsor.name;
  }

  const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name,
      role,
      sponsor_id: role === "distributor" ? sponsorId || null : null
    }
  });

  if (createError || !createdUser.user) {
    res.status(400).json({
      ok: false,
      error: createError?.message ?? "Impossible de creer cet utilisateur."
    });
    return;
  }

  const title =
    role === "admin"
      ? "Pilotage global"
      : role === "referent"
        ? "Referent d'equipe"
        : "Portefeuille terrain";

  const { error: profileInsertError } = await admin.from("users").upsert({
    id: createdUser.user.id,
    name,
    email,
    role,
    sponsor_id: role === "distributor" ? sponsorId || null : null,
    sponsor_name: role === "distributor" ? sponsorName : null,
    active,
    title,
    created_at: new Date().toISOString()
  });

  if (profileInsertError) {
    res.status(400).json({
      ok: false,
      error:
        getTeamHierarchySetupError(profileInsertError) ||
        profileInsertError.message
    });
    return;
  }

  res.status(200).json({ ok: true });
}
