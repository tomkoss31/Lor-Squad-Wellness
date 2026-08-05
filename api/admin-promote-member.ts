import { createClient } from "@supabase/supabase-js";

// =============================================================================
// Chantier « Promouvoir en distributeur » (2026-08-05)
//
// Promeut un MEMBRE existant (client PWA / membre BBC) en distributeur en
// RÉUTILISANT son compte auth (il garde son email + mot de passe). Ne crée
// JAMAIS de 2e compte auth — c'est la différence avec l'invitation distri
// (consume-distributor-invite-token) qui échoue en 409 si l'email existe déjà.
//
// Admin only. Deux actions :
//   { action: 'lookup',  email }
//       → détecte l'état : a-t-il un compte auth ? est-il déjà coach ? a-t-il
//         une fiche client (et qui en est propriétaire) ?
//   { action: 'promote', email|userId, sponsorId, name?, ficheOwner? }
//       → crée la ligne coach (role='distributor', active) sur son compte auth.
//         ficheOwner: 'keep' (défaut, la fiche reste chez son coach actuel) |
//         'sponsor' (rattache la fiche au sponsor pour qu'il fasse le suivi).
//
// Le suivi de poids / la fiche client ne sont JAMAIS supprimés : la ligne
// clients + client_app_accounts reste intacte, seul distributor_id peut bouger.
// =============================================================================

type AuthUser = {
  id: string;
  email?: string | null;
  created_at?: string;
  user_metadata?: Record<string, unknown> | null;
};

// Fix limite pagination : listUsers plafonne à ~1000/page. On parcourt toutes
// les pages jusqu'à trouver l'email (l'ancien admin-repair-user ne lisait que
// les 500 premiers → introuvable au-delà).
async function findAuthUserByEmail(
  admin: ReturnType<typeof createClient>,
  email: string
): Promise<AuthUser | null> {
  const target = email.trim().toLowerCase();
  if (!target) return null;
  const perPage = 1000;
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) return null;
    const list = (data?.users ?? []) as AuthUser[];
    const hit = list.find((u) => (u.email ?? "").toLowerCase() === target);
    if (hit) return hit;
    if (list.length < perPage) return null; // dernière page atteinte
  }
  return null;
}

