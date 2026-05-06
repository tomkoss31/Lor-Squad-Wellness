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

// =============================================================================
// V2.1 — Compression chain & rank progression (chantier 2026-11-07)
// =============================================================================

/** Pourcentage de remise pour chaque rang (0-100). */
export function tierPctForRank(rank: string | null | undefined): number {
  if (!rank) return 25;
  if (rank === "distributor_25") return 25;
  if (rank === "senior_consultant_35") return 35;
  if (rank === "success_builder_42") return 42;
  return 50; // tous les paliers Supervisor+ sont a 50%
}

/** Mappe un nom de tier (15/25/35/42) vers son pourcentage 0-100. */
export const TIER_LABELS: Array<{ key: keyof PvMonthlyBreakdown; pct: number }> = [
  { key: "pv15", pct: 15 },
  { key: "pv25", pct: 25 },
  { key: "pv35", pct: 35 },
  { key: "pv42", pct: 42 },
  // pv_royalty est traite a part (volume Supervisor 50%)
];

/**
 * Calcule la commission EUR qu'un sponsor recoit sur un downstream Y en
 * appliquant la regle de COMPRESSION Herbalife.
 *
 * @param yBreakdown breakdown PV de Y
 * @param sponsorTierPct rang du sponsor (Thomas=50, Mandy=42, ...)
 * @param intermediateTiers tiers des intermediaires entre Y et le sponsor
 *   exclu (vide si Y est en niveau direct du sponsor).
 *
 * Pour chaque tier (15/25/35/42) ou Y a fait du PV :
 *   maxUpstream = max(yTier, ...intermediateTiers)
 *   cut% = max(0, sponsorTierPct - maxUpstream)
 *   cutEur += PV_a_ce_tier x cut% x ratio
 *
 * Royalty (5%) appliquee sur Y.pv_royalty si tous les intermediaires sont
 * deja a 50% (sinon les intermediaires absorbent et royalty=0 pour le sponsor).
 */
export function computeSponsorCutOnDownstream(
  yBreakdown: PvMonthlyBreakdown,
  sponsorTierPct: number,
  intermediateTiers: number[],
): number {
  let cutEur = 0;
  const maxIntermediate = intermediateTiers.length > 0 ? Math.max(...intermediateTiers) : 0;

  for (const tier of TIER_LABELS) {
    const pv = (yBreakdown[tier.key] as number) ?? 0;
    if (pv <= 0) continue;
    const maxUpstream = Math.max(tier.pct, maxIntermediate);
    const cutPct = Math.max(0, sponsorTierPct - maxUpstream) / 100;
    cutEur += pv * cutPct * PV_TO_EUR_RATIO;
  }

  // Royalty : applicable seulement si TOUS les intermediaires sont >= 50%
  // (sinon le premier upline non-Supervisor casse la chaine de royalty).
  const allIntermediatesSupervisor = intermediateTiers.every((t) => t >= 50);
  if (allIntermediatesSupervisor && yBreakdown.pvRoyalty > 0) {
    cutEur += yBreakdown.pvRoyalty * ROYALTY_OVERRIDE_PCT * PV_TO_EUR_RATIO;
  }

  return cutEur;
}

// ─── Rank progression thresholds (jauge UI vers prochain rang) ────────────
// Sources : Herbalife Marketing Plan FR. Simplifies pour UI :
//   - Distributor 25% -> Senior Consultant 35% : 500 PV en 1 mois
//   - Senior Consultant 35% -> Success Builder 42% : 1000 PV en 1 mois
//   - Success Builder 42% -> Supervisor 50% : 4000 PV en 1 mois
// (les voies cumulatives sur 12 mois existent mais sont moins lisibles UI)

export interface RankProgression {
  currentLabel: string;
  nextRank: string | null;
  nextLabel: string | null;
  pvNeeded: number;
  pvCurrent: number;
  pct: number; // 0-100
  remaining: number;
  /** "personal" : juste le PV perso du user.
   *  "personal_extended" : perso + downline non-Supervisor (qualif Supervisor 4000 PV). */
  pvSource: "personal" | "personal_extended";
}

