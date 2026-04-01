import { createClient } from "@supabase/supabase-js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Methode non autorisee." });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({
      ok: false,
      error: "Les variables Supabase ne sont pas configurees sur le serveur."
    });
    return;
  }

  const payload = req.body ?? {};
  const name = String(payload.name ?? "").trim();
  const email = String(payload.email ?? "").trim().toLowerCase();
  const role = payload.role === "admin" ? "admin" : "distributor";
  const active = Boolean(payload.active);
  const password = String(payload.mockPassword ?? "").trim();

  if (!name || !email || !password) {
    res.status(400).json({
      ok: false,
      error: "Nom, email et mot de passe provisoire sont obligatoires."
    });
    return;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name,
      role
    }
  });

  if (createError || !createdUser.user) {
    res.status(400).json({
      ok: false,
      error: createError?.message ?? "Impossible de creer cet utilisateur."
    });
    return;
  }

  const { error: profileError } = await admin.from("users").upsert({
    id: createdUser.user.id,
    name,
    email,
    role,
    active,
    title: role === "admin" ? "Administration" : "Acces distributeur",
    created_at: new Date().toISOString()
  });

  if (profileError) {
    res.status(400).json({
      ok: false,
      error: profileError.message
    });
    return;
  }

  res.status(200).json({ ok: true });
}
