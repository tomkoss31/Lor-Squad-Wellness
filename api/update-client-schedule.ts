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
  const nextFollowUp = String(req.body?.nextFollowUp ?? "").trim();
  const followUpId = String(req.body?.followUpId ?? "").trim();
  const followUpType = String(req.body?.followUpType ?? "").trim();
  const followUpStatus = String(req.body?.followUpStatus ?? "").trim();

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({
      ok: false,
      error: "Les variables Supabase ne sont pas configurees sur le serveur."
    });
    return;
  }

  if (!accessToken) {
    res.status(401).json({ ok: false, error: "Session introuvable." });
    return;
  }

  if (!clientId || !nextFollowUp) {
    res.status(400).json({
      ok: false,
      error: "Le rendez-vous a modifier est introuvable."
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
    data: { user },
    error: authError
  } = await admin.auth.getUser(accessToken);

  if (authError || !user?.id) {
    res.status(401).json({
      ok: false,
      error: "La session n'est plus valide. Reconnecte-toi puis recommence."
    });
    return;
  }

  const { data: profile, error: profileError } = await admin
    .from("users")
    .select("id, role, active")
    .eq("id", user.id)
    .single<{ id: string; role: string; active: boolean }>();

  if (profileError || !profile || !profile.active) {
    res.status(403).json({
      ok: false,
      error: "Le profil utilisateur est introuvable ou inactif."
    });
    return;
  }

  const { data: clientRecord, error: clientError } = await admin
    .from("clients")
    .select("id, distributor_id")
    .eq("id", clientId)
    .single<{ id: string; distributor_id: string }>();

  if (clientError || !clientRecord) {
    res.status(404).json({ ok: false, error: "Le dossier client est introuvable." });
    return;
  }

  let canEdit = profile.role === "admin" || clientRecord.distributor_id === profile.id;

  if (!canEdit && profile.role === "referent") {
    const { data: ownerProfile } = await admin
      .from("users")
      .select("sponsor_id")
      .eq("id", clientRecord.distributor_id)
      .single<{ sponsor_id?: string | null }>();

    canEdit = ownerProfile?.sponsor_id === profile.id;
  }

  if (!canEdit) {
    res.status(403).json({
      ok: false,
      error: "Tu n'as pas les droits pour modifier ce rendez-vous."
    });
    return;
  }

  const { error: clientUpdateError } = await admin
    .from("clients")
    .update({ next_follow_up: nextFollowUp })
    .eq("id", clientId);

  if (clientUpdateError) {
    res.status(400).json({
      ok: false,
      error: clientUpdateError.message || "Impossible de modifier la date du prochain rendez-vous."
    });
    return;
  }

  let followUpQuery = admin.from("follow_ups").update({
    due_date: nextFollowUp,
    ...(followUpType ? { type: followUpType } : {}),
    ...(followUpStatus ? { status: followUpStatus } : {})
  });

  if (followUpId) {
    followUpQuery = followUpQuery.eq("id", followUpId);
  } else {
    followUpQuery = followUpQuery.eq("client_id", clientId);
  }

  const { error: followUpUpdateError } = await followUpQuery;

  if (followUpUpdateError) {
    res.status(400).json({
      ok: false,
      error: followUpUpdateError.message || "Le rendez-vous a ete modifie, mais pas le suivi associe."
    });
    return;
  }

  res.status(200).json({ ok: true });
}
