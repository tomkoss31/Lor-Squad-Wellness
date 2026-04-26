// Chantier Academy Phase 1 (2026-04-26).
// Hook specifique Academy. S appuie sur useTourProgress (generique) et
// ajoute la semantique propre au parcours :
//   - currentSectionIndex base sur lastStep
//   - completedCount / percentComplete / remainingMinutes
//   - shouldShowReminder pour le popup auto-trigger
//
// Ne fait AUCUN fetch direct — tout passe par useTourProgress.

import { useMemo } from "react";
import { useTourProgress } from "../../onboarding/hooks/useTourProgress";
import {
  ACADEMY_SECTIONS,
  ACADEMY_TOUR_KEY,
  ACADEMY_TOTAL_DURATION_MINUTES,
  getAcademySectionIndex,
  getCurrentAcademySection,
  type AcademySection,
} from "../sections";

export interface AcademyProgressView {
  // Metadonnees
  loaded: boolean;
  hasStarted: boolean;
  isCompleted: boolean;
  isSkipped: boolean;

  // Position dans le parcours
  /** Index 0-based de la section a reprendre (clampe a [0, N-1]). */
  currentSectionIndex: number;
  currentSection: AcademySection;

  // Stats globales
  /** Nb de sections finies (= lastStep si non termine, totalCount si termine). */
  completedCount: number;
  totalCount: number;
  /** 0..100, arrondi a l entier. */
  percentComplete: number;
  /** Somme des durees des sections non terminees. 0 si Academy termine. */
  remainingMinutes: number;

  // Reminder (popup auto-trigger)
  hasDismissedToday: boolean;
  /** !isCompleted && !isSkipped && !hasDismissedToday */
  shouldShowReminder: boolean;
}

const NOOP = () => {
  /* no-op */
};

export function useAcademyProgress() {
  const tour = useTourProgress(ACADEMY_TOUR_KEY);
  const {
    state,
    markStep,
    markCompleted,
    markSkipped,
    markDismissedToday,
    hasDismissedToday,
    resetForReplay,
  } = tour;

  const view: AcademyProgressView = useMemo(() => {
    const lastStep = state.lastStep ?? 0;
    const isCompleted = !!state.completedAt;
    const isSkipped = !!state.skippedAt;
    const hasStarted = !!state.startedAt && !isCompleted && !isSkipped;

    const totalCount = ACADEMY_SECTIONS.length;

    const currentSectionIndex = isCompleted
      ? totalCount - 1
      : Math.min(Math.max(0, lastStep), totalCount - 1);

    const currentSection = getCurrentAcademySection(lastStep);

    const completedCount = isCompleted
      ? totalCount
      : Math.max(0, Math.min(lastStep, totalCount));

    const percentComplete = Math.round((completedCount / totalCount) * 100);

    const remainingMinutes = isCompleted
      ? 0
      : ACADEMY_SECTIONS.slice(completedCount).reduce(
          (acc, s) => acc + s.estimatedDurationMinutes,
          0,
        );

    const shouldShowReminder =
      state.loaded && !isCompleted && !isSkipped && !hasDismissedToday;

    return {
      loaded: state.loaded,
      hasStarted,
      isCompleted,
      isSkipped,
      currentSectionIndex,
      currentSection,
      completedCount,
      totalCount,
      percentComplete,
      remainingMinutes,
      hasDismissedToday,
      shouldShowReminder,
    };
  }, [state, hasDismissedToday]);

  // Si l etat n est pas charge (currentUser null cote useTourProgress),
  // les fonctions de useTourProgress sont deja no-op. Mais on s assure que
  // le view fallback reste coherent (loaded: false implique hasStarted: false,
  // currentSectionIndex: 0, completedCount: 0, percentComplete: 0,
  // remainingMinutes: ACADEMY_TOTAL_DURATION_MINUTES).
  // Le useMemo ci-dessus produit deja ce comportement quand state == EMPTY_STATE
  // (lastStep=0, pas de timestamps), donc rien a forcer ici. On note juste
  // que ACADEMY_TOTAL_DURATION_MINUTES est implicitement le fallback de
  // remainingMinutes via slice(0).
  void ACADEMY_TOTAL_DURATION_MINUTES;

  return {
    view,
    goToSection: (sectionId: string) => {
      const idx = getAcademySectionIndex(sectionId);
      if (idx >= 0) markStep(idx);
    },
    markSectionDone: (sectionId: string) => {
      const idx = getAcademySectionIndex(sectionId);
      if (idx < 0) return;
      // Si c etait la derniere section, mark academy complete.
      if (idx >= ACADEMY_SECTIONS.length - 1) {
        markCompleted();
      } else {
        markStep(idx + 1);
      }
    },
    markAcademyCompleted: state.loaded ? markCompleted : NOOP,
    markAcademySkipped: state.loaded ? markSkipped : NOOP,
    markReminderDismissedToday: state.loaded ? markDismissedToday : NOOP,
    resetForReplay,
  };
}
