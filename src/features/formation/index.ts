// =============================================================================
// Formation pyramide — barrel exports (Phase B)
// =============================================================================

export * from "./types-db";
export {
  AUTO_VALIDATION_SCORE,
  FORMATION_XP,
  fetchMyProgress,
  fetchOrCreateModuleProgress,
  fetchPendingReviewQueue,
  fetchAdminRelayQueue,
  fetchReviewThread,
  startModule,
  submitModule,
  validateModule,
  requestComplement,
  rejectModule,
  addThreadMessage,
} from "./service";
export { useMyFormationProgress } from "./hooks/useMyFormationProgress";
export { useFormationReviewQueue } from "./hooks/useFormationReviewQueue";
export { useFormationAdminQueue } from "./hooks/useFormationAdminQueue";
export { useFormationReviewThread } from "./hooks/useFormationReviewThread";
export { useFormationActions } from "./hooks/useFormationActions";
