export type AssessmentNeedId =
  | "hydration"
  | "energy"
  | "sleep"
  | "breakfast_structure"
  | "protein_muscle"
  | "digestive_support"
  | "visceral_fat"
  | "bone_support"
  | "snacking_control";

export interface AssessmentRecommendationSource {
  sex: "female" | "male";
  objective: "weight-loss" | "sport" | "mass-gain" | "strength" | "cutting" | "endurance" | "fitness" | "competition";
  sleepHours: number;
  sleepQuality: string;
  breakfastFrequency: string;
  breakfastSatiety: string;
  regularMealTimes: string;
  proteinEachMeal: string;
  sugaryProducts: string;
  snackingFrequency: string;
  snackingMoment: string;
  cravingsPreference: string;
  snackingTrigger: string;
  waterIntake: number;
  energyLevel: string;
  transitStatus: string;
  healthNotes: string;
  pathologyContext: string;
  weight: number;
  muscleMass: number;
  hydration: number;
  boneMass: number;
  visceralFat: number;
}

export interface SuggestedProduct {
  id: string;
  name: string;
  shortBenefit: string;
  pv: number;
  prixPublic: number;
  dureeReferenceJours: number;
  quantityLabel?: string;
  tags: AssessmentNeedId[];
}

export interface SuggestedNeedGroup {
  id: AssessmentNeedId;
  label: string;
  summary: string;
  priority: number;
  reasonLabel: string;
  products: Array<
    SuggestedProduct & {
      reasonLabel: string;
    }
  >;
}

export interface AssessmentRecommendationPlan {
  needs: SuggestedNeedGroup[];
  optionalUpsells: SuggestedProduct[];
  recommendedProgramId: string | null;
  recommendedProgramReason: string;
}

type NeedDefinition = {
  label: string;
  summary: string;
};

type ProductDefinition = SuggestedProduct;

type DetectedNeed = {
  id: AssessmentNeedId;
  priority: number;
  reasonLabel: string;
};

const NEED_PRIORITY_ORDER: AssessmentNeedId[] = [
  "visceral_fat",
  "bone_support",
  "hydration",
  "protein_muscle",
  "sleep",
  "digestive_support",
  "breakfast_structure",
  "snacking_control",
  "energy"
];

const NEED_PRIORITY_RANK = NEED_PRIORITY_ORDER.reduce<Record<AssessmentNeedId, number>>(
  (accumulator, needId, index) => {
    accumulator[needId] = NEED_PRIORITY_ORDER.length - index;
    return accumulator;
  },
  {
    hydration: 0,
    energy: 0,
    sleep: 0,
    breakfast_structure: 0,
    protein_muscle: 0,
    digestive_support: 0,
    visceral_fat: 0,
    bone_support: 0,
    snacking_control: 0
  }
);

const NEED_DEFINITIONS: Record<AssessmentNeedId, NeedDefinition> = {
  hydration: {
    label: "Hydratation",
    summary: "Remettre de l'eau et une routine simple au centre de la journee."
  },
  energy: {
    label: "Energie",
    summary: "Redonner un elan plus stable au matin et aux heures creuses."
  },
  sleep: {
    label: "Sommeil / routine du soir",
    summary: "Aider la recuperation et une routine du soir plus calme."
  },
  breakfast_structure: {
    label: "Petit-dejeuner structure / faim",
    summary: "Poser un matin plus cale et plus simple a tenir."
  },
  protein_muscle: {
    label: "Apport proteine / masse musculaire",
    summary: "Soutenir la masse musculaire et la regularite proteinee."
  },
  digestive_support: {
    label: "Fibres / confort digestif / transit",
    summary: "Apporter plus de confort digestif et un transit mieux cadre."
  },
  visceral_fat: {
    label: "Graisse viscerale haute / soutien cholesterol",
    summary: "Priorite de routine autour de la graisse viscerale et du cadre global."
  },
  bone_support: {
    label: "Masse osseuse basse / soutien calcium",
    summary: "Ajouter un repère simple quand la base osseuse semble basse."
  },
  snacking_control: {
    label: "Grignotage / encas cadre",
    summary: "Canaliser les envies et mieux cadrer les encas."
  }
};

