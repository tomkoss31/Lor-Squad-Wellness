// =============================================================================
// FLEX Lor'Squad — Calculs de cibles 5-3-1 (rank-aware, 2026-11-05)
//
// Le revenu net par client dépend de DEUX paramètres saisis par le distri :
//   - panier moyen retail (€) → ce que le client paie / mois
//   - rang Herbalife          → détermine la marge (25/35/42/50%)
//
// Le calcul de cibles 5-3-1 est ensuite dérivé du nb de clients nécessaires.
//
// Ratio 5-3-1 :
//   5 invitations → 3 conversations → 1 bilan → ~33% closings
//
// Exemple Thomas :
//   panier 234€ × Supervisor 50% = 117€ net/client
//   Objectif 200€/mois → 200 / 117 = 1,7 → 2 clients (vs 6 dans la V1
//   bidon avec panier 75€ × 50%).
// =============================================================================

import { RANK_MARGINS, type HerbalifeRank } from "../types/domain";

export const FLEX_DEFAULT_BASKET = 150; // €
export const FLEX_BILANS_PER_CLOSE = 3; // ~33% conversion bilans → close
export const FLEX_INVITATIONS_PER_BILAN = 5; // 5-3-1
export const FLEX_CONVERSATIONS_PER_BILAN = 3; // 5-3-1
export const FLEX_WEEKS_PER_MONTH = 4.33;

export interface FlexTargets {
  daily_invitations_target: number;
  daily_conversations_target: number;
  weekly_bilans_target: number;
  weekly_closings_target: number;
  monthly_active_clients_target: number;
}

export interface FlexTargetsBreakdown extends FlexTargets {
  needed_new_clients_per_month: number;
  net_per_client: number;
  margin_pct: number;
}

export interface ComputeFlexParams {
  monthlyRevenueTarget: number;
  averageBasket: number;
  rank: HerbalifeRank;
  startingClients?: number;
}

export function computeFlexTargets({
  monthlyRevenueTarget,
  averageBasket,
  rank,
  startingClients = 0,
}: ComputeFlexParams): FlexTargetsBreakdown {
  const safeRevenue = Math.max(0, Math.round(monthlyRevenueTarget));
  const safeBasket = Math.max(30, Math.round(averageBasket));
  const safeStarting = Math.max(0, Math.round(startingClients));
  const margin = RANK_MARGINS[rank] ?? 0.25;
  const netPerClient = safeBasket * margin;

  const neededNewClients = Math.max(
    1,
    Math.ceil(safeRevenue / Math.max(1, netPerClient)),
  );

  const weeklyClosings = Math.max(
    1,
    Math.ceil(neededNewClients / FLEX_WEEKS_PER_MONTH),
  );
  const weeklyBilans = weeklyClosings * FLEX_BILANS_PER_CLOSE;
  const dailyBilans = weeklyBilans / 7;

  const dailyInvitations = Math.max(
    1,
    Math.ceil(dailyBilans * FLEX_INVITATIONS_PER_BILAN),
  );
  const dailyConversations = Math.max(
    1,
    Math.ceil(dailyBilans * FLEX_CONVERSATIONS_PER_BILAN),
  );

  return {
    daily_invitations_target: dailyInvitations,
    daily_conversations_target: dailyConversations,
    weekly_bilans_target: weeklyBilans,
    weekly_closings_target: weeklyClosings,
    monthly_active_clients_target: safeStarting + neededNewClients,
    needed_new_clients_per_month: neededNewClients,
    net_per_client: Math.round(netPerClient * 10) / 10,
    margin_pct: Math.round(margin * 100),
  };
}

/** Estimation grossière du temps quotidien nécessaire (min). */
export function estimateFlexDailyMinutes(targets: FlexTargets): number {
  const inviteMin = targets.daily_invitations_target * 2;
  const convMin = targets.daily_conversations_target * 4;
  const bilanMin = (targets.weekly_bilans_target / 7) * 30;
  return Math.round(inviteMin + convMin + bilanMin);
}
