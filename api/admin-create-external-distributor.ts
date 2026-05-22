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

// ─── Rate limit + audit inlined (Vercel ignore les fichiers commençant par _,
// les imports relatifs depuis _shared/ peuvent échouer en serverless build).
// Chantier #12 polish 2026-05-22.
const RATE_BUCKET = new Map<string, number[]>();
function checkRateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const history = (RATE_BUCKET.get(key) ?? []).filter((t) => now - t < windowMs);
  if (history.length >= max) {
    const oldest = history[0];
    return { ok: false as const, retryAfter: Math.ceil((oldest + windowMs - now) / 1000) };
  }
  history.push(now);
  RATE_BUCKET.set(key, history);
  return { ok: true as const };
}
function extractIp(req: any): string {
  const fwd = String(req.headers["x-forwarded-for"] ?? "");
  if (fwd) return fwd.split(",")[0].trim();
  return String(req.headers["x-real-ip"] ?? "unknown");
}
async function logAdminAction(sb: any, params: { actorUserId: string; action: string; targetId?: string | null; targetLabel?: string | null; payload?: Record<string, unknown> | null; ip?: string | null }) {
  try {
    await sb.rpc("log_admin_action", {
      p_actor_user_id: params.actorUserId,
      p_action: params.action,
      p_target_id: params.targetId ?? null,
      p_target_label: params.targetLabel ?? null,
      p_payload: params.payload ?? null,
      p_ip: params.ip ?? null,
    });
  } catch (err) {
    console.warn("[admin-audit] log_admin_action failed:", err);
  }
}

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
  // Global try/catch pour cracher la vraie erreur au lieu d'un 500 vide.
  try {
    return await handleImpl(req, res);
  } catch (err: any) {
    console.error("[admin-create-external] fatal:", err?.stack || err);
    res.status(500).json({
      ok: false,
      error: `Exception serveur : ${err?.message ?? String(err)}`,
    });
  }
}

