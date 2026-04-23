// Chantier étape 11 Programme proposé (2026-04-20)
// Source de vérité des 4 programmes proposables au client : Découverte,
// Premium, Booster 1, Booster 2.
// Les produits "routine matin" sont identifiés par leur id du pvCatalog
// (formula-1, pdm, aloe-vera, the-51g).

// Chantier 5 bugs (2026-04-24) : ajout "unit" pour la vente a l'unite
// (client veut un seul produit, pas de programme structure).
export type ProgramChoiceId = "discovery" | "premium" | "booster1" | "booster2" | "unit";

export interface ProgramChoice {
  id: ProgramChoiceId;
  title: string;
  price: number; // €
  shortContent: string;
  badge?: string;
  /** Produits routine matin inclus — ids pvCatalog. */
  routineProductIds: string[];
}

export const PROGRAM_CHOICES: ProgramChoice[] = [
  {
    id: "discovery",
    title: "Découverte",
    price: 159,
    shortContent: "F1 · Thé · Aloé",
    routineProductIds: ["formula-1", "the-51g", "aloe-vera"],
  },
  {
    id: "premium",
    title: "Premium",
    price: 234,
    shortContent: "Découverte + PDM",
    badge: "Best seller",
    routineProductIds: ["formula-1", "pdm", "aloe-vera", "the-51g"],
  },
  {
    id: "booster1",
    title: "Booster 1",
    price: 277,
    shortContent: "Premium + Digestion · ventre plat",
    routineProductIds: ["formula-1", "pdm", "aloe-vera", "the-51g"],
  },
  {
    id: "booster2",
    title: "Booster 2",
    price: 324,
    shortContent: "Premium + Énergie · brûle graisse",
    routineProductIds: ["formula-1", "pdm", "aloe-vera", "the-51g"],
  },
  {
    id: "unit",
    title: "À l'unité",
    price: 0,
    shortContent: "Produits choisis à la carte",
    routineProductIds: [],
  },
];

/** Descriptions courtes affichées dans la Routine matin (par id pvCatalog). */
export const ROUTINE_PRODUCT_DESCRIPTIONS: Record<string, { name: string; tagline: string }> = {
  "formula-1": {
    name: "Formula 1",
    tagline: "Repas équilibré · base du programme",
  },
  "pdm": {
    name: "Mélange pour Boisson Protéinée",
    tagline: "Protéines de qualité + vitamines",
  },
  "aloe-vera": {
    name: "Boisson Concentrée Aloe Vera",
    tagline: "Digestion · hydratation · transit",
  },
  "the-51g": {
    name: "Extrait de thé Herbalife",
    tagline: "Énergie douce · soutien brûle-graisses",
  },
};

export function getProgramById(id: ProgramChoiceId): ProgramChoice {
  return PROGRAM_CHOICES.find((p) => p.id === id) ?? PROGRAM_CHOICES[1]; // fallback Premium
}
