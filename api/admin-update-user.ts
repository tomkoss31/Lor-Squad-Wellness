import { createClient } from "@supabase/supabase-js";

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

  const userId = String(req.body?.userId ?? "").trim();
  const role =
    req.body?.role === "admin" || req.body?.role === "referent"
      ? req.body.role
      : "distributor";
  const sponsorId = String(req.body?.sponsorId ?? "").trim();
  const title = String(req.body?.title ?? "").trim();

  if (!userId) {
    res.status(400).json({ ok: false, error: "Le compte a modifier est introuvable." });
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
      error: "Seul un admin actif peut modifier un acces."
    });
    return;
  }

  const { data: targetUser, error: targetError } = await admin
    .from("users")
    .select("id, role")
    .eq("id", userId)
    .single<{ id: string; role: string }>();

  if (targetError || !targetUser) {
    res.status(404).json({ ok: false, error: "Le compte cible est introuvable." });
    return;
  }

  if (targetUser.role === "admin" && role !== "admin") {
    res.status(400).json({
      ok: false,
      error: "Un compte admin ne peut pas etre degrade ici."
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

    if (!sponsor || sponsor.id === userId || !sponsor.active || !["admin", "referent"].includes(sponsor.role)) {
      res.status(400).json({
        ok: false,
        error: "Le sponsor d'equipe selectionne est introuvable."
      });
      return;
    }

    sponsorName = sponsor.name;
  }

  const { error: updateError } = await admin
    .from("users")
    .update({
      role,
      sponsor_id: role === "distributor" ? sponsorId || null : null,
      sponsor_name: role === "distributor" ? sponsorName : null,
      title: title || null
    })
    .eq("id", userId);

  if (updateError) {
    res.status(400).json({
      ok: false,
      error: updateError.message || "Impossible de mettre a jour cet acces."
    });
    return;
  }

  await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      role,
      sponsor_id: role === "distributor" ? sponsorId || null : null
    }
  });

  res.status(200).json({ ok: true });
}