const RANK_PROGRESSION_THRESHOLDS: Record<
  string,
  { nextKey: string; pvNeeded: number; source: "personal" | "personal_extended" }
> = {
  distributor_25: { nextKey: "senior_consultant_35", pvNeeded: 500, source: "personal" },
  senior_consultant_35: { nextKey: "success_builder_42", pvNeeded: 1000, source: "personal" },
  // Supervisor 4000 PV : on compte le PV perso + downline NON-Supervisor.
  // Tant que personne en bas n'est Supervisor, ses PV comptent comme PV perso
  // du sponsor (regle Herbalife confirmee Thomas 2026-11-07). Quand un downline
  // devient Supervisor, sa branche "casse" et ne compte plus pour ce calcul
  // (mais bascule en Royalty Override 5% pour les paliers superieurs).
  success_builder_42: { nextKey: "supervisor_50", pvNeeded: 4000, source: "personal_extended" },
};

const RANK_LABEL_FALLBACK: Record<string, string> = {
  distributor_25: "Distributor (25%)",
  senior_consultant_35: "Senior Consultant (35%)",
  success_builder_42: "Success Builder (42%)",
  supervisor_50: "Supervisor (50%)",
};

/**
 * "PV personnel etendu" d'un user : son PV perso + les PV de sa downline
 * NON-SUPERVISOR (recursif). On stoppe la branche des qu'on rencontre un
 * Supervisor 50%+ (les volumes de cette branche basculent en "Volume
 * d'Organisation", utilise pour les paliers AU-DESSUS de Supervisor —
 * pas pour devenir Supervisor).
 *
 * C'est ce total qui fait avancer un Success Builder vers les 4000 PV
 * de qualification Supervisor (regle Herbalife confirmee Thomas 2026-11-07).
 *
 * @param userId user dont on calcule la PV qualifiante
 * @param users  liste users avec sponsorId + currentRank
 * @param breakdowns breakdowns du mois (pour PV par user)
 * @param fallbackTotalForUser fn optionnelle pour fallback monthly_pv_override
 */
export function computeQualifyingPersonalPv(
  userId: string,
  users: Array<{
    id: string;
    sponsorId?: string;
    currentRank?: string | null;
    frozenAt?: string | null;
  }>,
  breakdowns: PvMonthlyBreakdown[],
  fallbackTotalForUser?: (userId: string) => number,
): number {
  const breakdownByUserId = new Map<string, PvMonthlyBreakdown>();
  for (const b of breakdowns) breakdownByUserId.set(b.userId, b);
  const childrenBySponsor = new Map<string, typeof users>();
  for (const u of users) {
    if (u.frozenAt) continue;
    if (!u.sponsorId) continue;
    const arr = childrenBySponsor.get(u.sponsorId) ?? [];
    arr.push(u);
    childrenBySponsor.set(u.sponsorId, arr);
  }

  const pvForUser = (uid: string): number => {
    const b = breakdownByUserId.get(uid);
    if (b) return totalPvFromBreakdown(b);
    if (fallbackTotalForUser) return fallbackTotalForUser(uid);
    return 0;
  };

  // BFS : on inclut le user de depart + sa downline tant qu'on ne croise pas
  // un Supervisor (le Supervisor downstream "casse" la branche : ses PV ne
  // comptent plus pour la qualif Supervisor du user courant).
  let total = pvForUser(userId);
  const queue: string[] = [...(childrenBySponsor.get(userId) ?? []).map((u) => u.id)];
  const visited = new Set<string>([userId]);
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const u = users.find((x) => x.id === id);
    if (!u) continue;
    // Si c'est un Supervisor ou plus, on arrete la branche (ne compte pas
    // ce user ni sa downline). C'est la "breakaway" Herbalife.
    if (tierPctForRank(u.currentRank) >= 50) continue;
    total += pvForUser(id);
    const children = childrenBySponsor.get(id) ?? [];
    for (const c of children) queue.push(c.id);
  }
  return total;
}

/** @deprecated Renomme en computeQualifyingPersonalPv (mais sans breakaway).
 *  Conserve pour compat retro-arriere. */
export const computeOrganizationPv = computeQualifyingPersonalPv;