const PRODUCT_CATALOG: ProductDefinition[] = [
  // ── Base programme (petit-déjeuner & protéines) ──
  {
    id: "formula-1",
    name: "Formula 1 Boisson Nutritionnelle",
    shortBenefit: "Repas équilibré · Contrôle des calories · Base du programme",
    pv: 23.95,
    prixPublic: 63.50,
    dureeReferenceJours: 21,
    quantityLabel: "21 repas (550g)",
    tags: ["breakfast_structure", "protein_muscle"]
  },
  {
    id: "pdm",
    name: "Mélange pour Boisson Protéinée Vanille",
    shortBenefit: "Apport protéiné élevé · Prise de masse · Récupération musculaire",
    pv: 33.00,
    prixPublic: 75.00,
    dureeReferenceJours: 42,
    quantityLabel: "42 doses",
    tags: ["breakfast_structure", "protein_muscle"]
  },
  {
    id: "formula-3",
    name: "Formula 3 — Personalised Protein Powder",
    shortBenefit: "Complète le shake F1 · Augmente l'apport protéique · Muscle & satiété",
    pv: 17.95,
    prixPublic: 49.00,
    dureeReferenceJours: 30,
    tags: ["protein_muscle", "breakfast_structure"]
  },
  // ── Hydratation & énergie ──
  {
    id: "the-51g",
    name: "Boisson Instantanée à base de Thé",
    shortBenefit: "Booster d'énergie · Thermogenèse · Complément du shake F1",
    pv: 19.95,
    prixPublic: 41.00,
    dureeReferenceJours: 21,
    quantityLabel: "51g",
    tags: ["hydration", "energy"]
  },
  {
    id: "aloe-vera",
    name: "Boisson Concentrée à l'Aloe Vera",
    shortBenefit: "Digestion & transit · Hydratation · Muqueuse intestinale",
    pv: 24.95,
    prixPublic: 54.50,
    dureeReferenceJours: 21,
    quantityLabel: "473ml",
    tags: ["hydration", "digestive_support"]
  },
  {
    id: "h24-hydrate",
    name: "Herbalife 24 — Hydrate",
    shortBenefit: "Hydratation optimale · Électrolytes · Effort & endurance",
    pv: 17.20,
    prixPublic: 47.50,
    dureeReferenceJours: 20,
    tags: ["hydration"]
  },
  // ── Digestion & transit ──
  {
    id: "multifibres",
    name: "Boisson Multi-Fibres",
    shortBenefit: "Fibres solubles & insolubles · Transit · Satiété · Intestin",
    pv: 22.95,
    prixPublic: 43.50,
    dureeReferenceJours: 30,
    quantityLabel: "30 doses",
    tags: ["digestive_support"]
  },
  {
    id: "microbiotic-max",
    name: "Microbiotic Max",
    shortBenefit: "Flore intestinale · Digestion · Transit · Microbiote",
    pv: 27.10,
    prixPublic: 64.50,
    dureeReferenceJours: 30,
    tags: ["digestive_support"]
  },
  // ── Silhouette & viscéral ──
  {
    id: "phyto-brule-graisse",
    name: "Phyto Complete",
    shortBenefit: "Extraits de plantes · Bien-être global · Antioxydants naturels",
    pv: 38.15,
    prixPublic: 90.00,
    dureeReferenceJours: 30,
    tags: ["visceral_fat"]
  },
  {
    id: "beta-heart",
    name: "Beta Heart",
    shortBenefit: "Bêta-glucanes · Cholestérol · Santé cardiovasculaire",
    pv: 25.95,
    prixPublic: 57.50,
    dureeReferenceJours: 30,
    quantityLabel: "30 jours",
    tags: ["visceral_fat"]
  },
  // ── Sommeil ──
  {
    id: "night-mode",
    name: "Night Mode",
    shortBenefit: "Qualité du sommeil · Récupération nocturne · Gestion du poids",
    pv: 31.25,
    prixPublic: 69.00,
    dureeReferenceJours: 30,
    tags: ["sleep"]
  },
  // ── Os & calcium ──
  {
    id: "xtra-cal",
    name: "Xtra-Cal",
    shortBenefit: "Calcium & Magnésium · Os & articulations · Récupération",
    pv: 10.25,
    prixPublic: 24.50,
    dureeReferenceJours: 30,
    tags: ["bone_support"]
  },
  // ── Énergie ──
  {
    id: "liftoff",
    name: "LiftOff® — Citron Vert",
    shortBenefit: "Énergie & concentration · Vitamines B & C · Effervescent",
    pv: 15.95,
    prixPublic: 39.50,
    dureeReferenceJours: 10,
    tags: ["energy"]
  },
  {
    id: "active-mind",
    name: "Active Mind Complex",
    shortBenefit: "Concentration · Mémoire · Clarté mentale · Énergie cognitive",
    pv: 27.25,
    prixPublic: 57.50,
    dureeReferenceJours: 30,
    tags: ["energy"]
  },
  // ── Grignotage ──
  {
    id: "protein-bars",
    name: "Barres aux Protéines — Vanille-Amandes",
    shortBenefit: "En-cas protéiné · Muscle & récupération · Pratique en RDV terrain",
    pv: 13.22,
    prixPublic: 31.50,
    dureeReferenceJours: 14,
    tags: ["snacking_control"]
  },
  {
    id: "chips-proteinees",
    name: "Chips Protéinées",
    shortBenefit: "En-cas protéiné · Coupe-faim sain · Alternative chips classiques",
    pv: 11.75,
    prixPublic: 27.50,
    dureeReferenceJours: 10,
    tags: ["snacking_control"]
  },
  // ── Immunité ──
  {
    id: "immune-booster",
    name: "Immune Booster",
    shortBenefit: "Renforce les défenses immunitaires · Vitamines C & D · Zinc",
    pv: 18.90,
    prixPublic: 51.00,
    dureeReferenceJours: 21,
    tags: ["energy"]
  },
  // ── Sport ──
  {
    id: "rebuild-strength",
    name: "Herbalife 24 — Rebuild Strength",
    shortBenefit: "Protéines & créatine · Prise de masse musculaire · Récupération intense",
    pv: 33.55,
    prixPublic: 83.50,
    dureeReferenceJours: 30,
    tags: ["protein_muscle"]
  },
];

