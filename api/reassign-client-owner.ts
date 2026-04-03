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
  const distributorId = String(req.body?.distributorId ?? "").trim();

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({
      ok: false,
      error: "Les variables Supabase ne sont pas configurees sur le serveur."
    });
    return;
  }

  if (!accessToken) {
    res.status(401).json({ ok: false, error: "Session manquante." });
    return;
  }

  if (!clientId || !distributorId) {
    res.status(400).json({ ok: false, error: "Le dossier ou le nouveau responsable manque." });
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
      error: "La session n'est plus valide. Reconnecte-toi puis recommence."
    });
    return;
  }

  const { data: profile, error: profileError } = await admin
    .from("users")
    .select("id, role, active")
    .eq("id", requester.id)
    .single<{ id: string; role: string; active: boolean }>();

  if (profileError || !profile || !profile.active) {
    res.status(403).json({ ok: false, error: "Le profil actif est introuvable." });
    return;
  }

  const { data: targetOwner, error: targetOwnerError } = await admin
    .from("users")
    .select("id, name, role, active, sponsor_id")
    .eq("id", distributorId)
    .single<{
      id: string;
      name: string;
      role: string;
      active: boolean;
      sponsor_id?: string | null;
    }>();

  if (targetOwnerError || !targetOwner || !targetOwner.active) {
    res.status(404).json({ ok: false, error: "Le nouveau responsable est introuvable." });
    return;
  }

  const { data: targetClient, error: targetClientError } = await admin
    .from("clients")
    .select("id, distributor_id")
    .eq("id", clientId)
    .single<{ id: string; distributor_id: string }>();

  if (targetClientError || !targetClient) {
    res.status(404).json({ ok: false, error: "Le dossier client est introuvable." });
    return;
  }

  let canReassign = profile.role === "admin";

  if (!canReassign && profile.role === "referent") {
    const { data: currentOwner } = await admin
      .from("users")
      .select("sponsor_id")
      .eq("id", targetClient.distributor_id)
      .single<{ sponsor_id?: string | null }>();

    canReassign =
      targetOwner.id === profile.id ||
      targetOwner.sponsor_id === profile.id ||
      currentOwner?.sponsor_id === profile.id;
  }

  if (!canReassign) {
    res.status(403).json({
      ok: false,
      error: "Tu ne peux pas reattribuer ce dossier en dehors de ton perimetre."
    });
    return;
  }

  const { error: clientUpdateError } = await admin
    .from("clients")
    .update({
      distributor_id: targetOwner.id,
      distributor_name: targetOwner.name
    })
    .eq("id", clientId);

  if (clientUpdateError) {
    res.status(400).json({
      ok: false,
      error: clientUpdateError.message || "Impossible de mettre a jour ce dossier."
    });
    return;
  }

  const { error: pvProductsUpdateError } = await admin
    .from("pv_client_products")
    .update({
      responsible_id: targetOwner.id,
      responsible_name: targetOwner.name
    })
    .eq("client_id", clientId)
    .eq("active", true);

  if (pvProductsUpdateError && !pvProductsUpdateError.message?.includes("pv_client_products")) {
    res.status(400).json({
      ok: false,
      error: pvProductsUpdateError.message || "Le dossier a bouge, mais pas le suivi produits."
    });
    return;
  }

  res.status(200).json({ ok: true });
}