/**
 * Manual PV entry (V3 chantier 2026-11-07) : entree saisie a la main par
 * un sponsor pour un downline qui n'est pas dans Lor'Squad.
 */
export interface ManualPvEntry {
  id: string;
  viewerUserId: string;
  name: string;
  parentName: string | null;
  depth: 1 | 2 | 3;
  ownTierPct: number; // 15/25/35/42/50
  intermediateTiers: number[]; // [] pour L1, [42] pour L2, [42, 35] pour L3
  month: string;
  pv15: number;
  pv25: number;
  pv35: number;
  pv42: number;
  pvRoyalty: number;
  declaredAt: string | null;
}

/** Convert a manual entry vers PvMonthlyBreakdown-like pour reutiliser
 *  computeSponsorCutOnDownstream. */
function manualEntryAsBreakdown(e: ManualPvEntry): PvMonthlyBreakdown {
  return {
    userId: `manual:${e.id}`,
    month: e.month,
    pv15: e.pv15,
    pv25: e.pv25,
    pv35: e.pv35,
    pv42: e.pv42,
    pvRoyalty: e.pvRoyalty,
    declaredBy: null,
    declaredAt: e.declaredAt,
  };
}

/**
 * Calcule la cut totale du viewer sur toutes ses entrees manuelles.
 * Reutilise la regle de compression : pour chaque entree, on simule le chemin
 * sponsor -> user manuel avec les intermediate_tiers fournis.
 *
 * @param entries entrees manuelles owned par le viewer
 * @param viewerTierPct rang du viewer (Thomas 50%, Mandy 42%, ...)
 */
export function computeManualEntriesOverride(
  entries: ManualPvEntry[],
  viewerTierPct: number,
): number {
  let total = 0;
  for (const e of entries) {
    // L1 : intermediateTiers vide. L2/L3 : contient les tiers du chemin.
    const intermediates = e.depth === 1 ? [] : e.intermediateTiers;
    total += computeSponsorCutOnDownstream(
      manualEntryAsBreakdown(e),
      viewerTierPct,
      intermediates,
    );
  }
  return total;
}

/**
 * Calcule la marge retail propre d un user sur SES propres ventes (depuis
 * son breakdown saisi). Pour chaque tier ou il a vendu, il garde
 * (mon_tier - acheteur_tier) % de commission.
 *
 * Cas type : Mandy 42% vend a un client prefere 15% pour 100 PV.
 *   - Mandy garde (42-15) = 27% × 100 PV × 1.78 = 48 EUR
 *   - Son sponsor (Thomas 50%) prend (50-42) = 8% × 100 PV × 1.78 = 14 EUR
 *   - Total commission = 35% × CA = 50% retail margin distribue
 *
 * Si le breakdown perso est saisi, on utilise CETTE marge plutot que celle
 * remontee par la RPC SQL (qui ne lit que les ventes APP). Permet de
 * capturer les ventes Bizworks externes que Mandy fait hors-fiche client.
 */
export function computeOwnSelfMargin(
  breakdown: PvMonthlyBreakdown,
  userTierPct: number,
): number {
  let total = 0;
  for (const tier of TIER_LABELS) {
    const pv = (breakdown[tier.key] as number) ?? 0;
    if (pv <= 0) continue;
    const cutPct = Math.max(0, userTierPct - tier.pct) / 100;
    total += pv * cutPct * PV_TO_EUR_RATIO;
  }
  // Royalty 5% si user lui-meme touche du royalty (cas Supervisor avec
  // downline Sup) — pour V2 c est rare, on ignore.
  return total;
}

/**
 * Tree-walk : pour un sponsor (viewer), calcule l override total EUR sur
 * TOUTE son organisation (recursif), en appliquant la regle de compression
 * Herbalife. Reutilise par la jauge principale + l onglet Distributeurs.
 *
 * @param viewerIds tableau d IDs (couple agrege ou single user)
 * @param users    liste complete des users (sponsorId + currentRank + frozenAt)
 * @param breakdowns liste des breakdowns du mois courant
 * @param fallbackOverrideForUser fn optionnelle pour fallback sur monthly_pv_override
 *                                quand pas de breakdown V2 saisi
 */