const UPSELL_PRODUCT_BY_NEED: Partial<Record<AssessmentNeedId, string>> = {
  hydration: "h24-hydrate",
  energy: "active-mind",
  sleep: "night-mode",
  breakfast_structure: "formula-3",
  protein_muscle: "rebuild-strength",
  digestive_support: "microbiotic-max",
  visceral_fat: "beta-heart",
  bone_support: "xtra-cal",
  snacking_control: "chips-proteinees"
};

function normalizeText(value: string) {
  return value.toLowerCase();
}

function getHydrationReferenceMinimum(sex: "female" | "male") {
  return sex === "male" ? 50 : 45;
}

function estimateMusclePercent(weight: number, muscleMass: number) {
  if (weight <= 0) {
    return 0;
  }

  return (muscleMass / weight) * 100;
}

function detectNeeds(source: AssessmentRecommendationSource): DetectedNeed[] {
  const needs: DetectedNeed[] = [];
  const healthContext = normalizeText(`${source.healthNotes} ${source.pathologyContext}`);
  const hydrationReferenceMin = getHydrationReferenceMinimum(source.sex);
  const musclePercent = estimateMusclePercent(source.weight, source.muscleMass);
  const boneRatio = source.weight > 0 ? source.boneMass / source.weight : 0;

  if (
    source.waterIntake > 0 &&
    source.waterIntake < 1.6 ||
    source.hydration > 0 && source.hydration < hydrationReferenceMin
  ) {
    const isCritical = source.hydration > 0 && source.hydration < 50;
    needs.push({
      id: "hydration",
      priority: isCritical ? 10 : source.hydration > 0 && source.hydration < hydrationReferenceMin ? 9 : 8,
      reasonLabel: isCritical
        ? "Hydratation critique (< 50%) — Aloe Vera + H24 Hydrate essentiels."
        : source.hydration > 0 && source.hydration < hydrationReferenceMin
          ? "Hydratation body scan sous le repère."
          : "Volume d'eau du quotidien trop bas."
    });
  }

  if (
    source.energyLevel === "Faible" ||
    source.energyLevel === "Moyen" ||
    source.snackingTrigger === "Fatigue"
  ) {
    needs.push({
      id: "energy",
      priority: source.energyLevel === "Faible" ? 8 : 6,
      reasonLabel:
        source.energyLevel === "Faible"
          ? "Energie basse a soutenir dans la routine."
          : "Le niveau d'energie merite un soutien plus stable."
    });
  }

  if (
    source.sleepQuality === "Mauvaise" ||
    source.sleepQuality === "Moyenne" ||
    (source.sleepHours > 0 && source.sleepHours < 7)
  ) {
    needs.push({
      id: "sleep",
      priority: source.sleepQuality === "Mauvaise" ? 8 : 6,
      reasonLabel:
        source.sleepQuality === "Mauvaise"
          ? "Sommeil fragile a remettre au centre."
          : "Routine du soir et recuperation a soutenir."
    });
  }

  if (
    source.breakfastFrequency !== "Oui" ||
    source.breakfastSatiety === "Non" ||
    source.breakfastSatiety === "Pas toujours" ||
    source.regularMealTimes === "Non"
  ) {
    needs.push({
      id: "breakfast_structure",
      priority:
        source.breakfastFrequency === "Non" || source.breakfastSatiety === "Non" ? 9 : 7,
      reasonLabel:
        source.breakfastFrequency === "Non"
          ? "Petit-dejeuner encore trop desorganise."
          : "La faim du matin n'est pas encore bien tenue."
    });
  }

  if (
    source.proteinEachMeal === "Non" ||
    source.proteinEachMeal === "Pas toujours" ||
    (source.muscleMass > 0 &&
      musclePercent > 0 &&
      ((source.sex === "female" && musclePercent < 58) ||
        (source.sex === "male" && musclePercent < 70)))
  ) {
    needs.push({
      id: "protein_muscle",
      priority:
        source.proteinEachMeal === "Non" ? 8 : musclePercent > 0 ? 7 : 6,
      reasonLabel:
        source.proteinEachMeal === "Non"
          ? "Les apports proteines ne sont pas encore reguliers."
          : "La masse musculaire merite un meilleur soutien."
    });
  }

  if (
    source.transitStatus === "Lent" ||
    source.transitStatus === "Irregulier" ||
    source.transitStatus === "Sensible" ||
    /ballonn|transit|digest|ventre|constipat|inconfort/.test(healthContext)
  ) {
    needs.push({
      id: "digestive_support",
      priority: source.transitStatus === "Sensible" ? 8 : 7,
      reasonLabel:
        source.transitStatus === "Normal"
          ? "Le confort digestif ressort dans l'echange."
          : "Le transit appelle un soutien plus confortable."
    });
  }

  if (source.visceralFat >= 7) {
    needs.push({
      id: "visceral_fat",
      priority: source.visceralFat >= 12 ? 10 : source.visceralFat >= 9 ? 9 : 8,
      reasonLabel: source.visceralFat >= 12
        ? "Graisse viscérale critique — Phyto Complete fortement recommandé."
        : source.visceralFat >= 9
        ? "Graisse viscérale élevée — accompagnement ciblé nécessaire."
        : "La graisse viscerale ressort comme priorite du moment."
    });
  }

  // Hydratation très basse souvent corrélée à masse grasse élevée
  // Si viscéral déjà détecté ET hydratation basse → renforcer la priorité
  if (source.visceralFat >= 7 && source.hydration > 0 && source.hydration < 50) {
    const existing = needs.find(n => n.id === 'visceral_fat');
    if (existing) existing.priority = Math.max(existing.priority, 10);
  }

  if (
    source.boneMass > 0 &&
    ((source.sex === "female" && source.boneMass < 2.4) ||
      (source.sex === "male" && source.boneMass < 3) ||
      boneRatio < 0.04)
  ) {
    needs.push({
      id: "bone_support",
      priority: boneRatio < 0.035 ? 9 : source.sex === "female" ? 8 : 6,
      reasonLabel: boneRatio < 0.035
        ? "Masse osseuse faible détectée — calcium & vitamine D essentiels."
        : source.sex === "female"
        ? "Calcium essentiel femme — prévention ostéoporose à tout âge."
        : "La base osseuse semble basse sur ce relevé."
    });
  }

  // Femme sans données body scan → calcium recommandé quand même
  if (source.sex === "female" && source.boneMass === 0 && !needs.some(n => n.id === "bone_support")) {
    needs.push({
      id: "bone_support",
      priority: 5,
      reasonLabel: "Calcium recommandé pour les femmes — prévention osseuse."
    });
  }

  if (
    source.snackingFrequency === "Souvent" ||
    source.sugaryProducts === "Tres souvent" ||
    source.sugaryProducts === "Souvent" ||
    source.cravingsPreference === "Sucré"
  ) {
    needs.push({
      id: "snacking_control",
      priority:
        source.snackingFrequency === "Souvent" || source.sugaryProducts === "Tres souvent"
          ? 8
          : 6,
      reasonLabel:
        source.snackingFrequency === "Souvent"
          ? "Le grignotage revient souvent dans la journee."
          : "Les envies sucrées merite un encas plus cadre."
    });
  }

  return needs
    .filter((need, index, array) => array.findIndex((item) => item.id === need.id) === index)
    .sort((a, b) => {
      const priorityDelta = NEED_PRIORITY_RANK[b.id] - NEED_PRIORITY_RANK[a.id];
      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      return b.priority - a.priority;
    })
}

