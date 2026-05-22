// =============================================================================
// admin-update-external-distributor (2026-05-22)
//
// Met à jour nom / rang HL / sponsor d'un distri externe existant.
// Sécurité : admin/référent actif. Le user cible doit être is_external=true.
// =============================================================================

import { createClient } from "@supabase/supabase-js";

const ALLOWED_RANKS = [
  "distributor_25",
  "senior_consultant_35",
  "success_builder_42",
  "supervisor_50",
  "active_supervisor_50",
  "world_team_50",
  "active_world_team_50",
  "get_team_50",
  "get_team_2500_50",
  "millionaire_50",
  "millionaire_7500_50",
  "presidents_50",
];

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Méthode non autorisée." });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authHeader = String(req.headers.authorization ?? "");
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ ok: false, error: "Variables Supabase manquantes." });
    return;
  }
  if (!accessToken) {
    res.status(401).json({ ok: false, error: "Session admin manquante." });
    return;
  }

  const payload = req.body ?? {};
  const userId = String(payload.userId ?? "").trim();
  const name = String(payload.name ?? "").trim();
  const currentRank = String(payload.currentRank ?? "").trim();
  const sponsorId = String(payload.sponsorId ?? "").trim() || null;

  if (!userId) {
    res.status(400).json({ ok: false, error: "userId requis." });
    return;
  }
  if (!name || name.length < 2) {
    res.status(400).json({ ok: false, error: "Nom requis (min 2 caractères)." });
    return;
  }
  if (!ALLOWED_RANKS.includes(currentRank)) {
    res.status(400).json({ ok: false, error: "Rang Herbalife invalide." });
    return;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user: requester },
    error: authError,
  } = await admin.auth.getUser(accessToken);
  if (authError || !requester?.id) {
    res.status(401).json({ ok: false, error: "Session admin invalide." });
    return;
  }

  const { data: profile } = await admin
    .from("users")
    .select("role, active")
    .eq("id", requester.id)
    .single<{ role: string; active: boolean }>();

  if (!profile || !["admin", "referent"].includes(profile.role) || !profile.active) {
    res.status(403).json({ ok: false, error: "Admin/référent actif requis." });
    return;
  }

  // Vérifie que la cible est bien un externe
  const { data: target, error: targetError } = await admin
    .from("users")
    .select("id, is_external")
    .eq("id", userId)
    .single<{ id: string; is_external: boolean }>();
  if (targetError || !target) {
    res.status(404).json({ ok: false, error: "Distri externe introuvable." });
    return;
  }
  if (!target.is_external) {
    res.status(400).json({ ok: false, error: "Modification réservée aux distri externes (créés via cette page)." });
    return;
  }

  // Sponsor check si fourni
  let sponsorName: string | null = null;
  if (sponsorId) {
    if (sponsorId === userId) {
      res.status(400).json({ ok: false, error: "Un distri ne peut pas être son propre sponsor." });
      return;
    }
    const { data: sponsor } = await admin
      .from("users")
      .select("id, name")
      .eq("id", sponsorId)
      .single<{ id: string; name: string }>();
    if (!sponsor) {
      res.status(400).json({ ok: false, error: "Sponsor introuvable." });
      return;
    }
    sponsorName = sponsor.name;
  }

  const { error: updateError } = await admin
    .from("users")
    .update({
      name,
      current_rank: currentRank,
      sponsor_id: sponsorId,
      sponsor_name: sponsorName,
    })
    .eq("id", userId);

  if (updateError) {
    res.status(400).json({ ok: false, error: updateError.message });
    return;
  }

  res.status(200).json({ ok: true });
}
