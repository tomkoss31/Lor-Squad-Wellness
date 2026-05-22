// =============================================================================
// admin-create-external-distributor (2026-05-21)
//
// Crée un distri "externe" dans public.users : nom + rang + sponsor, sans
// email/password utilisable. Utile pour reconstruire l'arborescence
// Herbalife historique (downline jamais inscrite sur l'app).
//
// Sécurité : seul un admin actif peut créer un externe. L'utilisateur
// créé ne peut pas se connecter (email synthétique, pas d'invite envoyée).
// =============================================================================

import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, extractIp, logAdminAction } from "./_shared/admin-guard";

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

function randomToken(length = 16) {
  const arr = new Uint8Array(length);
  globalThis.crypto?.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

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
    res.status(500).json({ ok: false, error: "Variables Supabase manquantes côté serveur." });
    return;
  }
  if (!accessToken) {
    res.status(401).json({ ok: false, error: "Session admin manquante." });
    return;
  }

  // Rate limit (chantier #12 polish) : 10 créations / minute / IP max
  const ip = extractIp(req);
  const rl = checkRateLimit(`create-ext:${ip}`, 10, 60_000);
  if (!rl.ok) {
    res.status(429).json({ ok: false, error: `Trop de créations. Réessaie dans ${rl.retryAfter}s.` });
    return;
  }

  const payload = req.body ?? {};
  const name = String(payload.name ?? "").trim();
  const currentRank = String(payload.currentRank ?? "").trim();
  const sponsorId = String(payload.sponsorId ?? "").trim() || null;

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

  // Vérifie que le caller est admin actif
  const {
    data: { user: requester },
    error: authError,
  } = await admin.auth.getUser(accessToken);

  if (authError || !requester?.id) {
    res.status(401).json({ ok: false, error: "Session admin invalide." });
    return;
  }

  const { data: profile, error: profileError } = await admin
    .from("users")
    .select("role, active")
    .eq("id", requester.id)
    .single<{ role: string; active: boolean }>();

  if (profileError || !profile || !["admin", "referent"].includes(profile.role) || !profile.active) {
    res.status(403).json({ ok: false, error: "Seul un admin/référent actif peut ajouter un distri externe." });
    return;
  }

  // Si sponsorId fourni, vérifier qu'il existe
  let sponsorName: string | null = null;
  if (sponsorId) {
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

  // Crée un auth.users synthétique (FK contrainte sur public.users.id)
  // Email + password aléatoires, jamais transmis → l'externe ne peut pas
  // se connecter. email_confirm true pour éviter l'envoi de mail.
  const syntheticEmail = `external-${randomToken(12)}@external.labase360.local`;
  const syntheticPassword = `ext-${randomToken(20)}`;

  const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
    email: syntheticEmail,
    password: syntheticPassword,
    email_confirm: true,
    user_metadata: { name, is_external: true },
  });

  if (createError || !createdUser?.user) {
    res.status(400).json({
      ok: false,
      error: createError?.message ?? "Impossible de créer le distri externe.",
    });
    return;
  }

  // Crée la ligne public.users (FK satisfaite)
  const { error: insertError } = await admin.from("users").upsert({
    id: createdUser.user.id,
    name,
    email: syntheticEmail,
    role: "distributor",
    current_rank: currentRank,
    sponsor_id: sponsorId,
    sponsor_name: sponsorName,
    active: false,
    is_external: true,
    title: "Distributeur externe (hors-app)",
    created_at: new Date().toISOString(),
  });

  if (insertError) {
    // Best-effort cleanup auth.users si profile insert échoue
    try {
      await admin.auth.admin.deleteUser(createdUser.user.id);
    } catch {
      /* ignore */
    }
    res.status(400).json({ ok: false, error: insertError.message });
    return;
  }

  // Audit log (chantier #12 polish)
  await logAdminAction(admin, {
    actorUserId: requester.id,
    action: "external_distributor_created",
    targetId: createdUser.user.id,
    targetLabel: name,
    payload: { currentRank, sponsorId },
    ip,
  });

  res.status(200).json({
    ok: true,
    userId: createdUser.user.id,
    name,
    currentRank,
    sponsorId,
  });
}
