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

  // ⚠️ SON ACCÈS À L'APP NE PART PAS TOUT SEUL, et c'est le seul.
  //
  // 18 tables suivent en CASCADE quand on supprime un client (bilans, mesures,
  // visites, carte, cœurs, suivis…). `client_app_accounts` n'en fait PAS partie :
  // sa colonne `client_id` est en TEXT alors que `clients.id` est en UUID, donc
  // il n'y a aucune clé étrangère entre les deux — rien à quoi accrocher une
  // cascade.
  //
  // Conséquence mesurée le 19/08 : DEUX comptes orphelins traînaient déjà en
  // base, avec un jeton toujours actif. On le fait donc à la main, et AVANT la
  // suppression : si l'effacement du client échoue, on préfère un accès coupé
  // sur un dossier vivant (le coach régénère le lien) plutôt qu'un jeton en
  // liberté sur un dossier mort.
  const { error: accesError } = await admin
    .from("client_app_accounts")
    .delete()
    .eq("client_id", clientId);

  if (accesError) {
    res.status(400).json({
      ok: false,
      error: `Son accès à l'app n'a pas pu être retiré : ${accesError.message}. Rien n'a été supprimé.`
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
