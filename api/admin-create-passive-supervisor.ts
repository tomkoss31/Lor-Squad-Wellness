// =============================================================================
// admin-create-passive-supervisor (chantier 2026-05-22)
//
// Crée un user "distri Supervisor passif" + génère un token magic link.
// Différent d'un externe : le passif est destiné à recevoir le lien et
// consulter ses gains. Pas d'auth Supabase utilisée, juste le token.
// =============================================================================

import { createClient } from "@supabase/supabase-js";

const ALLOWED_RANKS = [
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

function randomToken(length = 24) {
  const arr = new Uint8Array(length);
  globalThis.crypto?.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export default async function handler(req: any, res: any) {
  try {
    return await impl(req, res);
  } catch (err: any) {
    console.error("[passive-create] fatal:", err?.stack || err);
    res.status(500).json({ ok: false, error: `Exception : ${err?.message ?? String(err)}` });
  }
}

async function impl(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Méthode non autorisée." });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authHeader = String(req.headers.authorization ?? "");
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ ok: false, error: "Vars Supabase manquantes." });
    return;
  }
  if (!accessToken) {
    res.status(401).json({ ok: false, error: "Session admin manquante." });
    return;
  }

  const payload = req.body ?? {};
  const name = String(payload.name ?? "").trim();
  const currentRank = String(payload.currentRank ?? "").trim();
  const sponsorId = String(payload.sponsorId ?? "").trim() || null;

  if (!name || name.length < 2) {
    res.status(400).json({ ok: false, error: "Nom requis (≥ 2 chars)." });
    return;
  }
  if (!ALLOWED_RANKS.includes(currentRank)) {
    res.status(400).json({ ok: false, error: "Rang Herbalife invalide (Supervisor+ requis)." });
    return;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user: requester }, error: authError } = await admin.auth.getUser(accessToken);
  if (authError || !requester?.id) {
    res.status(401).json({ ok: false, error: "Session invalide." });
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

  // Sponsor check
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

  // Crée user synthétique (auth.users + public.users)
  const syntheticEmail = `passive-${randomToken(12)}@passive.labase360.local`;
  const syntheticPassword = `pass-${randomToken(16)}`;

  const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
    email: syntheticEmail,
    password: syntheticPassword,
    email_confirm: true,
    user_metadata: { name, is_passive_supervisor: true },
  });
  if (createError || !createdUser?.user) {
    console.error("[passive-create] auth.admin.createUser failed:", createError);
    res.status(400).json({ ok: false, error: createError?.message ?? "auth.admin.createUser KO" });
    return;
  }

  // Insert public.users avec flag passive
  const { error: insertError } = await admin.from("users").upsert({
    id: createdUser.user.id,
    name,
    email: syntheticEmail,
    role: "distributor",
    current_rank: currentRank,
    sponsor_id: sponsorId,
    sponsor_name: sponsorName,
    active: false, // pas un compte distri actif
    is_external: true, // toujours géré comme externe côté arborescence
    is_passive_supervisor: true,
    title: "Distri passif (Supervisor)",
    created_at: new Date().toISOString(),
  });
  if (insertError) {
    console.error("[passive-create] users upsert failed:", insertError);
    try { await admin.auth.admin.deleteUser(createdUser.user.id); } catch {}
    res.status(400).json({ ok: false, error: `Insert public.users : ${insertError.message}` });
    return;
  }

  // Génère token magic link
  const token = randomToken(28);
  const { error: tokenError } = await admin.from("passive_supervisor_accounts").insert({
    user_id: createdUser.user.id,
    token,
    created_by: requester.id,
  });
  if (tokenError) {
    console.error("[passive-create] token insert failed:", tokenError);
    res.status(500).json({ ok: false, error: `Token : ${tokenError.message}` });
    return;
  }

  // Magic link absolu : on récupère l'origine depuis la requête pour que le
  // lien soit copiable/partageable directement sans préfixage côté front.
  const origin = (() => {
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const proto = req.headers["x-forwarded-proto"] || "https";
    return host ? `${proto}://${host}` : "";
  })();

  res.status(200).json({
    ok: true,
    userId: createdUser.user.id,
    token,
    magicLink: origin ? `${origin}/distri-passif?token=${token}` : `/distri-passif?token=${token}`,
    name,
  });
}
