// Chantier étape 11 Programme proposé (2026-04-20)
// Source de vérité des programmes proposables au client : Découverte,
// Premium, Booster 1, Booster 2 (perte de poids) + Découverte Sport,
// Premium Sport (sport) + Unité.
// Les produits "routine matin" sont identifiés par leur id du pvCatalog
// (formula-1, pdm, aloe-vera, the-51g).
//
// Chantier Prise de masse (2026-04-24) : ajout des programmes sport,
// des boosters sport optionnels (BOOSTERS), champ `category` sur
// ProgramChoice, et fusion de `mockPrograms` → export PROGRAMS_LEGACY
// pour AppContext.programs.

import type { Program } from "../types/domain";

// Chantier 5 bugs (2026-04-24) : ajout "unit" pour la vente a l'unite
// (client veut un seul produit, pas de programme structure).
// Chantier Prise de masse (2026-04-24) : ajout programmes sport.
export type ProgramChoiceId =
  | "discovery"
  | "premium"
  | "booster1"
  | "booster2"
  | "unit"
  | "sport-discovery"
  | "sport-premium";

export type ProgramChoiceCategory = "weight-loss" | "sport" | "unit";

export interface ProgramChoice {
  id: ProgramChoiceId;
  title: string;
  price: number; // €
  shortContent: string;
  badge?: string;
  category: ProgramChoiceCategory;
  /** Produits routine matin inclus — ids pvCatalog. */
  routineProductIds: string[];
}

export const PROGRAM_CHOICES: ProgramChoice[] = [
  {
    id: "discovery",
    title: "Découverte",
    price: 159,
    shortContent: "F1 · Thé · Aloé",
    category: "weight-loss",
    routineProductIds: ["formula-1", "the-51g", "aloe-vera"],
  },
  {
    id: "premium",
    title: "Premium",
    price: 234,
    shortContent: "Découverte + PDM",
    badge: "Best seller",
    category: "weight-loss",
    routineProductIds: ["formula-1", "pdm", "aloe-vera", "the-51g"],
  },
  {
    id: "booster1",
    title: "Booster 1",
    price: 277,
    shortContent: "Premium + Digestion · ventre plat",
    category: "weight-loss",
    routineProductIds: ["formula-1", "pdm", "aloe-vera", "the-51g"],
  },
  {
    id: "booster2",
    title: "Booster 2",
    price: 324,
    shortContent: "Premium + Énergie · brûle graisse",
    category: "weight-loss",
    routineProductIds: ["formula-1", "pdm", "aloe-vera", "the-51g"],
  },
  {
    id: "sport-discovery",
    title: "Découverte Sport",
    price: 190,
    shortContent: "F1 + Barres",
    category: "sport",
    routineProductIds: ["formula-1", "barres-proteinees-achieve"],
  },
  {
    id: "sport-premium",
    title: "Premium Sport",
    price: 285,
    shortContent: "F1 + Barres + Rebuild + CR7",
    badge: "Recommandé",
    category: "sport",
    routineProductIds: ["formula-1", "barres-proteinees-achieve", "rebuild-strength", "cr7-drive"],
  },
  {
    id: "unit",
    title: "À l'unité",
    price: 0,
    shortContent: "Produits choisis à la carte",
    category: "unit",
    routineProductIds: [],
  },
];

/** Boosters sport optionnels — Chantier Prise de masse (2026-04-24). */
export interface BoosterDef {
  id: string;
  productId: string;
  title: string;
  price: number; // €
  shortContent: string;
}

