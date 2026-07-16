import { createClient } from "@supabase/supabase-js";

// ⚠️ Duplication assumee de src/data/pvCatalog.ts (cette API tourne cote Vercel
// et ne peut pas importer le front). TOUTE modif ici doit etre repercutee la-bas
// et inversement. Aligne le 2026-07-16 (audit programmes) : ajout de "unit"
// (routine VIDE) + alias des ids legacy "p-*" qui existent reellement en base.
const pvPrograms = [
  {
    id: "starter",
    title: "Programme Starter",
    alias: [
      "Programme Decouverte",
      "Programme Starter",
      "Decouverte",
      "Découverte",
      "Starter",
      "p-discovery",
      "discovery"
    ]
  },
  {
    id: "premium",
    title: "Programme Premium",
    alias: ["Programme Premium", "Premium", "p-premium"]
  },
  {
    id: "booster-1",
    title: "Programme Booster 1",
    alias: ["Programme Booster 1", "Booster 1", "p-booster1", "booster1"]
  },
  {
    id: "booster-2",
    title: "Programme Booster 2",
    alias: ["Programme Booster 2", "Booster 2", "p-booster2", "booster2"]
  },
  {
    id: "custom",
    title: "Suivi personnalise",
    alias: ["Suivi personnalise", "Suivi personnalisé", "Personnalise", "Personnalisé"]
  },
  {
    id: "unit",
    title: "À l'unité",
    alias: [
      "À l'unité",
      "A l'unite",
      "Unite",
      "Unité",
      "A la carte",
      "À la carte",
      "p-unit",
      "unit"
    ]
  }
];

const pvProgramProducts: Record<string, string[]> = {
  starter: ["aloe-vera", "the-51g", "formula-1"],
  premium: ["aloe-vera", "the-51g", "formula-1", "pdm"],
  "booster-1": ["aloe-vera", "the-51g", "formula-1", "pdm", "multifibres"],
  "booster-2": ["aloe-vera", "the-51g", "formula-1", "pdm", "phyto-brule-graisse"],
  custom: ["formula-1"],
  // Vente a l'unite : AUCUNE routine imposee (cf. pvCatalog.ts). Doit rester vide.
  unit: []
};

const pvProductCatalog = [
  {
    id: "formula-1",
    name: "Formula 1",
    pv: 23.95,
    pricePublic: 63.5,
    quantiteLabel: "21 doses",
    dureeReferenceJours: 21,
    noteMetier: "En pratique, 1 pot = 21 jours de reference dans le suivi."
  },
  {
    id: "pdm",
    name: "Melange pour boisson proteinee",
    pv: 33,
    pricePublic: 75,
    quantiteLabel: "42 doses",
    dureeReferenceJours: 42,
    noteMetier: "Reference simple de 1 dose / jour sur 42 jours."
  },
  {
    id: "the-51g",
    name: "Boisson instantanee a base de the 51 g",
    pv: 19.95,
    pricePublic: 41,
    quantiteLabel: "51 g",
    dureeReferenceJours: 21,
    noteMetier:
      "Meme logique terrain que l'aloe : au-dela de 21 jours, la routine n'a pas ete tenue."
  },
  {
    id: "aloe-vera",
    name: "Boisson Aloe Vera",
    pv: 24.95,
    pricePublic: 54.5,
    quantiteLabel: "473 ml",
    dureeReferenceJours: 21,
    noteMetier:
      "Dans le suivi, au-dela de 21 jours on considere l'hydratation comme mal tenue."
  },
  {
    id: "multifibres",
    name: "Boisson multifibres",
    pv: 22.95,
    pricePublic: 43.5,
    quantiteLabel: "30 doses",
    dureeReferenceJours: 30,
    noteMetier: "Reference simple de 30 jours."
  },
  {
    id: "phyto-brule-graisse",
    name: "Phyto Complete",
    pv: 38.15,
    pricePublic: 90,
    quantiteLabel: "60 gelules",
    dureeReferenceJours: 30,
    noteMetier: "Reference simple de 30 jours."
  },
  {
    id: "microbiotic-max",
    name: "Microbiotic Max",
    pv: 27.1,
    pricePublic: 64.5,
    quantiteLabel: "30 jours",
    dureeReferenceJours: 30,
    noteMetier: "Soutien digestif simple sur 30 jours."
  },
  {
    id: "night-mode",
    name: "Night Mode",
    pv: 31.25,
    pricePublic: 69,
    quantiteLabel: "30 jours",
    dureeReferenceJours: 30,
    noteMetier: "Repere routine du soir sur 30 jours."
  },
  {
    id: "xtra-cal",
    name: "Xtra-Cal",
    pv: 10.25,
    pricePublic: 24.5,
    quantiteLabel: "30 jours",
    dureeReferenceJours: 30,
    noteMetier: "Repere simple autour du calcium."
  },
  {
    id: "beta-heart",
    name: "Beta Heart",
    pv: 25.95,
    pricePublic: 57.5,
    quantiteLabel: "30 jours",
    dureeReferenceJours: 30,
    noteMetier: "Repere complementaire quand la lecture viscerale ressort."
  },
  {
    id: "protein-bars",
    name: "Barres aux proteines",
    pv: 13.22,
    pricePublic: 31.5,
    quantiteLabel: "14 jours",
    dureeReferenceJours: 14,
    noteMetier: "Encas cadre pour les fringales et les deplacements."
  },
  {
    id: "liftoff",
    name: "LiftOff",
    pv: 15.95,
    pricePublic: 39.5,
    quantiteLabel: "10 jours",
    dureeReferenceJours: 10,
    noteMetier: "Impulsion simple quand l'energie manque."
  },
  {
    id: "h24-hydrate",
    name: "Herbalife24 Hydrate",
    pv: 17.2,
    pricePublic: 47.5,
    quantiteLabel: "20 jours",
    dureeReferenceJours: 20,
    noteMetier: "Repere hydratation plus marque en soutien."
  }
];

