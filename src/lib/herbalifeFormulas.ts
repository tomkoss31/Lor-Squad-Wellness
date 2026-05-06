// =============================================================================
// herbalifeFormulas.ts — V2 calibree fiche RO Herbalife France (2026-11-07)
// =============================================================================
//
// Constantes et formules pour le calcul de l override (rentabilite) d'un
// distri-referent sur sa downline. Calibres sur la fiche Royalty Override
// reelle 2026-03 transmise par Thomas.
//
// Logique Herbalife :
// - Section C (Commissions) : sur chaque commande d'un downline non-Supervisor,
//   le sponsor Supervisor touche `commission% = 50 - %remise_downline`.
//   Mid-month rank-up gere ligne par ligne par Herbalife (au moment de la
//   commande, pas au mois). Donc en transcrivant le PV par TIER on reproduit
//   le calcul exact.
//
// - Section G (Royalty Override) : sur le Volume d'Organisation des downlines
//   eux-memes Supervisor (50%), le sponsor touche 5% (niveau 1, 2, 3) +
//   facteur d'equilibrage (~20% bonus PT) + 1% World Team Bonus si applicable.
//
// Ratio EUR/PV : moyenne ponderee verifiee sur Section G(1) — Volume Organisation
// 9 510 PV pour Prix Total HT 16 902,43 EUR -> 1,778 EUR/PV. Section C
// individuelle oscille entre 1.6 et 1.9 selon mix produit. On retient 1.78.
// =============================================================================

/** Ratio moyen pondere PV -> EUR HT en France (mix produit Herbalife typique).
 *  Source : fiche RO 2026-03 (16 902,43 EUR / 9 510 PV = 1,778). */
export const PV_TO_EUR_RATIO = 1.78;

/** Pourcentage de commission Supervisor sur les ventes downline par tier.
 *  Formule : commission% = 50 - %remise_downline. */
export const COMMISSION_PCT_BY_TIER = {
  pv15: 0.35, // downline acheteur prefere 15% -> sponsor touche 35%
  pv25: 0.25, // downline distributor 25% -> sponsor touche 25%
  pv35: 0.15, // downline senior consultant 35% -> sponsor touche 15%
  pv42: 0.08, // downline success builder 42% -> sponsor touche 8%
} as const;

/** Royalty Override sur Volume d'Organisation (downline Supervisor 50%).
 *  Niveau 1 / 2 / 3 = 5% chacun. */
export const ROYALTY_OVERRIDE_PCT = 0.05;

/** Breakdown PV mensuel d'un user (par tier de remise).
 *  Stocke dans pv_monthly_breakdown. Saisi par admin depuis la fiche distri. */
export interface PvMonthlyBreakdown {
  userId: string;
  month: string; // YYYY-MM Europe/Paris
  pv15: number;
  pv25: number;
  pv35: number;
  pv42: number;
  pvRoyalty: number;
  declaredBy: string | null;
  declaredAt: string | null;
}

/** Total PV d'un breakdown (pour la jauge Co-pilote du user lui-meme). */
export function totalPvFromBreakdown(b: PvMonthlyBreakdown): number {
  return (b.pv15 ?? 0) + (b.pv25 ?? 0) + (b.pv35 ?? 0) + (b.pv42 ?? 0) + (b.pvRoyalty ?? 0);
}

/** Override EUR qu'un sponsor recoit sur ce breakdown downline.
 *  = Sum(PV_tier x commission_tier%) + PV_royalty x 5%, le tout x 1.78 EUR/PV. */
export function computeOverrideEur(b: PvMonthlyBreakdown): number {
  const commissionPv =
    (b.pv15 ?? 0) * COMMISSION_PCT_BY_TIER.pv15 +
    (b.pv25 ?? 0) * COMMISSION_PCT_BY_TIER.pv25 +
    (b.pv35 ?? 0) * COMMISSION_PCT_BY_TIER.pv35 +
    (b.pv42 ?? 0) * COMMISSION_PCT_BY_TIER.pv42;
  const royaltyPv = (b.pvRoyalty ?? 0) * ROYALTY_OVERRIDE_PCT;
  return (commissionPv + royaltyPv) * PV_TO_EUR_RATIO;
}

/** Helper : empty breakdown pour bootstrap UI. */
export function emptyBreakdown(userId: string, month: string): PvMonthlyBreakdown {
  return {
    userId,
    month,
    pv15: 0,
    pv25: 0,
    pv35: 0,
    pv42: 0,
    pvRoyalty: 0,
    declaredBy: null,
    declaredAt: null,
  };
}

/** Mois courant Europe/Paris au format YYYY-MM. */
export function currentMonthIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
