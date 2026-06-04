// =============================================================================
// useRentabilitySummary — source de vérité UNIQUE du gain rentabilité.
//
// Centralise le calcul du "Tu gagnes ce mois" pour que TOUTES les surfaces
// (carte wallet, widget Co-pilote, widget horizontal, page /rentabilite)
// affichent exactement le même total. Avant ce hook, chaque composant
// dupliquait le calcul — et seul /rentabilite avait reçu le branchement du
// fallback ventes app, d'où les chiffres divergents (228 vs 246).
//
// Composition du total :
//   directMargin     = marge retail du distri sur ses propres clients
//   + downlineOverride = override royalty sur la downline (ventes app réelles
//                        via pv_client_products, ou breakdown Bizworks manuel
//                        s'il porte du PV) — multi-niveaux, ventilé par membre
//   + manualOverride  = entrées manuelles distri hors-app
// =============================================================================

import { useCallback, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { useUserRentability, type RentabilityData } from "./useUserRentability";
import { usePvBreakdowns } from "./usePvBreakdowns";
import { useManualPvEntries } from "./useManualPvEntries";
import {
  computeManualEntriesOverride,
  computeOwnSelfMargin,
  computeViewerOverridePerMember,
  currentMonthIso,
  tierPctForRank,
  totalPvFromBreakdown,
} from "../lib/herbalifeFormulas";

export interface RentabilitySummary {
  data: RentabilityData | null;
  loading: boolean;
  error: string | null;
  isCoupleAggregated: boolean;
  monthIso: string;
  /** Marge retail directe (ses propres clients). */
  directMargin: number;
  /** Override royalty sur la downline (ventes app réelles + breakdown manuel). */
  downlineOverride: number;
  /** Override entrées manuelles hors-app. */
  manualOverride: number;
  /** directMargin + downlineOverride + manualOverride. */
  totalMargin: number;
  /** data avec margin_eur + projection_eur patchés au total (pour les jauges). */
  dataWithOverride: RentabilityData | null;
  /** Override du viewer ventilé par membre downline (userId → EUR). */
  overridePerMember: Map<string, number>;
  /** PV mois courant → { totalPv, tierPct } pour le calcul d'override par membre. */
  fallbackOverrideForUser: (userId: string) => { totalPv: number; tierPct: number } | null;
  prevMonthEur: number;
  delta: number;
  projection: number;
  refetch: () => Promise<void>;
}

export function useRentabilitySummary(
  userId: string | null,
  monthIsoArg?: string,
): RentabilitySummary {
  const { users, pvClientProducts } = useAppContext();
  const monthIso = useMemo(() => monthIsoArg ?? currentMonthIso(), [monthIsoArg]);
  const { data, loading, error, isCoupleAggregated, refetch } = useUserRentability(
    userId,
    monthIsoArg,
  );
  const { breakdowns } = usePvBreakdowns(monthIso);
  const { entries: manualEntries } = useManualPvEntries(
    data?.scope_user_ids ?? null,
    monthIso,
  );

  // PV app réel par distri (mois courant) — même table que la RPC de marge
  // (pv_client_products), mêmes filtres : actif + start_date du mois.
  const memberPvMonthMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of pvClientProducts) {
      if (!p.active) continue;
      if ((p.startDate ?? "").slice(0, 7) !== monthIso) continue;
      const pv = (p.pvPerUnit || 0) * (p.quantityStart || 0);
      if (pv <= 0) continue;
      map.set(p.responsibleId, (map.get(p.responsibleId) ?? 0) + pv);
    }
    return map;
  }, [pvClientProducts, monthIso]);

  const fallbackOverrideForUser = useCallback(
    (uid: string): { totalPv: number; tierPct: number } | null => {
      const pv = memberPvMonthMap.get(uid) ?? 0;
      if (pv <= 0) return null;
      const u = users.find((x) => x.id === uid);
      return { totalPv: pv, tierPct: tierPctForRank(u?.currentRank) };
    },
    [memberPvMonthMap, users],
  );

  const mappedUsers = useMemo(
    () =>
      users.map((u) => ({
        id: u.id,
        sponsorId: u.sponsorId,
        currentRank: u.currentRank,
        frozenAt: u.frozenAt,
      })),
    [users],
  );

  const overridePerMember = useMemo(() => {
    if (!data) return new Map<string, number>();
    return computeViewerOverridePerMember(
      data.scope_user_ids,
      mappedUsers,
      breakdowns,
      fallbackOverrideForUser,
    );
  }, [data, mappedUsers, breakdowns, fallbackOverrideForUser]);

  const downlineOverride = useMemo(() => {
    let sum = 0;
    for (const v of overridePerMember.values()) sum += v;
    return sum;
  }, [overridePerMember]);

  // Marge directe : si un breakdown Bizworks porte du PV, on prend MAX(breakdown,
  // RPC) (capture les ventes hors-app) ; sinon la vérité RPC (ventes app).
  const directMargin = useMemo(() => {
    if (!data) return 0;
    let total = 0;
    let any = false;
    for (const ownerId of data.scope_user_ids) {
      const b = breakdowns.find((br) => br.userId === ownerId);
      if (b && totalPvFromBreakdown(b) > 0) {
        const owner = users.find((u) => u.id === ownerId);
        total += computeOwnSelfMargin(b, tierPctForRank(owner?.currentRank));
        any = true;
      }
    }
    return any ? Math.max(total, data.margin_eur) : data.margin_eur;
  }, [data, users, breakdowns]);

  const manualOverride = useMemo(() => {
    if (!data) return 0;
    const viewerTier = Math.max(
      ...data.scope_user_ids.map((id) =>
        tierPctForRank(users.find((u) => u.id === id)?.currentRank),
      ),
    );
    return computeManualEntriesOverride(manualEntries, viewerTier);
  }, [manualEntries, data, users]);

  const totalMargin = directMargin + downlineOverride + manualOverride;

  const dataWithOverride = useMemo(() => {
    if (!data) return null;
    if (totalMargin === data.margin_eur) return data;
    const ratio = data.margin_eur > 0 ? totalMargin / data.margin_eur : 1;
    return {
      ...data,
      margin_eur: totalMargin,
      projection_eur: data.projection_eur * ratio,
    };
  }, [data, totalMargin]);

  const prevMonthEur = data?.prev_month_eur ?? 0;
  const delta = Math.round(totalMargin - prevMonthEur);
  const projection = Math.round((dataWithOverride?.projection_eur ?? totalMargin) || totalMargin);

  return {
    data,
    loading,
    error,
    isCoupleAggregated,
    monthIso,
    directMargin,
    downlineOverride,
    manualOverride,
    totalMargin,
    dataWithOverride,
    overridePerMember,
    fallbackOverrideForUser,
    prevMonthEur,
    delta,
    projection,
    refetch,
  };
}
