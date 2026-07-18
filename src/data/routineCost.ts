// =============================================================================
// routineCost — le coût RÉEL d'une routine, par jour (2026-07-17)
// =============================================================================
//
// POURQUOI CE FICHIER
// Le prix d'un pack (234 €) ne dit rien à un prospect : il arrive nu, et il fait
// reculer. Le €/jour, lui, se compare à quelque chose qu'il connaît — sa pause
// déjeuner. C'est le renversement de la page Résultat Bilan : « tu dépenses déjà
// plus pour ton seul déjeuner que pour ta journée complète ».
//
// LE CALCUL N'EST PAS « prix du pack / durée du pack »
// Chaque produit tient un nombre de jours DIFFÉRENT à la dose réellement
// prescrite : le Formula 1 s'épuise en 21 jours quand le PDM en tient 42. Diviser
// le pack par la durée d'un seul produit donne un chiffre faux (c'est l'erreur
// qu'on a faite au premier jet : 11,14 €/j au lieu de 7,90 €/j). On somme donc le
// coût journalier de CHAQUE produit.
//
// ⚠️ LES DOSES VIENNENT DU TERRAIN, PAS DE LA DB
// Aucune table ne porte « 15 ml d'Aloé par litre ». Ce sont les doses que Thomas
// prescrit (confirmées le 2026-07-17). Si une dose change, c'est ICI qu'on la
// corrige — et le €/jour de toute la page suit.
// =============================================================================

/**
 * Nombre de jours que tient chaque produit à la dose prescrite.
 * Clés = ids du catalogue PV (`pv_products.id`), tels que renvoyés par l'edge
 * `get-online-bilan-results`.
 */
export const PRODUCT_DAYS: Record<string, number> = {
  "aloe-vera": 473 / 15, // 473 ml · 15 ml par litre de boisson · base 1 L/jour → 31,5 j
  "the-51g": 51 / 1.7, // 51 g · 1,7 g par litre · base 1 L/jour → 30 j
  "formula-1": 21, // 21 doses · 1 par jour
  "pdm": 42, // 42 doses · 1 par jour
  "multifibres": 30, // 30 doses · 1 par jour
  "phyto-brule-graisse": 30, // 60 gélules · 2 par jour
  "night-mode": 30, // 180 g · 6 g par dose · 1 par jour
};

/**
 * Moyenne française d'une pause déjeuner — enquête Edenred / Ifop.
 * Repères de la même étude : 7,50 € sans titre-restaurant, 10 € avec,
 * 9,80 € en Île-de-France. C'est LE point de comparaison de la page : ne pas le
 * remplacer par une estimation maison sans source.
 */
export const LUNCH_AVG_EUR = 8.3;

/**
 * Coût journalier d'un ensemble de produits.
 *
 * Renvoie `null` — et jamais un chiffre approximatif — dès qu'un produit n'a pas
 * de dose connue ou pas de prix : mieux vaut masquer le €/jour que d'afficher un
 * montant faux sur une page qui vend.
 */
export function dailyCost(
  productIds: string[],
  priceById: Map<string, number>,
): number | null {
  if (productIds.length === 0) return null;
  let total = 0;
  for (const id of productIds) {
    const days = PRODUCT_DAYS[id];
    const price = priceById.get(id);
    if (!days || days <= 0 || price === undefined) return null;
    total += price / days;
  }
  return total;
}

/** « 7,90 € » — format FR, 2 décimales, insécable avant l'euro. */
export function formatEur(value: number): string {
  return `${value.toFixed(2).replace(".", ",")} €`;
}

/**
 * Nom court et PROPRE d'un produit (accentué, non technique) pour les listes —
 * ex. les puces des cartes de formules. Les `name` bruts du catalogue PV
 * ("Melange pour boisson proteinee", "Boisson instantanee a base de the 51 g")
 * sont sans accents et jargonnants : on ne les montre JAMAIS au prospect.
 * Fallback = le nom brut si l'id n'est pas mappé (packs = ces ids uniquement).
 */
export const PRODUCT_SHORT: Record<string, string> = {
  "formula-1": "Formula 1",
  "pdm": "Protéines sans lactose",
  "aloe-vera": "Aloé Vera",
  "the-51g": "Thé",
  "multifibres": "Multifibres",
  "phyto-brule-graisse": "Phyto Complete",
  "night-mode": "Night Mode",
};

/**
 * Les produits en langage humain.
 *
 * Le problème d'origine (signalé par Thomas) : la page affichait « F1 · PDM · Thé
 * · Aloé ». Pour quelqu'un qui découvre, ce sont quatre sigles et une facture.
 * `title` est ce qu'on montre en grand, le nom catalogue passe en second.
 */
export const PRODUCT_HUMAN: Record<
  string,
  { title: string; detail: string }
> = {
  "formula-1": {
    title: "Ton petit-déjeuner complet",
    detail: "Prêt en 2 minutes, dans un verre.",
  },
  "pdm": {
    title: "La version sans lactose",
    detail: "Le même petit-déj, préparé à l'eau.",
  },
  "aloe-vera": {
    title: "Ton hydratation de la journée",
    detail: "À glisser dans ta bouteille d'eau.",
  },
  "the-51g": {
    title: "Ton coup de boost du matin",
    detail: "À siroter dans la matinée.",
  },
  "multifibres": {
    title: "Les fibres du quotidien",
    detail: "Une dose dans un grand verre d'eau.",
  },
  "phyto-brule-graisse": {
    title: "Le coup de pouce métabolisme",
    detail: "Une gélule à chaque repas.",
  },
  "night-mode": {
    title: "Ta nuit",
    detail: "Une tisane au safran, avant de dormir.",
  },
};