function getReasonForProduct(needId: AssessmentNeedId, productName: string) {
  switch (needId) {
    case "hydration":
      return `${productName} aide a remettre un repère eau simple au quotidien.`;
    case "energy":
      return `${productName} vient soutenir l'elan du matin ou des heures creuses.`;
    case "sleep":
      return `${productName} accompagne une routine du soir plus calme.`;
    case "breakfast_structure":
      return `${productName} aide a cadrer un petit-dejeuner plus stable.`;
    case "protein_muscle":
      return `${productName} apporte un repère proteine plus simple a tenir.`;
    case "digestive_support":
      return `${productName} soutient un confort digestif plus regulier.`;
    case "visceral_fat":
      return `${productName} accompagne la priorite du moment sans surcharger la routine.`;
    case "bone_support":
      return `${productName} ajoute un soutien simple autour de la base osseuse.`;
    case "snacking_control":
      return `${productName} aide a mieux cadrer les encas et les envies.`;
    default:
      return productName;
  }
}

function getRecommendedProgramId(
  objective: AssessmentRecommendationSource["objective"],
  needs: DetectedNeed[]
) {
  const needIds = needs.map((need) => need.id);

  if (objective === "sport") {
    if (
      needIds.includes("protein_muscle") ||
      needIds.includes("energy") ||
      needIds.includes("hydration")
    ) {
      return "p-sport-premium";
    }

    return "p-sport-discovery";
  }

  if (needIds.includes("visceral_fat") || needIds.includes("digestive_support")) {
    return "p-booster-1";
  }

  if (needIds.includes("energy") && needIds.includes("hydration")) {
    return "p-booster-2";
  }

  if (
    needIds.includes("breakfast_structure") ||
    needIds.includes("protein_muscle") ||
    needIds.includes("hydration")
  ) {
    return "p-premium";
  }

  return "p-discovery";
}

