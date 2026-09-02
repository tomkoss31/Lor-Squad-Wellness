import { createClient } from "@supabase/supabase-js";

// =============================================================================
// admin-repair-user : outil admin multi-actions (réparer / promouvoir).
//
//  - (défaut, pas d'action)  : répare/recrée un profil applicatif public.users
//                              sur un compte Auth existant (flow historique).
//  - action:'lookup'  {email}: détecte l'état d'un membre (compte auth ? déjà
//                              coach ? fiche client ?) — pour le flux Promouvoir.
//  - action:'promote' {...}  : promeut un MEMBRE (client PWA / BBC) en
//                              distributeur en RÉUTILISANT son compte auth
//                              (garde email+mdp), pose « Jour 0 », ID Herbalife
//                              optionnel, rattachement fiche au sponsor optionnel.
//
// ⚠ Tout est ici (et pas dans un fichier séparé) pour rester sous le plafond de
//   12 fonctions serverless du plan Vercel Hobby.
// =============================================================================

type AuthUser = {
  id: string;
  email?: string | null;
  created_at?: string;
  user_metadata?: Record<string, unknown> | null;
};

function getTeamHierarchySetupError(error: { message?: string } | null | undefined) {
  const message = String(error?.message ?? "").toLowerCase();
  if (!message) return null;
  if (message.includes("sponsor_id") || message.includes("sponsor_name")) {
    return "Le rattachement d'equipe n'est pas encore active sur cette base Supabase. Lance le fichier supabase/fix-team-hierarchy.sql dans SQL Editor, puis recharge l'application.";
  }
  return null;
}

function deriveNameFromEmail(email: string) {
  const localPart = email.split("@")[0] ?? "";
  if (!localPart) return "Compte équipe";
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
  return error.code === "23505" || (msg.includes("slug") && msg.includes("coach"));
}

// Fix pagination : listUsers plafonne par page → on parcourt toutes les pages
// jusqu'à trouver l'email (avant : seulement les 500 premiers comptes).
//
// Typage volontairement STRUCTUREL (et non `ReturnType<typeof createClient>`) :
// les génériques de SupabaseClient changent d'une version à l'autre du SDK, et
// le client créé ici n'était pas assignable à ce type — build Vercel en erreur
// TS2345. On ne décrit que ce dont le helper a besoin.
type AuthUserLister = {
  auth: {
    admin: {
      listUsers: (params: { page: number; perPage: number }) => Promise<{
        data: { users: unknown[] } | null;
      }>;
    };
  };
};

