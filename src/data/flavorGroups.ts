// =============================================================================
// flavorGroups — registre statique « programme → saveurs » du parcours Qualif
// (2026-07-16).
//
// Le catalogue produits (pv_products) ne modélise PAS les variantes de saveur :
// « Formula 1 » y est UN seul produit générique. Or tous les programmes
// standard (Starter / Premium / Booster) contiennent une boisson Formula 1 dont
// le client doit choisir la saveur après paiement. On mappe donc ici, en dur,
// chaque programme vers la liste des saveurs Formula 1 (pas de migration DB :
// c'est un choix de présentation, la valeur retenue est tracée dans
// client_qualif_onboarding.flavor_product_id).
//
// Programme absent de ce registre (ex. « custom » suivi personnalisé) = pas
// d'étape saveur, on passe directement à la suite.
// =============================================================================

export interface FlavorOption {
  /** Stocké dans client_qualif_onboarding.flavor_product_id. */
  id: string;
  label: string;
  emoji: string;
}

export interface FlavorGroup {
  /** Nom du produit dont on choisit la saveur (affiché en tête d'étape). */
  productName: string;
  intro: string;
  options: FlavorOption[];
}

// Saveurs Formula 1 Herbalife (marché FR). Ordre = du plus classique au plus
// gourmand.
const FORMULA1_GROUP: FlavorGroup = {
  productName: "Formula 1 — ta boisson repas",
  intro: "Ta boisson Formula 1 existe en plusieurs saveurs. Choisis celle qui te fait envie — tu pourras en changer à ta prochaine commande.",
  options: [
    { id: "f1-vanille", label: "Vanille crème", emoji: "🍦" },
    { id: "f1-chocolat", label: "Chocolat onctueux", emoji: "🍫" },
    { id: "f1-cookies", label: "Cookies crème", emoji: "🍪" },
    { id: "f1-fraise", label: "Fraise gourmande", emoji: "🍓" },
    { id: "f1-menthe-chocolat", label: "Menthe chocolat", emoji: "🌿" },
    { id: "f1-cappuccino", label: "Cappuccino", emoji: "☕" },
    { id: "f1-banane", label: "Banane crème", emoji: "🍌" },
    { id: "f1-fruits-des-bois", label: "Fruits des bois", emoji: "🫐" },
  ],
};

// program_id (bilan_orders.program_id / pv_programs.id) → groupe de saveurs.
// Tous les programmes standard incluent une Formula 1 → même groupe.
const FLAVOR_GROUPS: Record<string, FlavorGroup> = {
  starter: FORMULA1_GROUP,
  premium: FORMULA1_GROUP,
  "booster-1": FORMULA1_GROUP,
  "booster-2": FORMULA1_GROUP,
};

/** Renvoie le groupe de saveurs d'un programme, ou null si pas d'étape saveur. */
export function getFlavorGroup(programId: string | null | undefined): FlavorGroup | null {
  if (!programId) return null;
  return FLAVOR_GROUPS[programId] ?? null;
}

/** Libellé lisible d'une saveur depuis son id (pour l'affichage coach). */
export function flavorLabel(flavorId: string | null | undefined): string | null {
  if (!flavorId) return null;
  for (const group of Object.values(FLAVOR_GROUPS)) {
    const match = group.options.find((o) => o.id === flavorId);
    if (match) return match.label;
  }
  return flavorId;
}