export function computeViewerDownlineOverride(
  viewerIds: string[],
  users: Array<{
    id: string;
    sponsorId?: string;
    currentRank?: string | null;
    frozenAt?: string | null;
  }>,
  breakdowns: PvMonthlyBreakdown[],
  fallbackOverrideForUser?: (userId: string) => { totalPv: number; tierPct: number } | null,
): number {
  const breakdownByUserId = new Map<string, PvMonthlyBreakdown>();
  for (const b of breakdowns) breakdownByUserId.set(b.userId, b);

  // Viewer tier = max des tiers du scope (couple : on prend le plus haut).
  const viewerTierPct = Math.max(
    ...viewerIds.map((uid) => {
      const u = users.find((x) => x.id === uid);
      return tierPctForRank(u?.currentRank);
    }),
  );

  // Index sponsor -> children pour walk efficace
  const childrenBySponsor = new Map<string, typeof users>();
  for (const u of users) {
    if (u.frozenAt) continue;
    if (!u.sponsorId) continue;
    const arr = childrenBySponsor.get(u.sponsorId) ?? [];
    arr.push(u);
    childrenBySponsor.set(u.sponsorId, arr);
  }

  interface Frame {
    user: typeof users[0];
    intermediateTiers: number[];
  }
  const queue: Frame[] = [];
  for (const ownerId of viewerIds) {
    const directs = childrenBySponsor.get(ownerId) ?? [];
    for (const u of directs) queue.push({ user: u, intermediateTiers: [] });
  }

  let total = 0;
  while (queue.length > 0) {
    const frame = queue.shift()!;
    const { user: u, intermediateTiers } = frame;
    const breakdown = breakdownByUserId.get(u.id);
    if (breakdown) {
      total += computeSponsorCutOnDownstream(breakdown, viewerTierPct, intermediateTiers);
    } else if (fallbackOverrideForUser) {
      const fb = fallbackOverrideForUser(u.id);
      if (fb && fb.totalPv > 0) {
        const maxUpstream = Math.max(fb.tierPct, ...intermediateTiers);
        const cutPct = Math.max(0, viewerTierPct - maxUpstream) / 100;
        total += fb.totalPv * cutPct * PV_TO_EUR_RATIO;
      }
    }
    const yTierPct = tierPctForRank(u.currentRank);
    const childList = childrenBySponsor.get(u.id) ?? [];
    for (const child of childList) {
      queue.push({
        user: child,
        intermediateTiers: [...intermediateTiers, yTierPct],
      });
    }
  }
  return total;
}

/**
 * Retourne la progression du distri vers son prochain palier.
 *
 * @param currentRank rang actuel
 * @param personalPv  PV perso ce mois (somme breakdown ou monthly_pv_override)
 * @param qualifyingPersonalPv  Pour Success Builder->Supervisor uniquement :
 *                              PV perso + downline non-Supervisor cumule.
 *                              Si non fourni, fallback sur personalPv.
 */
export function rankProgression(
  currentRank: string | null | undefined,
  personalPv: number,
  qualifyingPersonalPv?: number,
): RankProgression | null {
  const rank = currentRank ?? "distributor_25";
  const threshold = RANK_PROGRESSION_THRESHOLDS[rank];
  if (!threshold) {
    // Deja Supervisor+ : on n affiche pas de jauge progression simple
    return null;
  }
  const pvCurrent =
    threshold.source === "personal_extended"
      ? (qualifyingPersonalPv ?? personalPv)
      : personalPv;
  const pct = Math.min(100, Math.round((pvCurrent / threshold.pvNeeded) * 100));
  return {
    currentLabel: RANK_LABEL_FALLBACK[rank] ?? rank,
    nextRank: threshold.nextKey,
    nextLabel: RANK_LABEL_FALLBACK[threshold.nextKey] ?? threshold.nextKey,
    pvNeeded: threshold.pvNeeded,
    pvCurrent: Math.max(0, pvCurrent),
    pct,
    remaining: Math.max(0, threshold.pvNeeded - pvCurrent),
    pvSource: threshold.source as "personal" | "personal_extended",
  };
}
