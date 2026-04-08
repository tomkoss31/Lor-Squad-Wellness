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
  objective: "weight-loss" | "sport";
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
    summary: "Ajouter un repere simple quand la base osseuse semble basse."
  },
  snacking_control: {
    label: "Grignotage / encas cadre",
    summary: "Canaliser les envies et mieux cadrer les encas."
  }
};

const PRODUCT_CATALOG: ProductDefinition[] = [
  {
    id: "formula-1",
    name: "Formula 1",
    shortBenefit: "Aide a structurer un matin simple et plus cale.",
    pv: 23.95,
    prixPublic: 63.5,
    dureeReferenceJours: 21,
    tags: ["breakfast_structure", "protein_muscle"]
  },
  {
    id: "pdm",
    name: "Melange pour boisson proteinee",
    shortBenefit: "Ajoute un repere proteine facile dans la routine.",
    pv: 33,
    prixPublic: 75,
    dureeReferenceJours: 42,
    tags: ["breakfast_structure", "protein_muscle"]
  },
  {
    id: "the-51g",
    name: "Boisson instantanee a base de the 51 g",
    shortBenefit: "Soutient l'hydratation du matin et l'elan de la routine.",
    pv: 19.95,
    prixPublic: 41,
    dureeReferenceJours: 21,
    tags: ["hydration", "energy"]
  },
  {
    id: "aloe-vera",
    name: "Boisson Aloe Vera",
    shortBenefit: "Pose un repere hydratation simple a reprendre chaque jour.",
    pv: 24.95,
    prixPublic: 54.5,
    dureeReferenceJours: 21,
    tags: ["hydration"]
  },
  {
    id: "multifibres",
    name: "Boisson multi-fibres",
    shortBenefit: "Aide a remettre des fibres et du confort digestif dans la routine.",
    pv: 22.95,
    prixPublic: 43.5,
    dureeReferenceJours: 30,
    tags: ["digestive_support"]
  },
  {
    id: "phyto-brule-graisse",
    name: "Phyto Complete",
    shortBenefit: "Ajoute un soutien plus cadre quand la priorite est viscerale.",
    pv: 38.15,
    prixPublic: 90,
    dureeReferenceJours: 30,
    tags: ["visceral_fat"]
  },
  {
    id: "microbiotic-max",
    name: "Microbiotic Max",
    shortBenefit: "Soutient une routine plus stable quand le confort digestif compte.",
    pv: 27.1,
    prixPublic: 64.5,
    dureeReferenceJours: 30,
    tags: ["digestive_support"]
  },
  {
    id: "night-mode",
    name: "Night Mode",
    shortBenefit: "Aide a installer une fin de journee plus calme.",
    pv: 31.25,
    prixPublic: 69,
    dureeReferenceJours: 30,
    tags: ["sleep"]
  },
  {
    id: "xtra-cal",
    name: "Xtra-Cal",
    shortBenefit: "Ajoute un repere simple autour du calcium et de la base osseuse.",
    pv: 10.25,
    prixPublic: 24.5,
    dureeReferenceJours: 30,
    tags: ["bone_support"]
  },
  {
    id: "beta-heart",
    name: "Beta Heart",
    shortBenefit: "Accompagne un travail de fond quand la lecture viscerale est haute.",
    pv: 25.95,
    prixPublic: 57.5,
    dureeReferenceJours: 30,
    tags: ["visceral_fat"]
  },
  {
    id: "protein-bars",
    name: "Barres aux proteines",
    shortBenefit: "Donne un encas plus cadre quand les envies debordent.",
    pv: 13.22,
    prixPublic: 31.5,
    dureeReferenceJours: 14,
    tags: ["snacking_control"]
  },
  {
    id: "liftoff",
    name: "LiftOff",
    shortBenefit: "Apporte un petit coup d'elan quand l'energie manque.",
    pv: 15.95,
    prixPublic: 39.5,
    dureeReferenceJours: 10,
    tags: ["energy"]
  },
  {
    id: "h24-hydrate",
    name: "Herbalife24 Hydrate",
    shortBenefit: "Soutient l'hydratation quand le besoin est plus marque.",
    pv: 17.2,
    prixPublic: 47.5,
    dureeReferenceJours: 20,
    tags: ["hydration"]
  }
];

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
    needs.push({
      id: "hydration",
      priority: source.hydration > 0 && source.hydration < hydrationReferenceMin ? 9 : 8,
      reasonLabel:
        source.hydration > 0 && source.hydration < hydrationReferenceMin
          ? "Hydratation body scan sous le repere."
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
      priority: source.visceralFat >= 10 ? 10 : 9,
      reasonLabel: "La graisse viscerale ressort comme priorite du moment."
    });
  }

  if (
    source.boneMass > 0 &&
    ((source.sex === "female" && source.boneMass < 2.4) ||
      (source.sex === "male" && source.boneMass < 3) ||
      boneRatio < 0.031)
  ) {
    needs.push({
      id: "bone_support",
      priority: 6,
      reasonLabel: "La base osseuse semble basse sur ce releve."
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
          : "Les envies sucrees merite un encas plus cadre."
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
      return `${productName} aide a remettre un repere eau simple au quotidien.`;
    case "energy":
      return `${productName} vient soutenir l'elan du matin ou des heures creuses.`;
    case "sleep":
      return `${productName} accompagne une routine du soir plus calme.`;
    case "breakfast_structure":
      return `${productName} aide a cadrer un petit-dejeuner plus stable.`;
    case "protein_muscle":
      return `${productName} apporte un repere proteine plus simple a tenir.`;
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

export function buildAssessmentRecommendationPlan(
  source: AssessmentRecommendationSource
): AssessmentRecommendationPlan {
  const detectedNeeds = detectNeeds(source).slice(0, 4);
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

  const recommendedProgramId = getRecommendedProgramId(source.objective, detectedNeeds);

  return {
    needs,
    recommendedProgramId,
    recommendedProgramReason: getProgramReason(recommendedProgramId, detectedNeeds)
  };
}