function getProgramReason(programId: string, needs: DetectedNeed[]) {
  if (programId === "p-booster-1") {
    return "La priorite du moment melange base routine et soutien digestif / viscerale.";
  }

  if (programId === "p-booster-2") {
    return "Le profil demande une routine plus dynamique autour de l'energie et de l'hydratation.";
  }

  if (programId === "p-premium") {
    return "Le Premium couvre bien la base du matin, l'hydratation et le soutien proteine.";
  }

  if (needs.length === 0) {
    return "On peut demarrer avec une base simple puis personnaliser ensuite.";
  }

  return "Une base simple suffit pour lancer la routine sans surcharge.";
}

// Chantier sync client_recaps (2026-04-20) : lookup utilisé par refreshClientRecap
// pour reconstruire le champ recommendations à partir des selectedProductIds
// stockés dans le questionnaire. Évite la duplication du catalogue produits.
export function getRecommendableProductById(id: string): SuggestedProduct | undefined {
  return PRODUCT_CATALOG.find((product) => product.id === id);
}

export function buildAssessmentRecommendationPlan(
  source: AssessmentRecommendationSource
): AssessmentRecommendationPlan {
  const allDetectedNeeds = detectNeeds(source);
  const detectedNeeds = allDetectedNeeds.slice(0, 4);
  const usedProductIds = new Set<string>();
  const visibleProductLimit = 6;
  const allocatedProducts = new Map<
    AssessmentNeedId,
    Array<
      SuggestedProduct & {
        reasonLabel: string;
      }
    >
  >();

  detectedNeeds.forEach((need) => {
    allocatedProducts.set(need.id, []);
  });

  // First pass: give each visible need one product when possible.
  detectedNeeds.forEach((need) => {
    if (usedProductIds.size >= visibleProductLimit) {
      return;
    }

    const firstProduct = PRODUCT_CATALOG.find(
      (product) => product.tags.includes(need.id) && !usedProductIds.has(product.id)
    );

    if (!firstProduct) {
      return;
    }

    usedProductIds.add(firstProduct.id);
    allocatedProducts.get(need.id)?.push({
      ...firstProduct,
      reasonLabel: getReasonForProduct(need.id, firstProduct.name)
    });
  });

  // Second pass: fill the optional second product while respecting the global cap.
  detectedNeeds.forEach((need) => {
    if (usedProductIds.size >= visibleProductLimit) {
      return;
    }

    const currentProducts = allocatedProducts.get(need.id) ?? [];
    if (currentProducts.length >= 2) {
      return;
    }

    const extraProducts = PRODUCT_CATALOG.filter(
      (product) => product.tags.includes(need.id) && !usedProductIds.has(product.id)
    ).slice(0, Math.min(2 - currentProducts.length, visibleProductLimit - usedProductIds.size));

    extraProducts.forEach((product) => {
      usedProductIds.add(product.id);
      currentProducts.push({
        ...product,
        reasonLabel: getReasonForProduct(need.id, product.name)
      });
    });
  });

  const needs = detectedNeeds.map((need) => {
    const definition = NEED_DEFINITIONS[need.id];
    const products = allocatedProducts.get(need.id) ?? [];

    return {
      id: need.id,
      label: definition.label,
      summary: definition.summary,
      priority: need.priority,
      reasonLabel: need.reasonLabel,
      products
    };
  });

  const optionalUpsells = allDetectedNeeds
    .map((need) => UPSELL_PRODUCT_BY_NEED[need.id])
    .filter(
      (productId, index, array): productId is string =>
        Boolean(productId) && array.indexOf(productId) === index
    )
    .map((productId) => PRODUCT_CATALOG.find((product) => product.id === productId) ?? null)
    .filter((product): product is SuggestedProduct => product !== null)
    .filter((product) => !usedProductIds.has(product.id))
    .slice(0, 3);

  const recommendedProgramId = getRecommendedProgramId(source.objective, detectedNeeds);

  return {
    needs,
    optionalUpsells,
    recommendedProgramId,
    recommendedProgramReason: getProgramReason(recommendedProgramId, detectedNeeds)
  };
}

