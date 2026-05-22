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
  // Mode passive supervisor (chantier 2026-05-22 — fusionné dans cet endpoint
  // pour respecter la limite Vercel Hobby de 12 functions max par deploy).
  const isPassive = payload.mode === "passive_supervisor" || payload.isPassiveSupervisor === true;

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
  const prefix = isPassive ? "passive" : "external";
  const syntheticEmail = `${prefix}-${randomToken(12)}@${prefix}.labase360.local`;
  const syntheticPassword = `${prefix}-${randomToken(20)}`;

  const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
    email: syntheticEmail,
    password: syntheticPassword,
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

  // Si passive supervisor : génère + insère le token magic link
  let magicLink: string | null = null;
  let passiveToken: string | null = null;
  if (isPassive) {
    passiveToken = randomToken(28);
    const { error: tokenError } = await admin.from("passive_supervisor_accounts").insert({
      user_id: createdUser.user.id,
      token: passiveToken,
      created_by: requester.id,
    });
    if (tokenError) {
      console.error("[admin-create-external] passive token insert failed:", tokenError);
      // Best-effort cleanup
      try { await admin.auth.admin.deleteUser(createdUser.user.id); } catch { /* ignore */ }
      res.status(500).json({ ok: false, error: `Token magic link : ${tokenError.message}` });
      return;
    }
    // URL absolue via x-forwarded-host
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const proto = req.headers["x-forwarded-proto"] || "https";
    const origin = host ? `${proto}://${host}` : "";
    magicLink = origin
      ? `${origin}/distri-passif?token=${passiveToken}`
      : `/distri-passif?token=${passiveToken}`;
  }

  // Audit log (chantier #12 polish)
  await logAdminAction(admin, {
    actorUserId: requester.id,
    action: isPassive ? "passive_supervisor_created" : "external_distributor_created",
    targetId: createdUser.user.id,
    targetLabel: name,
    payload: { currentRank, sponsorId, isPassive },
    ip,
  });

  res.status(200).json({
    ok: true,
    userId: createdUser.user.id,
    name,
    currentRank,
    sponsorId,
    ...(isPassive ? { token: passiveToken, magicLink } : {}),
  });
}