export const BOOSTERS: BoosterDef[] = [
  { id: "p-sport-boost-protein-snack", productId: "barres-proteinees-achieve", title: "Collations protéinées", price: 27.50, shortContent: "Barres 21 g de protéines" },
  { id: "p-sport-boost-liftoff", productId: "liftoff-max", title: "Pré-workout Liftoff", price: 38.50, shortContent: "Énergie avant la séance" },
  { id: "p-sport-boost-cr7", productId: "cr7-drive", title: "CR7 Drive (pendant effort)", price: 27.50, shortContent: "Glucides + électrolytes" },
  { id: "p-sport-boost-hydration", productId: "hydrate", title: "Hydrate (électrolytes)", price: 47.50, shortContent: "Récupération hydrique" },
  { id: "p-sport-boost-creatine", productId: "creatine-plus", title: "Créatine +", price: 47.50, shortContent: "Force et volume" },
  { id: "p-sport-boost-collagen", productId: "collagene-skin-booster", title: "Collagène Skin Booster", price: 84.50, shortContent: "Articulations + peau" },
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
  "barres-proteinees-achieve": {
    name: "Barres Protéinées Achieve H24",
    tagline: "21 g de protéines par barre · collation sport",
  },
  "rebuild-strength": {
    name: "Rebuild Strength",
    tagline: "Récupération musculaire post-entraînement",
  },
  "cr7-drive": {
    name: "CR7 Drive",
    tagline: "Glucides + électrolytes pendant l'effort",
  },
};

export function getProgramById(id: ProgramChoiceId): ProgramChoice {
  return PROGRAM_CHOICES.find((p) => p.id === id) ?? PROGRAM_CHOICES[1]; // fallback Premium
}

// ─── Compatibilité AppContext.programs (ex-mockPrograms) ────────────────
// Le reste de l'app consomme encore `Program[]` (accent/badge/summary/
// benefits). On reconstruit le format legacy depuis PROGRAM_CHOICES +
// BOOSTERS sans dupliquer de données structurantes.

const ACCENTS: Array<Program["accent"]> = ["blue", "green", "red"];

function programFromChoice(c: ProgramChoice, i: number): Program {
  return {
    id: `p-${c.id}`,
    title: c.title,
    category: c.category === "unit" ? "weight-loss" : c.category,
    kind: "main",
    price: `${c.price} EUR`,
    summary: c.shortContent,
    benefits: [c.shortContent],
    composition: c.routineProductIds,
    accent: ACCENTS[i % ACCENTS.length],
    badge: c.badge ?? c.title,
  };
}

function programFromBooster(b: BoosterDef, i: number): Program {
  return {
    id: b.id,
    title: b.title,
    category: "sport",
    kind: "booster",
    price: `+${b.price.toFixed(2)} EUR`,
    summary: b.shortContent,
    benefits: [b.shortContent],
    accent: ACCENTS[i % ACCENTS.length],
    badge: "Option",
  };
}

/**
 * Format legacy consommé par AppContext.programs. Les composants qui
 * liront cette liste verront les 7 programmes principaux (perte de poids
 * + sport + unit) et les 6 boosters sport. L'UX premium (étape bilan)
 * utilise PROGRAM_CHOICES / BOOSTERS directement.
 */
export const PROGRAMS_LEGACY: Program[] = [
  ...PROGRAM_CHOICES.filter((c) => c.category !== "unit").map(programFromChoice),
  ...BOOSTERS.map(programFromBooster),
];

// Mapping des produits inclus par programme (clé = id legacy `p-${choice.id}`).
// Source de vérité unique pour éviter les divergences entre composants.
// Couvre TOUS les programmes (weight-loss + sport + unit).
// Audit Bug #5 — sport-discovery / sport-premium étaient absents,
// le coach choisissant "Premium Sport" récupérait une routine matin vide.
export const PROGRAM_INCLUDED_PRODUCT_IDS: Record<string, string[]> = {
  "p-discovery": ["aloe-vera", "the-51g", "formula-1"],
  "p-premium": ["aloe-vera", "the-51g", "formula-1", "pdm"],
  "p-booster1": ["aloe-vera", "the-51g", "formula-1", "pdm", "multifibres"],
  "p-booster2": ["aloe-vera", "the-51g", "formula-1", "pdm", "phyto-brule-graisse"],
  "p-sport-discovery": ["formula-1", "barres-proteinees-achieve"],
  "p-sport-premium": ["formula-1", "barres-proteinees-achieve", "rebuild-strength", "cr7-drive"],
  "p-unit": [],
};
