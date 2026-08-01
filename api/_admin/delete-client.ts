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
  const clientId = String(req.body?.clientId ?? "").trim();

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

  if (!clientId) {
    res.status(400).json({ ok: false, error: "Le dossier client a supprimer est introuvable." });
    return;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const {
    data: { user },
    error: authError
  } = await admin.auth.getUser(accessToken);

  if (authError || !user?.id) {
    res.status(401).json({
      ok: false,
      error: "La session admin n'est plus valide. Reconnecte-toi puis recommence."
    });
    return;
  }

  const { data: profile, error: profileError } = await admin
    .from("users")
    .select("role, active")
    .eq("id", user.id)
    .single<{ role: string; active: boolean }>();

  if (profileError || !profile || profile.role !== "admin" || !profile.active) {
    res.status(403).json({
      ok: false,
      error: "Seul un admin actif peut supprimer un dossier client."
    });
    return;
  }

  const { error: deleteError } = await admin.from("clients").delete().eq("id", clientId);

  if (deleteError) {
    res.status(400).json({
      ok: false,
      error: deleteError.message || "Impossible de supprimer ce dossier client."
    });
    return;
  }

  res.status(200).json({ ok: true });
}