async function findAuthUserByEmail(
  admin: AuthUserLister,
  email: string
): Promise<AuthUser | null> {
  const target = email.trim().toLowerCase();
  if (!target) return null;
  const perPage = 1000;
  for (let page = 1; page <= 100; page += 1) {
    const listed = await admin.auth.admin.listUsers({ page, perPage });
    const list = (listed.data?.users ?? []) as AuthUser[];
    const hit = list.find((u) => (u.email ?? "").toLowerCase() === target);
    if (hit) return hit;
    if (list.length < perPage) return null;
  }
  return null;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Methode non autorisee." });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authHeader = String(req.headers.authorization ?? "");
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ ok: false, error: "Les variables Supabase ne sont pas configurees sur le serveur." });
    return;
  }
  if (!accessToken) {
    res.status(401).json({ ok: false, error: "Session admin manquante." });
    return;
  }

  const payload = req.body ?? {};
  const action = String(payload.action ?? "").trim();
  const userId = String(payload.userId ?? "").trim();
  const email = String(payload.email ?? "").trim().toLowerCase();

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // ── Garde admin ────────────────────────────────────────────────────────────
  const {
    data: { user: requester },
    error: authError
  } = await admin.auth.getUser(accessToken);
  if (authError || !requester?.id) {
    res.status(401).json({ ok: false, error: "La session admin n'est plus valide. Reconnecte-toi puis recommence." });
    return;
  }
  const { data: profile, error: profileError } = await admin
    .from("users")
    .select("role, active")
    .eq("id", requester.id)
    .single<{ role: string; active: boolean }>();
  if (profileError || !profile || profile.role !== "admin" || !profile.active) {
    res.status(403).json({ ok: false, error: "Seul un admin actif peut reparer/promouvoir un acces." });
    return;
  }

  // ── Résolution du compte auth cible ─────────────────────────────────────────
  let authUser: AuthUser | null = userId
    ? ((await admin.auth.admin.getUserById(userId)).data.user as AuthUser | null) ?? null
    : null;
  if (!authUser && email) {
    authUser = await findAuthUserByEmail(admin, email);
  }

  // Fiche client liée (via compte PWA sur le même auth_user_id, sinon par email).
  //
  // ⚠️ CORRECTIF 02/09/2026 — CET ÉCRAN N'A JAMAIS RATTACHÉ UNE SEULE FICHE.
  //
  // Les deux branches demandaient `clients.name`, une colonne qui n'existe pas
  // (c'est `first_name` / `last_name`, et aucune migration ne l'a jamais créée).
  // Postgres répond `column "name" does not exist`, `data` vaut null, et l'écran
  // conclut « Aucune fiche client détectée — rien à rattacher ». Mesuré sur
  // Romane GAVROY : sa fiche existe, 11 bilans, son espace client est relié à
  // son compte — et l'écran ne la trouvait pas.
  //
  // L'erreur était invisible parce que `error` n'était jamais lu : un select
  // fautif et un membre sans fiche rendaient exactement la même chose. D'où le
  // `console.warn` — sans lui, la prochaine faute de colonne se rejouera à
  // l'identique, silencieusement.
  type FicheRow = { id: string; first_name: string | null; last_name: string | null; distributor_id: string | null };
  const COLONNES = "id, first_name, last_name, distributor_id";
  const composerNom = (f: FicheRow) =>
    [f.first_name, f.last_name].map((p) => (p ?? "").trim()).filter(Boolean).join(" ") || null;

  async function loadFiche(authId: string | null, byEmail: string) {
    if (authId) {
      // `limit(1)` avant `maybeSingle()` : un même compte peut porter deux
      // espaces client (réinvitation), et `maybeSingle` LÈVE au-delà d'une
      // ligne — ça retomberait sur « pas de fiche », le bug qu'on corrige.
      const { data: acc, error: accErr } = await admin
        .from("client_app_accounts")
        .select("client_id")
        .eq("auth_user_id", authId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle<{ client_id: string | null }>();
      if (accErr) console.warn("[promote] espace client illisible :", accErr.message);
      if (acc?.client_id) {
        const { data: fiche, error } = await admin
          .from("clients")
          .select(COLONNES)
          .eq("id", acc.client_id)
          .maybeSingle<FicheRow>();
        if (error) console.warn("[promote] fiche par espace client illisible :", error.message);
        if (fiche) return { id: fiche.id, name: composerNom(fiche), distributor_id: fiche.distributor_id };
      }
    }
    if (byEmail) {
      // Trois adresses portent DEUX fiches en base (mesuré le 02/09). Sans
      // `limit(1)`, ces personnes-là resteraient introuvables après le
      // correctif ci-dessus — même symptôme, autre cause. On prend la plus
      // ancienne : c'est la fiche historique, celle qui porte les bilans.
      const { data: fiche, error } = await admin
        .from("clients")
        .select(COLONNES)
        .ilike("email", byEmail)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle<FicheRow>();
      if (error) console.warn("[promote] fiche par email illisible :", error.message);
      if (fiche) return { id: fiche.id, name: composerNom(fiche), distributor_id: fiche.distributor_id };
    }
    return null;
  }

  // ── ACTION lookup (lecture seule) ───────────────────────────────────────────
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

  // ── ACTION promote (cas A : compte existant → casquette distributeur) ───────
  if (action === "promote") {
    if (!authUser?.id || !authUser.email) {
      res.status(200).json({ ok: false, code: "no_account", error: "Ce membre n'a pas encore de compte (mot de passe). Utilise l'invitation distributeur." });
      return;
    }
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
    // Sponsor = n'importe quel coach ACTIF (en MLM un distributeur peut parrainer).
    const { data: sponsor } = await admin
      .from("users")
      .select("id, name, active")
      .eq("id", sponsorId)
      .maybeSingle<{ id: string; name: string; active: boolean }>();
    if (!sponsor || !sponsor.active) {
      res.status(400).json({ ok: false, error: "Le sponsor sélectionné est introuvable ou inactif." });
      return;
    }

    const promoteName =
      String(payload.name ?? "").trim() ||
      String(authUser.user_metadata?.name ?? "").trim() ||
      deriveNameFromEmail(authUser.email);

    const herbalifeId = String(payload.herbalifeId ?? payload.herbalife_id ?? "").trim().toUpperCase();
    const promotePhone = String(payload.phone ?? "").trim();
    const promoteCity = String(payload.city ?? "").trim();

    const { error: promoteError } = await admin.from("users").upsert({
      id: authUser.id,
      name: promoteName,
      email: authUser.email.toLowerCase(),
      role: "distributor",
      sponsor_id: sponsorId,
      sponsor_name: sponsor.name,
      active: true,
      title: "Accès distributeur",
      herbalife_id: herbalifeId || null,
      phone: promotePhone || null,
      city: promoteCity || null,
      // Ancre « Jour 0 » = moment de la promotion (compteur « Jour X / 90 » du
      // cockpit démarrage, comme un vrai nouveau distri).
      starter_started_at: new Date().toISOString(),
      created_at: authUser.created_at ?? new Date().toISOString()
    });

    if (promoteError) {
      if (isSlugCollision(promoteError)) {
        res.status(200).json({ ok: false, code: "slug_collision", error: promoteError.message || "Ce prénom est déjà pris. Ajoute une initiale (ex « Marie L. »)." });
        return;
      }
      res.status(400).json({ ok: false, error: promoteError.message || "Impossible de créer le profil distributeur." });
      return;
    }

    // Rattacher la fiche au sponsor si demandé (sinon elle reste chez son coach).
    let ficheReassigned = false;
    if (String(payload.ficheOwner ?? "keep").trim() === "sponsor") {
      const fiche = await loadFiche(authUser.id, authUser.email);
      // loadFiche renvoie la ligne brute : le propriétaire est `distributor_id`
      // (c'est l'action `lookup` qui l'expose sous le nom `currentOwnerId`).
      // Lire `currentOwnerId` ici donnait undefined → le garde-fou « déjà chez
      // le bon sponsor » ne filtrait jamais rien.
      if (fiche?.id && fiche.distributor_id !== sponsorId) {
        const { error: reassignError } = await admin
          .from("clients")
          .update({ distributor_id: sponsorId })
          .eq("id", fiche.id);
        ficheReassigned = !reassignError;
      }
    }

    await admin.auth.admin.updateUserById(authUser.id, {
      user_metadata: {
        ...(authUser.user_metadata ?? {}),
        name: promoteName,
        role: "distributor",
        sponsor_id: sponsorId
      }
    });

    res.status(200).json({ ok: true, mode: "promoted", ficheReassigned, name: promoteName });
    return;
  }

  // ── DÉFAUT : réparation d'un profil applicatif (flow historique, inchangé) ──
  const requestedName = String(payload.name ?? "").trim();
  const role =
    payload.role === "admin" || payload.role === "referent" ? payload.role : "distributor";
  const sponsorId = String(payload.sponsorId ?? "").trim();
  const active = Boolean(payload.active);

  if (!email && !userId) {
    res.status(400).json({ ok: false, error: "Ajoute au moins un email ou un identifiant Supabase." });
    return;
  }
  if (!authUser?.id || !authUser.email) {
    res.status(404).json({ ok: false, error: "Le compte Auth correspondant est introuvable sur Supabase." });
    return;
  }

  let sponsorName: string | null = null;
  if (role === "distributor" && sponsorId) {
    const { data: sponsor } = await admin
      .from("users")
      .select("id, name, role, active")
      .eq("id", sponsorId)
      .single<{ id: string; name: string; role: string; active: boolean }>();
    if (!sponsor || !sponsor.active || !["admin", "referent"].includes(sponsor.role)) {
      res.status(400).json({ ok: false, error: "Le sponsor d'equipe selectionne est introuvable." });
      return;
    }
    sponsorName = sponsor.name;
  }

  const name =
    requestedName ||
    String(authUser.user_metadata?.name ?? "").trim() ||
    deriveNameFromEmail(authUser.email);

  const title =
    role === "admin"
      ? "Pilotage global"
      : role === "referent"
        ? "Referent d'equipe"
        : "Portefeuille terrain";

  const { error: upsertError } = await admin.from("users").upsert({
    id: authUser.id,
    name,
    email: authUser.email.toLowerCase(),
    role,
    sponsor_id: role === "distributor" ? sponsorId || null : null,
    sponsor_name: role === "distributor" ? sponsorName : null,
    active,
    title,
    created_at: authUser.created_at ?? new Date().toISOString()
  });

  if (upsertError) {
    res.status(400).json({
      ok: false,
      error: getTeamHierarchySetupError(upsertError) || upsertError.message || "Impossible de recreer le profil applicatif."
    });
    return;
  }

  await admin.auth.admin.updateUserById(authUser.id, {
    user_metadata: {
      ...authUser.user_metadata,
      name,
      role,
      sponsor_id: role === "distributor" ? sponsorId || null : null
    }
  });

  res.status(200).json({ ok: true });
}
