// =============================================================================
// Formation pyramide — types DB (Phase B, 2026-11-01)
//
// Types miroir des tables formation_user_progress et formation_review_threads
// (snake_case cote DB, mapping en camelCase fait dans le service).
// =============================================================================

export type FormationProgressStatus =
  | "not_started"
  | "in_progress"
  | "pending_review_sponsor"
  | "pending_review_admin"
  | "validated"
  | "rejected";

export type FormationValidationPath = "auto" | "sponsor" | "admin_relay";

export type FormationThreadKind =
  | "question"
  | "answer"
  | "validation_decision"
  | "feedback";

/** Row brute formation_user_progress (snake_case DB). */
export interface FormationProgressRow {
  id: string;
  user_id: string;
  module_id: string;
  status: FormationProgressStatus;
  quiz_score: number | null;
  quiz_answers: unknown[];
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  feedback: string | null;
  validation_path: FormationValidationPath | null;
  created_at: string;
  updated_at: string;
}

/** Row brute formation_review_threads. */
export interface FormationThreadRow {
  id: string;
  progress_id: string;
  sender_id: string;
  kind: FormationThreadKind;
  content: string;
  created_at: string;
}

/** Resultat de la RPC get_my_pending_formation_reviews (sponsor view). */
export interface FormationPendingReviewRow {
  progress_id: string;
  user_id: string;
  user_name: string;
  module_id: string;
  quiz_score: number | null;
  submitted_at: string;
  hours_pending: number;
}

/** Resultat de la RPC get_admin_formation_relay_queue (admin only). */
export interface FormationAdminRelayRow {
  progress_id: string;
  user_id: string;
  user_name: string;
  sponsor_id: string | null;
  sponsor_name: string | null;
  module_id: string;
  quiz_score: number | null;
  submitted_at: string;
  hours_pending: number;
}

/** Reponse de soumission (utilisee par useFormationActions.submitModule). */
export interface SubmitModuleResult {
  status: FormationProgressStatus;
  validationPath: FormationValidationPath | null;
  /** True si quiz 100 % → validation auto immediate. */
  autoValidated: boolean;
  /** XP attribue (10 module + 50 si auto). */
  xpAwarded: number;
}
