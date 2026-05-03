// =============================================================================
// FLEX Lor'Squad — Types front (Phase A 2026-11-05)
//
// Mappe les 3 tables côté DB :
//   - distributor_action_plan        → DistributorActionPlan
//   - daily_action_checkin           → DailyActionCheckin
//   - distributor_action_plan_history → DistributorActionPlanHistory
//
// Naming hommage FLEX 45 Herbalife. Tout est aligné avec la migration
// 20261105010000_flex_action_plan.sql.
// =============================================================================

/** -1 = "variable selon les jours" (sinon valeurs en minutes). */
export type FlexDailyTimeMinutes = 15 | 30 | 45 | 60 | 90 | -1;

export type FlexResetReason =
  | "deadline_reached"
  | "manual_reset"
  | "goal_changed";

/** Créneaux dispo posés par le distri à l'onboarding (Phase B). */
export interface FlexAvailableSlot {
  /** "monday" | ... | "sunday" */
  day: string;
  /** "08:00" 24h. */
  start: string;
  /** "12:00". */
  end: string;
}

// ─── 1. Plan d'action ────────────────────────────────────────────────────────

export interface DistributorActionPlan {
  id: string;
  user_id: string;

  // Onboarding inputs
  monthly_revenue_target: number;
  daily_time_minutes: FlexDailyTimeMinutes;
  starting_clients_count: number;
  available_slots: FlexAvailableSlot[];
  /** ISO date "YYYY-MM-DD". */
  target_deadline_date: string;

  // Cibles calculées (depuis le calculateur Strategy Plan 5-3-1)
  daily_invitations_target: number;
  daily_conversations_target: number;
  weekly_bilans_target: number;
  weekly_closings_target: number;
  monthly_active_clients_target: number;

  // Recalcul mid-parcours
  midpoint_recalculated_at: string | null;
  midpoint_revenue_target_adjusted: number | null;

  // Pause
  is_paused: boolean;
  paused_at: string | null;

  // Meta
  created_at: string;
  updated_at: string;
}

/** Payload INSERT d'un nouveau plan (post-onboarding). */
export type DistributorActionPlanInsert = Omit<
  DistributorActionPlan,
  "id" | "created_at" | "updated_at" | "midpoint_recalculated_at" |
  "midpoint_revenue_target_adjusted" | "is_paused" | "paused_at"
> & {
  is_paused?: boolean;
};

// ─── 2. Check-in quotidien ───────────────────────────────────────────────────

export interface DailyActionCheckin {
  id: string;
  user_id: string;
  /** ISO date "YYYY-MM-DD" en heure Paris. */
  date: string;

  // 4 KPI saisis le soir
  invitations_sent: number;
  new_conversations: number;
  bilans_scheduled: number;
  closings_count: number;

  // Réflexions optionnelles (max 500 chars)
  daily_win: string | null;
  improvement_note: string | null;

  // Meta
  created_at: string;
  updated_at: string;
}

export type DailyActionCheckinInsert = Omit<
  DailyActionCheckin,
  "id" | "created_at" | "updated_at"
>;

/** Patch partiel pour upsert (le user peut rééditer la même date). */
export type DailyActionCheckinUpsert = Pick<
  DailyActionCheckin,
  "user_id" | "date"
> &
  Partial<
    Pick<
      DailyActionCheckin,
      | "invitations_sent"
      | "new_conversations"
      | "bilans_scheduled"
      | "closings_count"
      | "daily_win"
      | "improvement_note"
    >
  >;

// ─── 3. Historique (archive sur reset) ───────────────────────────────────────

export interface DistributorActionPlanHistory {
  id: string;
  user_id: string;
  archived_at: string;
  /** Snapshot complet du plan au moment du reset. */
  plan_snapshot: DistributorActionPlan;
  final_stats: FlexFinalStats | null;
  reset_reason: FlexResetReason;
}

export interface FlexFinalStats {
  days_filled: number;
  total_invitations: number;
  total_bilans: number;
  total_closings: number;
}

// ─── 4. Récap hebdo (RPC get_flex_weekly_recap) ──────────────────────────────

export interface FlexWeeklyRecap {
  user_id: string;
  /** ISO "YYYY-MM-DD" lundi de la semaine. */
  week_start: string;
  /** ISO "YYYY-MM-DD" dimanche. */
  week_end: string;
  days_filled: number;
  targets: FlexWeeklyMetrics;
  actuals: FlexWeeklyMetrics;
  /** % atteint par KPI (0-100+, peut dépasser 100). */
  ratios: FlexWeeklyMetrics;
}

export interface FlexWeeklyMetrics {
  invitations: number;
  conversations: number;
  bilans: number;
  closings: number;
}

/** Forme renvoyée si le user n'a pas encore de plan. */
export interface FlexWeeklyRecapEmpty {
  error: "no_plan";
  user_id: string;
}

export type FlexWeeklyRecapResult = FlexWeeklyRecap | FlexWeeklyRecapEmpty;

// ─── 5. Drift list (RPC list_flex_drift_distri, admin only) ──────────────────

export interface FlexDriftDistri {
  user_id: string;
  user_name: string;
  weeks_drift: number;
  /** Null si aucun check-in jamais. */
  last_checkin_date: string | null;
}

// ─── 6. Helpers UI ───────────────────────────────────────────────────────────

/** Statut visuel d'un KPI sur 1 jour ou 1 semaine selon ratio actual/target. */
export type FlexKpiStatus = "behind" | "ontrack" | "ahead";

export function flexKpiStatus(ratioPct: number): FlexKpiStatus {
  if (ratioPct < 80) return "behind";
  if (ratioPct >= 100) return "ahead";
  return "ontrack";
}

/** Couleur sémantique associée au statut (tokens var(--ls-*)). */
export const FLEX_KPI_COLOR: Record<FlexKpiStatus, string> = {
  behind: "var(--ls-coral)",
  ontrack: "var(--ls-teal)",
  ahead: "var(--ls-gold)",
};
