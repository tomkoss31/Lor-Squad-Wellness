// =============================================================================
// FLEX Lor'Squad — Calculs de cibles 5-3-1
//
// À partir de l'objectif revenu mensuel et des clients de départ, derive les
// 5 cibles KPI du plan d'action :
//   - daily_invitations_target
//   - daily_conversations_target
//   - weekly_bilans_target
//   - weekly_closings_target
//   - monthly_active_clients_target
//
// Ratio 5-3-1 (refonte 2026-11-04) :
//   5 invitations  →  3 conversations  →  1 bilan  →  ~33% closings
//
// Calibrage France (aligné FormationCalculatorPage) :
//   - Panier moyen 75€
//   - Marge retail Supervisor 50%
//   - Net moyen par client 37,5€/mois
//
// V2 future : computeFlexTargetsFromHistory(userId) qui regarde les
// 3 derniers mois de pv_transactions pour ajuster panier réel.
// =============================================================================

export const FLEX_AVG_BASKET = 75;
export const FLEX_RETAIL_MARGIN = 0.5;
export const FLEX_NET_PER_CLIENT = FLEX_AVG_BASKET * FLEX_RETAIL_MARGIN; // 37.5
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
  /** Nb de nouveaux clients/mois nécessaires pour atteindre l'objectif. */
  needed_new_clients_per_month: number;
  /** Net moyen utilisé pour le calcul (€/client/mois). */
  net_per_client: number;
}

export function computeFlexTargets(
  monthlyRevenueTarget: number,
  startingClients: number = 0,
): FlexTargetsBreakdown {
  const safeRevenue = Math.max(0, Math.round(monthlyRevenueTarget));
  const safeStarting = Math.max(0, Math.round(startingClients));

  const neededNewClients = Math.max(
    1,
    Math.ceil(safeRevenue / FLEX_NET_PER_CLIENT),
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
    net_per_client: FLEX_NET_PER_CLIENT,
  };
}

/** Estimation grossière du temps quotidien nécessaire vs cible (en min). */
export function estimateFlexDailyMinutes(targets: FlexTargets): number {
  // Heuristique : 2 min / invitation + 4 min / conversation + 30 min / bilan/7
  const inviteMin = targets.daily_invitations_target * 2;
  const convMin = targets.daily_conversations_target * 4;
  const bilanMin = (targets.weekly_bilans_target / 7) * 30;
  return Math.round(inviteMin + convMin + bilanMin);
}
