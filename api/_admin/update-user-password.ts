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
  const userId = String(req.body?.userId ?? "").trim();
  const password = String(req.body?.password ?? "").trim();

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

  if (!userId || !password) {
    res.status(400).json({
      ok: false,
      error: "Le compte cible et le nouveau mot de passe sont obligatoires."
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
      error: "Seul un admin actif peut redefinir un mot de passe."
    });
    return;
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    password
  });

  if (updateError) {
    res.status(400).json({
      ok: false,
      error: updateError.message || "Impossible de redefinir ce mot de passe."
    });
    return;
  }

  res.status(200).json({ ok: true });
}
