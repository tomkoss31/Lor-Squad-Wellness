import type { DecisionClient, LifecycleStatus } from "../types/domain";

/**
 * Matrice B — Décision client × Démarrage → Lifecycle + flag fragile
 *
 *                    | Immédiat (started)      | À relancer (pending)
 * -------------------|-------------------------|----------------------
 * Partant            | active                  | not_started
 * A rassurer         | active + fragile ⚠     | not_started
 * A confirmer        | not_started             | not_started
 *
 * Cas par défaut (pas de decisionClient saisi) : on retombe sur le
 * comportement historique (started → active, pending → not_started).
 */
export interface LifecycleDerivation {
  lifecycleStatus: LifecycleStatus;
  isFragile: boolean;
}

export function deriveLifecycleFromAssessment(params: {
  decisionClient: DecisionClient | null | undefined;
  afterAssessmentAction: "started" | "pending";
}): LifecycleDerivation {
  const { decisionClient, afterAssessmentAction } = params;

  // Pas de décision renseignée → comportement historique
  if (!decisionClient) {
    return {
      lifecycleStatus: afterAssessmentAction === "started" ? "active" : "not_started",
      isFragile: false,
    };
  }

  if (decisionClient === "partant") {
    return {
      lifecycleStatus: afterAssessmentAction === "started" ? "active" : "not_started",
      isFragile: false,
    };
  }

  if (decisionClient === "a_rassurer") {
    if (afterAssessmentAction === "started") {
      return { lifecycleStatus: "active", isFragile: true };
    }
    return { lifecycleStatus: "not_started", isFragile: false };
  }

  // decisionClient === "a_confirmer"
  return { lifecycleStatus: "not_started", isFragile: false };
}
