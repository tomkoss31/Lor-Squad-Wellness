// =============================================================================
// flavorGroups — registre statique « programme → saveurs » du parcours Qualif
// (2026-07-16, saveurs réelles Herbalife FR fournies par Thomas).
//
// Le catalogue produits (pv_products) ne modélise PAS les variantes de saveur.
// Or un programme standard (Découverte / Premium / Booster) contient PLUSIEURS
// produits à saveur : Formula 1 (boisson repas), Thé (boisson instantanée) et
// Aloé. Le client choisit UNE saveur par produit → on mappe ici, en dur, chaque
// programme vers la liste de ses groupes de saveurs. Les choix sont tracés dans
// client_qualif_onboarding.flavor_choices (map { groupKey: optionId }).
//
// Programme absent de ce registre (ex. « custom » suivi personnalisé) = pas
// d'étape saveur, on passe directement à la suite.
// =============================================================================

export interface FlavorOption {
  id: string;
  label: string;
  emoji: string;
}

export interface FlavorGroup {
  /** Clé stockée dans flavor_choices (ex. "f1", "the", "aloe"). */
  key: string;
  /** Nom du produit dont on choisit la saveur (titre de section). */
  productName: string;
  options: FlavorOption[];
}

// Formula 1 — boisson nutritionnelle (repas).
const F1_GROUP: FlavorGroup = {
  key: "f1",
  productName: "Formula 1 — ta boisson repas",
  options: [
    { id: "f1-vanille", label: "Vanille Onctueuse", emoji: "🍦" },
    { id: "f1-chocolat", label: "Chocolat gourmand", emoji: "🍫" },
    { id: "f1-cookie-crunch", label: "Cookie Crunch", emoji: "🍪" },
    { id: "f1-fraise", label: "Délice de Fraise", emoji: "🍓" },
    { id: "f1-banane", label: "Crème de Banane", emoji: "🍌" },
    { id: "f1-cafe-latte", label: "Café Latte", emoji: "☕" },
    { id: "f1-menthe-chocolat", label: "Duo Menthe Chocolat", emoji: "🌿" },
    { id: "f1-framboise-chocolat-blanc", label: "Framboise chocolat blanc (sans soja/lactose/gluten)", emoji: "🫐" },
  ],
};

// Boisson instantanée à base de Thé et d'extraits végétaux.
const THE_GROUP: FlavorGroup = {
  key: "the",
  productName: "Thé — ta boisson brûle-graisse",
  options: [
    { id: "the-original", label: "Original", emoji: "🍵" },
    { id: "the-citron", label: "Citron", emoji: "🍋" },
    { id: "the-peche", label: "Pêche", emoji: "🍑" },
    { id: "the-framboise", label: "Framboise", emoji: "🫐" },
    { id: "the-mangue-fruit-dragon", label: "Mangue Fruit du Dragon", emoji: "🐉" },
  ],
};

// Boisson concentrée à l'Aloe Vera.
const ALOE_GROUP: FlavorGroup = {
  key: "aloe",
  productName: "Aloé — ta boisson digestion",
  options: [
    { id: "aloe-nature", label: "Nature", emoji: "🌵" },
    { id: "aloe-mangue", label: "Mangue", emoji: "🥭" },
  ],
};

// Tous les programmes standard incluent F1 + Thé + Aloé (Découverte = « F1 · Thé
// · Aloé », Premium/Boosters partent de Découverte).
const STANDARD_GROUPS: FlavorGroup[] = [F1_GROUP, THE_GROUP, ALOE_GROUP];

// program_id (bilan_orders.program_id / pv_programs.id) → groupes de saveurs.
const PROGRAM_FLAVOR_GROUPS: Record<string, FlavorGroup[]> = {
  starter: STANDARD_GROUPS,
  premium: STANDARD_GROUPS,
  "booster-1": STANDARD_GROUPS,
  "booster-2": STANDARD_GROUPS,
};

/** Groupes de saveurs d'un programme (liste vide = pas d'étape saveur). */
export function getProgramFlavorGroups(programId: string | null | undefined): FlavorGroup[] {
  if (!programId) return [];
  return PROGRAM_FLAVOR_GROUPS[programId] ?? [];
}

const ALL_GROUPS: FlavorGroup[] = [F1_GROUP, THE_GROUP, ALOE_GROUP];

/** Libellé lisible « Produit : Saveur » depuis une clé de groupe + un id d'option. */
export function flavorChoiceLabel(groupKey: string, optionId: string): string | null {
  const group = ALL_GROUPS.find((g) => g.key === groupKey);
  const option = group?.options.find((o) => o.id === optionId);
  if (!group || !option) return null;
  const short = group.productName.split("—")[0].trim();
  return `${short} ${option.label}`;
}