async function handleImpl(req: any, res: any) {
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

  const payload = req.body ?? {};
  const ip = extractIp(req);
  const action = String(payload.action ?? "create");

  // Setup client + auth check (commun à toutes les actions)
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

  // ─── Action : update ───────────────────────────────────────────────────────
  if (action === "update") {
    const rl = checkRateLimit(`update-ext:${ip}`, 20, 60_000);
    if (!rl.ok) {
      res.status(429).json({ ok: false, error: `Trop de mises à jour. Réessaie dans ${rl.retryAfter}s.` });
      return;
    }
    const userId = String(payload.userId ?? "").trim();
    const upName = String(payload.name ?? "").trim();
    const upRank = String(payload.currentRank ?? "").trim();
    const upSponsorId = String(payload.sponsorId ?? "").trim() || null;
    if (!userId) return res.status(400).json({ ok: false, error: "userId requis." });
    if (!upName || upName.length < 2) return res.status(400).json({ ok: false, error: "Nom requis (min 2 caractères)." });
    if (!ALLOWED_RANKS.includes(upRank)) return res.status(400).json({ ok: false, error: "Rang Herbalife invalide." });
    const { data: target } = await admin.from("users").select("id, is_external").eq("id", userId).single<{ id: string; is_external: boolean }>();
    if (!target) return res.status(404).json({ ok: false, error: "Distri externe introuvable." });
    if (!target.is_external) return res.status(400).json({ ok: false, error: "Modification réservée aux distri externes." });
    let upSponsorName: string | null = null;
    if (upSponsorId) {
      if (upSponsorId === userId) return res.status(400).json({ ok: false, error: "Un distri ne peut pas être son propre sponsor." });
      const { data: sp } = await admin.from("users").select("id, name").eq("id", upSponsorId).single<{ id: string; name: string }>();
      if (!sp) return res.status(400).json({ ok: false, error: "Sponsor introuvable." });
      upSponsorName = sp.name;
    }
    const { error: updErr } = await admin.from("users").update({ name: upName, current_rank: upRank, sponsor_id: upSponsorId, sponsor_name: upSponsorName }).eq("id", userId);
    if (updErr) return res.status(400).json({ ok: false, error: updErr.message });
    await logAdminAction(admin, { actorUserId: requester.id, action: "external_distributor_updated", targetId: userId, targetLabel: upName, payload: { currentRank: upRank, sponsorId: upSponsorId }, ip });
    res.status(200).json({ ok: true });
    return;
  }

  // ─── Action : delete ───────────────────────────────────────────────────────
  if (action === "delete") {
    if (profile.role !== "admin") return res.status(403).json({ ok: false, error: "Admin actif requis pour supprimer un externe." });
    const rl = checkRateLimit(`delete-ext:${ip}`, 5, 60_000);
    if (!rl.ok) return res.status(429).json({ ok: false, error: `Trop de suppressions. Réessaie dans ${rl.retryAfter}s.` });
    const userId = String(payload.userId ?? "").trim();
    if (!userId) return res.status(400).json({ ok: false, error: "userId requis." });
    const { data: target } = await admin.from("users").select("id, name, is_external").eq("id", userId).single<{ id: string; name: string; is_external: boolean }>();
    if (!target) return res.status(404).json({ ok: false, error: "Distri externe introuvable." });
    if (!target.is_external) return res.status(400).json({ ok: false, error: "Suppression réservée aux distri externes." });
    const { count: childrenCount } = await admin.from("users").select("id", { count: "exact", head: true }).eq("sponsor_id", userId);
    if ((childrenCount ?? 0) > 0) return res.status(409).json({ ok: false, error: `Impossible de supprimer ${target.name} : ${childrenCount} distri pointent vers lui comme sponsor. Réassigne-les d'abord.` });
    const { count: clientsUplinkCount } = await admin.from("clients").select("id", { count: "exact", head: true }).eq("herbalife_uplink_user_id", userId);
    if ((clientsUplinkCount ?? 0) > 0) return res.status(409).json({ ok: false, error: `Impossible de supprimer ${target.name} : ${clientsUplinkCount} client(s) l'utilisent comme uplink HL.` });
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) return res.status(400).json({ ok: false, error: delErr.message });
    await logAdminAction(admin, { actorUserId: requester.id, action: "external_distributor_deleted", targetId: userId, targetLabel: target.name, payload: null, ip });
    res.status(200).json({ ok: true });
    return;
  }

  // ─── Action : create (par défaut) ──────────────────────────────────────────
  const rl = checkRateLimit(`create-ext:${ip}`, 10, 60_000);
  if (!rl.ok) {
    res.status(429).json({ ok: false, error: `Trop de créations. Réessaie dans ${rl.retryAfter}s.` });
    return;
  }
  const name = String(payload.name ?? "").trim();
  const currentRank = String(payload.currentRank ?? "").trim();
  const sponsorId = String(payload.sponsorId ?? "").trim() || null;
  // Mode passive supervisor V2 (chantier Light 2026-05-22) :
  // vrai compte distri avec email + password réels (au lieu d'auth synthétique).
  // L'admin reçoit en retour les credentials à transmettre via WhatsApp.
  const isPassive = payload.mode === "passive_supervisor" || payload.isPassiveSupervisor === true;
  const passiveEmail = isPassive ? String(payload.email ?? "").trim().toLowerCase() : "";

  if (!name || name.length < 2) {
    res.status(400).json({ ok: false, error: "Nom requis (min 2 caractères)." });
    return;
  }
  if (!ALLOWED_RANKS.includes(currentRank)) {
    res.status(400).json({ ok: false, error: "Rang Herbalife invalide." });
    return;
  }
  // Mode passive : restreint aux rangs Supervisor+ (50%)
  if (isPassive && !currentRank.endsWith("_50")) {
    res.status(400).json({ ok: false, error: "Mode passif réservé aux Supervisor 50%+." });
    return;
  }
  // Mode passive V2 : email réel obligatoire (pour login normal)
  if (isPassive) {
    if (!passiveEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(passiveEmail)) {
      res.status(400).json({ ok: false, error: "Email valide requis pour un compte passif." });
      return;
    }
  }

  // (admin client + auth check déjà faits en haut, communs à toutes les actions)

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

  // Auth.users : synthétique pour externe pur, vrai email + password généré
  // pour un passif (Light V2 — il se connecte sur /connexion comme un distri).
  let realEmail = "";
  let realPassword = "";
  let userEmail = "";
  if (isPassive) {
    realEmail = passiveEmail;
    realPassword = `LB360-${randomToken(8)}!`; // password fort lisible
    userEmail = realEmail;
  } else {
    userEmail = `external-${randomToken(12)}@external.labase360.local`;
  }
  const authPassword = isPassive ? realPassword : `ext-${randomToken(20)}`;

  const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
    email: userEmail,
    password: authPassword,
    email_confirm: true,
    user_metadata: { name, is_external: true, is_passive_supervisor: isPassive },
  });

  if (createError || !createdUser?.user) {
    console.error("[admin-create-external] auth.admin.createUser failed:", createError);
    res.status(400).json({
      ok: false,
      error: createError?.message ?? "auth.admin.createUser a échoué (vérifier service_role).",
    });
    return;
  }

  // Crée la ligne public.users (FK satisfaite). Pour les passifs : active=true
  // car ils ont un vrai compte qui se connecte (vs externes qui restent inactifs).
  const { error: insertError } = await admin.from("users").upsert({
    id: createdUser.user.id,
    name,
    email: userEmail,
    role: "distributor",
    current_rank: currentRank,
    sponsor_id: sponsorId,
    sponsor_name: sponsorName,
    active: isPassive ? true : false,
    is_external: true,
    is_passive_supervisor: isPassive,
    title: isPassive ? "Distri passif (Supervisor)" : "Distributeur externe (hors-app)",
    created_at: new Date().toISOString(),
  });

  if (insertError) {
    console.error("[admin-create-external] public.users upsert failed:", insertError);
    // Best-effort cleanup auth.users si profile insert échoue
    try {
      await admin.auth.admin.deleteUser(createdUser.user.id);
    } catch {
      /* ignore */
    }
    res.status(400).json({ ok: false, error: `Insert public.users : ${insertError.message}` });
    return;
  }

  // URL login (utile pour message WhatsApp côté admin)
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  const origin = host ? `${proto}://${host}` : "";
  const loginUrl = origin ? `${origin}/connexion` : "/connexion";

  // Audit log (chantier #12 polish) — ne JAMAIS log le password en clair
  await logAdminAction(admin, {
    actorUserId: requester.id,
    action: isPassive ? "passive_supervisor_created" : "external_distributor_created",
    targetId: createdUser.user.id,
    targetLabel: name,
    payload: { currentRank, sponsorId, isPassive, email: isPassive ? realEmail : null },
    ip,
  });

  res.status(200).json({
    ok: true,
    userId: createdUser.user.id,
    name,
    currentRank,
    sponsorId,
    ...(isPassive ? { email: realEmail, password: realPassword, loginUrl } : {}),
  });
}