function deriveNameFromEmail(email: string) {
  const localPart = email.split("@")[0] ?? "";
  if (!localPart) return "Nouveau distributeur";
  return localPart
    .replace(/[._-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

// Le trigger _check_coach_slug_unique lève une unique_violation avec un message
// déjà rédigé pour l'humain (« Ajoute une initiale au prénom, ex Marie L. »).
function isSlugCollision(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  const msg = String(error.message ?? "").toLowerCase();
  return (
    error.code === "23505" ||
    msg.includes("slug coach") ||
    (msg.includes("slug") && msg.includes("coach"))
  );
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
    res.status(500).json({ ok: false, error: "Les variables Supabase ne sont pas configurées sur le serveur." });
    return;
  }
  if (!accessToken) {
    res.status(401).json({ ok: false, error: "Session admin manquante." });
    return;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // ── Garde admin : seul un admin actif peut promouvoir ─────────────────────
  const {
    data: { user: requester },
    error: authError
  } = await admin.auth.getUser(accessToken);
  if (authError || !requester?.id) {
    res.status(401).json({ ok: false, error: "La session admin n'est plus valide. Reconnecte-toi puis recommence." });
    return;
  }
  const { data: requesterProfile } = await admin
    .from("users")
    .select("role, active")
    .eq("id", requester.id)
    .single<{ role: string; active: boolean }>();
  if (!requesterProfile || requesterProfile.role !== "admin" || !requesterProfile.active) {
    res.status(403).json({ ok: false, error: "Seul un admin actif peut promouvoir un membre." });
    return;
  }

  const payload = req.body ?? {};
  const action = String(payload.action ?? "").trim();
  const email = String(payload.email ?? "").trim().toLowerCase();
  const userId = String(payload.userId ?? "").trim();

  // ── Résolution du compte auth cible ───────────────────────────────────────
  let authUser: AuthUser | null = userId
    ? ((await admin.auth.admin.getUserById(userId)).data.user as AuthUser | null) ?? null
    : null;
  if (!authUser && email) {
    authUser = await findAuthUserByEmail(admin, email);
  }

  // Fiche client liée (via le compte auth) : owner actuel + résumé
  async function loadFiche(authId: string | null, byEmail: string) {
    // 1) via le compte PWA rattaché au même auth_user_id
    if (authId) {
      const { data: acc } = await admin
        .from("client_app_accounts")
        .select("client_id")
        .eq("auth_user_id", authId)
        .maybeSingle<{ client_id: string | null }>();
      if (acc?.client_id) {
        const { data: fiche } = await admin
          .from("clients")
          .select("id, name, distributor_id")
          .eq("id", acc.client_id)
          .maybeSingle<{ id: string; name: string | null; distributor_id: string | null }>();
        if (fiche) return fiche;
      }
    }
    // 2) fallback par email de fiche (token-only jamais connecté)
    if (byEmail) {
      const { data: fiche } = await admin
        .from("clients")
        .select("id, name, distributor_id")
        .ilike("email", byEmail)
        .maybeSingle<{ id: string; name: string | null; distributor_id: string | null }>();
      if (fiche) return fiche;
    }
    return null;
  }

  // ── ACTION lookup : détecte l'état, ne modifie rien ───────────────────────
  if (action === "lookup") {
    if (!email && !userId) {
      res.status(400).json({ ok: false, error: "Renseigne un email." });
      return;
    }
    const hasAuth = !!authUser?.id;
    let isCoach = false;
    let coachRole: string | null = null;
    if (hasAuth) {
      const { data: existing } = await admin
        .from("users")
        .select("role")
        .eq("id", authUser!.id)
        .maybeSingle<{ role: string }>();
      isCoach = !!existing;
      coachRole = existing?.role ?? null;
    }
    const fiche = await loadFiche(authUser?.id ?? null, email);
    res.status(200).json({
      ok: true,
      hasAuth,
      isCoach,
      coachRole,
      suggestedName:
        (authUser?.user_metadata?.name as string | undefined)?.trim() ||
        fiche?.name ||
        (authUser?.email ? deriveNameFromEmail(authUser.email) : ""),
      fiche: fiche
        ? { clientId: fiche.id, name: fiche.name, currentOwnerId: fiche.distributor_id }
        : null
    });
    return;
  }

  // ── ACTION promote : crée la casquette coach (cas A, compte existant) ─────
  if (action === "promote") {
    if (!authUser?.id || !authUser.email) {
      // Pas de compte auth → cas B : l'UI bascule sur l'invitation distributeur.
      res.status(200).json({ ok: false, code: "no_account", error: "Ce membre n'a pas encore de compte (mot de passe). Utilise l'invitation distributeur." });
      return;
    }

    // Déjà coach ?
    const { data: existing } = await admin
      .from("users")
      .select("id, role")
      .eq("id", authUser.id)
      .maybeSingle<{ id: string; role: string }>();
    if (existing) {
      res.status(200).json({ ok: false, code: "already_coach", error: `Ce compte est déjà coach (rôle ${existing.role}).` });
      return;
    }

    const sponsorId = String(payload.sponsorId ?? "").trim();
    if (!sponsorId) {
      res.status(400).json({ ok: false, error: "Choisis un sponsor (upline)." });
      return;
    }
    // Sponsor = n'importe quel coach ACTIF (admin/referent/distributor) — en MLM
    // un distributeur peut parrainer (ex. Peter parrainé par Victoria).
    const { data: sponsor } = await admin
      .from("users")
      .select("id, name, active")
      .eq("id", sponsorId)
      .maybeSingle<{ id: string; name: string; active: boolean }>();
    if (!sponsor || !sponsor.active) {
      res.status(400).json({ ok: false, error: "Le sponsor sélectionné est introuvable ou inactif." });
      return;
    }

    const name =
      String(payload.name ?? "").trim() ||
      String(authUser.user_metadata?.name ?? "").trim() ||
      deriveNameFromEmail(authUser.email);

    const { error: upsertError } = await admin.from("users").upsert({
      id: authUser.id,
      name,
      email: authUser.email.toLowerCase(),
      role: "distributor",
      sponsor_id: sponsorId,
      sponsor_name: sponsor.name,
      active: true,
      title: "Portefeuille terrain",
      created_at: authUser.created_at ?? new Date().toISOString()
    });

    if (upsertError) {
      if (isSlugCollision(upsertError)) {
        res.status(200).json({
          ok: false,
          code: "slug_collision",
          error:
            upsertError.message ||
            "Ce prénom est déjà pris par une autre coach active. Ajoute une initiale (ex « Marie L. »)."
        });
        return;
      }
      res.status(400).json({ ok: false, error: upsertError.message || "Impossible de créer le profil distributeur." });
      return;
    }

    // Rattacher la fiche au sponsor si demandé (sinon elle reste chez son coach
    // actuel — cf. Peter/Victoria : si Victoria a fait le bilan, elle en est déjà
    // propriétaire, on ne bouge rien).
    let ficheReassigned = false;
    const ficheOwner = String(payload.ficheOwner ?? "keep").trim();
    if (ficheOwner === "sponsor") {
      const fiche = await loadFiche(authUser.id, authUser.email);
      if (fiche?.id && fiche.currentOwnerId !== sponsorId) {
        const { error: reassignError } = await admin
          .from("clients")
          .update({ distributor_id: sponsorId })
          .eq("id", fiche.id);
        ficheReassigned = !reassignError;
      }
    }

    // Sync des métadonnées auth (comme admin-repair-user)
    await admin.auth.admin.updateUserById(authUser.id, {
      user_metadata: {
        ...(authUser.user_metadata ?? {}),
        name,
        role: "distributor",
        sponsor_id: sponsorId
      }
    });

    res.status(200).json({ ok: true, mode: "promoted", ficheReassigned, name });
    return;
  }

  res.status(400).json({ ok: false, error: "Action inconnue." });
}