// ─── Chantier Prise de masse (2026-04-24) ───────────────────────────────
// Recommandation automatique des 6 boosters sport optionnels selon le
// profil sport du client (sous-objectif + fréquence + types). Chaque règle
// ci-dessous retourne {recommended, reason}. L'UI marque les boosters
// recommandés d'une étoile et d'un surlignage teal.

import type { SportProfile, SportType } from "../types/domain";

export type BoosterRecommendation = {
  productId: string;
  recommended: boolean;
  reason: string;
};

const BOOSTER_PRODUCT_IDS = {
  proteinSnack: "p-sport-boost-protein-snack",
  liftoff: "p-sport-boost-liftoff",
  cr7: "p-sport-boost-cr7",
  hydrate: "p-sport-boost-hydration",
  creatine: "p-sport-boost-creatine",
  collagen: "p-sport-boost-collagen",
} as const;

function hasAny<T>(list: T[], targets: T[]): boolean {
  return list.some((v) => targets.includes(v));
}

export function recommendBoosters(
  profile: SportProfile | null | undefined,
  clientAge: number
): BoosterRecommendation[] {
  const p: SportProfile = profile ?? { frequency: "regular", types: [], subObjective: "mass-gain" };
  const types = p.types;

  // 1. Collations protéinées
  const proteinSnackRec = p.subObjective === "mass-gain" || p.subObjective === "strength";

  // 2. Liftoff : fréquence régulière/intensive + type musculation/crossfit/combat
  const liftoffRec =
    (p.frequency === "regular" || p.frequency === "intensive") &&
    hasAny<SportType>(types, ["musculation", "crossfit-hiit", "combat-sport"]);

  // 3. CR7 Drive : cardio / endurance-long / team-sport / crossfit-hiit
  const cr7Rec = hasAny<SportType>(types, ["cardio", "endurance-long", "team-sport", "crossfit-hiit"]);

  // 4. Hydrate : intensif OR crossfit/combat/team
  const hydrateRec =
    p.frequency === "intensive" ||
    hasAny<SportType>(types, ["crossfit-hiit", "combat-sport", "team-sport"]);

  // 5. Créatine : mass-gain / strength
  const creatineRec = p.subObjective === "mass-gain" || p.subObjective === "strength";

  // 6. Collagène : age ≥ 35 OR sport à impact
  const collagenImpact = hasAny<SportType>(types, ["cardio", "crossfit-hiit", "combat-sport", "endurance-long"]);
  const collagenRec = clientAge >= 35 || collagenImpact;
  const collagenReason = clientAge >= 35
    ? "Articulations à partir de 35 ans"
    : "Sport à impact = usure articulaire";

  return [
    { productId: BOOSTER_PRODUCT_IDS.proteinSnack, recommended: proteinSnackRec, reason: "Apport protéines facile entre repas" },
    { productId: BOOSTER_PRODUCT_IDS.liftoff, recommended: liftoffRec, reason: "Énergie pré-workout pour séances intenses" },
    { productId: BOOSTER_PRODUCT_IDS.cr7, recommended: cr7Rec, reason: "Hydratation + énergie pendant effort prolongé" },
    { productId: BOOSTER_PRODUCT_IDS.hydrate, recommended: hydrateRec, reason: "Électrolytes pour séances intenses" },
    { productId: BOOSTER_PRODUCT_IDS.creatine, recommended: creatineRec, reason: "Gain force et volume musculaire prouvé" },
    { productId: BOOSTER_PRODUCT_IDS.collagen, recommended: collagenRec, reason: collagenReason },
  ];
}
