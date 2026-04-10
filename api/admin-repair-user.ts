import { createClient } from "@supabase/supabase-js";
import { getTeamHierarchySetupError } from "./_supabaseErrors";

function deriveNameFromEmail(email: string) {
  const localPart = email.split("@")[0] ?? "";
  if (!localPart) {
    return "Compte équipe";
  }

  return localPart
    .replace(/[._-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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
  const userId = String(payload.userId ?? "").trim();
  const email = String(payload.email ?? "").trim().toLowerCase();
  const requestedName = String(payload.name ?? "").trim();
  const role =
    payload.role === "admin" || payload.role === "referent" ? payload.role : "distributor";
  const sponsorId = String(payload.sponsorId ?? "").trim();
  const active = Boolean(payload.active);

  if (!email && !userId) {
    res.status(400).json({
      ok: false,
      error: "Ajoute au moins un email ou un identifiant Supabase."
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
      error: "Seul un admin actif peut reparer un acces."
    });
    return;
  }

  let authUser =
    userId
      ? (await admin.auth.admin.getUserById(userId)).data.user ?? null
      : null;

  if (!authUser && email) {
    const listedUsers = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 500
    });

    authUser =
      listedUsers.data.users.find(
        (item) => item.email?.toLowerCase() === email
      ) ?? null;
  }

  if (!authUser?.id || !authUser.email) {
    res.status(404).json({
      ok: false,
      error: "Le compte Auth correspondant est introuvable sur Supabase."
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

  const name =
    requestedName ||
    String(authUser.user_metadata?.name ?? "").trim() ||
    deriveNameFromEmail(authUser.email);

  const title =
    role === "admin"
      ? "Pilotage global"
      : role === "referent"
        ? "Referent d'equipe"
        : "Portefeuille terrain";

  const { error: upsertError } = await admin.from("users").upsert({
    id: authUser.id,
    name,
    email: authUser.email.toLowerCase(),
    role,
    sponsor_id: role === "distributor" ? sponsorId || null : null,
    sponsor_name: role === "distributor" ? sponsorName : null,
    active,
    title,
    created_at: authUser.created_at ?? new Date().toISOString()
  });

  if (upsertError) {
    res.status(400).json({
      ok: false,
      error:
        getTeamHierarchySetupError(upsertError) ||
        upsertError.message ||
        "Impossible de recreer le profil applicatif."
    });
    return;
  }

  await admin.auth.admin.updateUserById(authUser.id, {
    user_metadata: {
      ...authUser.user_metadata,
      name,
      role,
      sponsor_id: role === "distributor" ? sponsorId || null : null
    }
  });

  res.status(200).json({ ok: true });
}
