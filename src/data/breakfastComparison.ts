export type BreakfastMetricKey =
  | "kcal"
  | "protein"
  | "fiber"
  | "fastSugar"
  | "hydration";

export interface BreakfastMetricRange {
  min: number;
  max: number;
  unit: string;
  label: string;
  helper: string;
  classicQualifier: string;
  structuredQualifier: string;
}

export interface BreakfastProfileContent {
  title: string;
  subtitle: string;
  chips: string[];
}

export interface BreakfastFact {
  title: string;
  detail: string;
}

export const breakfastProfiles: Record<"classic" | "structured", BreakfastProfileContent> = {
  classic: {
    title: "Petit-dejeuner classique",
    subtitle:
      "Rapide et familier, mais souvent pauvre en proteines, peu hydratant et moins stable pour tenir toute la matinee.",
    chips: [
      "Peu de proteines",
      "Fibres souvent limitees",
      "Sucres rapides plus presents",
      "Hydratation quasi absente"
    ]
  },
  structured: {
    title: "Routine Lor'Squad",
    subtitle:
      "Une routine plus structuree avec boisson a l'aloe vera et Formula 1 pour installer un matin plus regulier, plus simple a reproduire et mieux cadre nutritionnellement.",
    chips: [
      "Hydratation des le matin",
      "Apport proteine vegetal",
      "Routine plus stable",
      "Petit-dejeuner plus structure"
    ]
  }
};

export const breakfastFacts: BreakfastFact[] = [
  {
    title: "Formula 1",
    detail:
      "Ingredients 100 % de source vegane, proteines d'origine vegetale et, selon la marque, 25 vitamines et mineraux."
  },
  {
    title: "Boisson aloe vera",
    detail:
      "Boisson a base d'aloe vera avec 40 % de jus presse a froid issu de feuilles entieres, utilisee ici comme repère d'hydratation."
  }
];

export const breakfastMetricRanges: Record<
  BreakfastMetricKey,
  {
    label: string;
    helper: string;
    classic: BreakfastMetricRange;
    structured: BreakfastMetricRange;
  }
> = {
  kcal: {
    label: "Kcal",
    helper: "Charge du matin",
    classic: {
      min: 320,
      max: 430,
      unit: "kcal",
      label: "320-430 kcal",
      helper: "Souvent plus improvise",
      classicQualifier: "Plus variable",
      structuredQualifier: "Plus cadre"
    },
    structured: {
      min: 220,
      max: 300,
      unit: "kcal",
      label: "220-300 kcal",
      helper: "Routine du matin plus cadree",
      classicQualifier: "Plus variable",
      structuredQualifier: "Plus cadre"
    }
  },
  protein: {
    label: "Proteines",
    helper: "Tenue de la matinee",
    classic: {
      min: 6,
      max: 10,
      unit: "g",
      label: "6-10 g",
      helper: "Plutot faible",
      classicQualifier: "Plutot faible",
      structuredQualifier: "Plus eleve"
    },
    structured: {
      min: 18,
      max: 24,
      unit: "g",
      label: "18-24 g",
      helper: "Apport plus structure",
      classicQualifier: "Plutot faible",
      structuredQualifier: "Plus eleve"
    }
  },
  fiber: {
    label: "Fibres",
    helper: "Regularite et satiete",
    classic: {
      min: 2,
      max: 4,
      unit: "g",
      label: "2-4 g",
      helper: "Souvent limite",
      classicQualifier: "Souvent limite",
      structuredQualifier: "Mieux structure"
    },
    structured: {
      min: 4,
      max: 7,
      unit: "g",
      label: "4-7 g",
      helper: "Plus structure",
      classicQualifier: "Souvent limite",
      structuredQualifier: "Mieux structure"
    }
  },
  fastSugar: {
    label: "Sucres rapides",
    helper: "Variation d'energie",
    classic: {
      min: 20,
      max: 30,
      unit: "g",
      label: "20-30 g",
      helper: "Plus presents",
      classicQualifier: "Plus presents",
      structuredQualifier: "Mieux cadres"
    },
    structured: {
      min: 8,
      max: 14,
      unit: "g",
      label: "8-14 g",
      helper: "Mieux cadres",
      classicQualifier: "Plus presents",
      structuredQualifier: "Mieux cadres"
    }
  },
  hydration: {
    label: "Hydratation",
    helper: "Presence des le matin",
    classic: {
      min: 0,
      max: 100,
      unit: "ml",
      label: "0-100 ml",
      helper: "Faible ou absente",
      classicQualifier: "Faible ou absente",
      structuredQualifier: "Presente des le matin"
    },
    structured: {
      min: 250,
      max: 350,
      unit: "ml",
      label: "250-350 ml",
      helper: "Repère d'hydratation present",
      classicQualifier: "Faible ou absente",
      structuredQualifier: "Presente des le matin"
    }
  }
};

export const breakfastMetricOrder: BreakfastMetricKey[] = [
  "kcal",
  "protein",
  "fiber",
  "fastSugar",
  "hydration"
];
