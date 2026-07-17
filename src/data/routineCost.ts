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
    detail: "25 vitamines et minéraux et 24 g de protéines, dans un verre, en 2 minutes.",
  },
  "pdm": {
    title: "Le même petit-déj, sans lactose",
    detail:
      "Préparé à l'eau plutôt qu'au lait : tu montes à 24 g de protéines et tu enlèves le lactose.",
  },
  "aloe-vera": {
    title: "Ton hydratation de la journée",
    detail: "15 ml dans ta bouteille d'un litre. À base de plante.",
  },
  "the-51g": {
    title: "Ton coup de fouet sans le crash",
    detail: "1,7 g dans un litre, à siroter dans la matinée.",
  },
  "multifibres": {
    title: "Les fibres qui manquent à presque tout le monde",
    detail: "Une dose par jour, dans un grand verre d'eau.",
  },
  "phyto-brule-graisse": {
    title: "Le coup de pouce métabolisme",
    detail:
      "Le chrome contribue au maintien d'une glycémie normale. Vitamine C et niacine aident à réduire la fatigue.",
  },
  "night-mode": {
    title: "Ta nuit",
    detail:
      "Safran extrait à froid, vitamine B6 et riboflavine, qui contribuent au fonctionnement normal du système nerveux. Une heure avant le coucher.",
  },
};