function normalizeProgramLabel(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function resolvePvProgramId(programTitleOrId: string | null | undefined) {
  const normalized = normalizeProgramLabel(programTitleOrId);

  const exact =
    pvPrograms.find((program) => normalizeProgramLabel(program.id) === normalized) ??
    pvPrograms.find((program) =>
      [program.title, ...program.alias].some(
        (candidate) => normalizeProgramLabel(candidate) === normalized
      )
    );

  if (exact) {
    return exact.id;
  }

  // Repli 2026-07-16 : "starter" avant, ce qui injectait 3 produits fantomes
  // (aloe-vera + the-51g + formula-1) des que le titre n'etait pas reconnu
  // ("À l'unité", "Programme a confirmer", ""). On replie sur "unit" dont la
  // routine est vide : un titre inconnu n'invente plus de produits.
  return (
    pvPrograms.find((program) =>
      normalized.includes(normalizeProgramLabel(program.title.replace("Programme ", "")))
    )?.id ?? "unit"
  );
}

function isMissingPvTableError(error: { message?: string } | null | undefined) {
  const message = String(error?.message ?? "").toLowerCase();
  return (
    message.includes("pv_client_products") &&
    (message.includes("schema cache") ||
      message.includes("does not exist") ||
      message.includes("relation") ||
      message.includes("could not find"))
  );
}

function buildSeedPvProducts(payload: {
  clientId: string;
  distributorId: string;
  distributorName: string;
  programId: string;
  startDate: string;
  selectedProductIds?: string[];
}) {
  const selectedProductIds = (payload.selectedProductIds ?? []).filter(
    (productId, index, array) =>
      array.indexOf(productId) === index &&
      pvProductCatalog.some((product) => product.id === productId)
  );
  // Fix 2026-07-16 : aligne sur src/services/supabaseService.ts (UNION routine
  // du programme + produits retenus). Avant c'etait un OU exclusif — editer un
  // bilan recomposait donc le client differemment de sa creation (perte de la
  // routine du pack des qu'un seul produit etait retenu). Et le repli
  // `?? pvProgramProducts.starter` injectait la routine Starter pour tout
  // programme inconnu ("À l'unité") -> produits fantomes. Repli desormais [].
  const productIds = Array.from(
    new Set([...(pvProgramProducts[payload.programId] ?? []), ...selectedProductIds])
  );

  return productIds.flatMap((productId) => {
    const product = pvProductCatalog.find((item) => item.id === productId);
    if (!product) {
      return [];
    }

    return [
      {
        client_id: payload.clientId,
        responsible_id: payload.distributorId,
        responsible_name: payload.distributorName,
        program_id: payload.programId,
        product_id: product.id,
        product_name: product.name,
        quantity_start: 1,
        start_date: payload.startDate,
        duration_reference_days: product.dureeReferenceJours,
        pv_per_unit: product.pv,
        price_public_per_unit: product.pricePublic,
        quantite_label: product.quantiteLabel,
        note_metier: product.noteMetier,
        active: true
      }
    ];
  });
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "Methode non autorisee." });
      return;
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const authHeader = String(req.headers.authorization ?? "");
    const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const clientId = String(req.body?.clientId ?? "").trim();
    const assessment = req.body?.assessment ?? null;

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

    if (!clientId || !assessment?.id) {
      res.status(400).json({ ok: false, error: "Le bilan a modifier est introuvable." });
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
      .select("id, distributor_id, distributor_name")
      .eq("id", clientId)
      .single<{ id: string; distributor_id: string; distributor_name?: string | null }>();

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
        error: "Tu n'as pas les droits pour modifier ce bilan."
      });
      return;
    }

    const { error: updateError } = await admin
      .from("assessments")
      .update({
        date: assessment.date,
        objective: assessment.objective,
        program_id: assessment.programId ?? null,
        program_title: assessment.programTitle,
        summary: assessment.summary,
        notes: assessment.notes,
        next_follow_up: assessment.nextFollowUp ?? null,
        body_scan: assessment.bodyScan,
        questionnaire: assessment.questionnaire,
        pedagogical_focus: assessment.pedagogicalFocus ?? []
      })
      .eq("id", assessment.id)
      .eq("client_id", clientId);

    if (updateError) {
      res.status(400).json({
        ok: false,
        error: updateError.message || "Impossible de modifier ce bilan."
      });
      return;
    }

    if (assessment.type === "initial") {
      // Fix 2026-07-16 (audit programmes) — BUG DE PERTE DE DONNEES.
      // Avant : hasStartedProgram = Boolean(assessment.programId && programTitle).
      // Or EditInitialAssessmentPage n'ecrit JAMAIS programId (il ne gere que le
      // titre) -> hasStartedProgram etait toujours faux des que le bilan avait
      // ete cree "À l'unité" ou "pas demarre" -> current_program vide de force,
      // statut repasse "pending", et TOUS les pv_client_products supprimes plus
      // bas sans jamais etre recrees (cas Aline / Elise). On se base desormais
      // sur le TITRE du programme (+ produits retenus), pas sur un id que l'UI
      // n'alimente pas.
      const selectedProductIds = Array.isArray(assessment.questionnaire?.selectedProductIds)
        ? assessment.questionnaire.selectedProductIds
        : [];
      const programTitleTrimmed = String(assessment.programTitle ?? "").trim();
      const isPlaceholderTitle =
        normalizeProgramLabel(programTitleTrimmed) === "programme a confirmer";
      const hasStartedProgram =
        (Boolean(programTitleTrimmed) && !isPlaceholderTitle) || selectedProductIds.length > 0;
      const pvProgramId = hasStartedProgram ? resolvePvProgramId(assessment.programTitle) : null;
      let { error: clientUpdateError } = await admin
        .from("clients")
        .update({
          start_date: hasStartedProgram ? assessment.date : null,
          current_program: hasStartedProgram ? assessment.programTitle : "",
          pv_program_id: hasStartedProgram ? pvProgramId : null,
          started: hasStartedProgram,
          status: hasStartedProgram ? "active" : "pending"
        })
        .eq("id", clientId);

      if (clientUpdateError?.message?.toLowerCase().includes("pv_program_id")) {
        ({ error: clientUpdateError } = await admin
          .from("clients")
          .update({
            start_date: hasStartedProgram ? assessment.date : null,
            current_program: hasStartedProgram ? assessment.programTitle : "",
            started: hasStartedProgram,
            status: hasStartedProgram ? "active" : "pending"
          })
          .eq("id", clientId));
      }

      if (clientUpdateError) {
        res.status(400).json({
          ok: false,
          error: clientUpdateError.message || "Le bilan a ete modifie, mais pas la date de depart."
        });
        return;
      }

      // ⚠️ Fix 2026-07-16 — on ne PURGE la composition PV que si on est capable
      // de la reconstruire juste apres. Avant, le delete etait inconditionnel et
      // le re-seed conditionne a `hasStartedProgram && pvProgramId` : un bilan
      // edite sans programId (cas majoritaire, l'UI d'edition ne l'ecrit pas)
      // perdait DEFINITIVEMENT tous ses produits, en silence.
      const canReseedPvProducts = Boolean(hasStartedProgram && pvProgramId);

      if (canReseedPvProducts) {
        const { error: clearPvProductsError } = await admin
          .from("pv_client_products")
          .delete()
          .eq("client_id", clientId);

        if (clearPvProductsError && !isMissingPvTableError(clearPvProductsError)) {
          res.status(400).json({
            ok: false,
            error:
              clearPvProductsError.message ||
              "Le bilan a ete modifie, mais la composition PV n'a pas pu etre remise a jour."
          });
          return;
        }
      }

      if (canReseedPvProducts && pvProgramId) {
        const seedProducts = buildSeedPvProducts({
          clientId,
          distributorId: clientRecord.distributor_id,
          distributorName: clientRecord.distributor_name ?? "",
          programId: pvProgramId,
          startDate: assessment.date,
          selectedProductIds: Array.isArray(assessment.questionnaire?.selectedProductIds)
            ? assessment.questionnaire.selectedProductIds
            : []
        });

        if (seedProducts.length) {
          const { error: seedPvProductsError } = await admin
            .from("pv_client_products")
            .insert(seedProducts);

          if (seedPvProductsError && !isMissingPvTableError(seedPvProductsError)) {
            res.status(400).json({
              ok: false,
              error:
                seedPvProductsError.message ||
                "Le bilan a ete modifie, mais la composition PV n'a pas pu etre recreee."
            });
            return;
          }
        }
      }
    }

    res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error("update-assessment failed", error);
    res.status(500).json({
      ok: false,
      error:
        error?.message ||
        "Une erreur serveur est survenue pendant la modification du bilan."
    });
  }
}
