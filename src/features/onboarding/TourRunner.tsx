// Chantier Refactor onboarding additif (2026-04-26).
// Orchestrateur generique pour tours interactifs cote coach (Academy +
// futurs). Reutilise TutorialTooltip + SpotlightOverlay sans les modifier.
//
// Differences vs OnboardingTutorial :
//   - Steps configurables via prop (pas hardcoded)
//   - Cross-route via react-router (navigate vers step.route si different)
//   - onStepChange pour persister la progression (useTourProgress.markStep)
//   - Timeout 3s si la cible n apparait pas → console.warn + step suivant

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TutorialTooltip } from "./components/TutorialTooltip";
import { SpotlightOverlay } from "./components/SpotlightOverlay";
import type { TutorialStep } from "./types";

export type TourCloseReason = "completed" | "skipped" | "dismissed";

export interface TourRunnerProps {
  steps: TutorialStep[];
  /** Step de depart (defaut 0). Permet la reprise via lastStep. */
  initialStep?: number;
  onClose: (reason: TourCloseReason) => void;
  /** Callback a chaque changement de step (utile pour useTourProgress). */
  onStepChange?: (stepIndex: number) => void;
}

/** Delai max d attente d apparition d une cible avant skip auto. */
const TARGET_TIMEOUT_MS = 3000;
/** Periode du recompute rect (rescroll-safe, async-safe). */
const RECT_POLL_MS = 500;

export function TourRunner({
  steps,
  initialStep = 0,
  onClose,
  onStepChange,
}: TourRunnerProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const safeInitial = Math.min(Math.max(0, initialStep), Math.max(0, steps.length - 1));
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(safeInitial);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number | null>(null);
  const previousStepRef = useRef<number | null>(null);

  const currentStep: TutorialStep | null = steps[currentStepIndex] ?? null;
  const totalSteps = steps.length;
  const isLast =
    currentStep?.isLast === true || currentStepIndex === totalSteps - 1;

  // ─── Lifecycle hooks onEnter / onExit ───────────────────────────────────
  useEffect(() => {
    if (!currentStep) return;
    const prev = previousStepRef.current;
    if (prev !== null && prev !== currentStepIndex) {
      const prevStep = steps[prev];
      try {
        prevStep?.onExit?.();
      } catch (err) {
        console.warn("[TourRunner] onExit threw", err);
      }
    }
    try {
      currentStep.onEnter?.();
    } catch (err) {
      console.warn("[TourRunner] onEnter threw", err);
    }
    previousStepRef.current = currentStepIndex;
    onStepChange?.(currentStepIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepIndex]);

  // ─── Cross-route : navigate si step.route different ─────────────────────
  useEffect(() => {
    if (!currentStep?.route) return;
    if (location.pathname !== currentStep.route) {
      navigate(currentStep.route);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepIndex, currentStep?.route]);

  // ─── Resolution de la cible spotlight ───────────────────────────────────
  const targetSelector = currentStep?.target;
  const stepWaitsForRoute = useMemo(() => {
    return !!currentStep?.route && location.pathname !== currentStep.route;
  }, [currentStep?.route, location.pathname]);

  useEffect(() => {
    setTargetRect(null);
    if (!targetSelector || stepWaitsForRoute) return;

    const startedAt = Date.now();
    let cleared = false;
    let timeoutId: number | null = null;

    const compute = () => {
      const el = document.querySelector(targetSelector);
      if (!el) {
        if (Date.now() - startedAt > TARGET_TIMEOUT_MS && !cleared) {
          cleared = true;
          console.warn(
            `[TourRunner] target "${targetSelector}" not found after ${TARGET_TIMEOUT_MS}ms — skipping step ${currentStepIndex}`,
          );
          // Avance auto au step suivant (ou close si dernier)
          setCurrentStepIndex((idx) => {
            if (idx + 1 >= totalSteps) {
              onClose("completed");
              return idx;
            }
            return idx + 1;
          });
        }
        return;
      }
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      try {
        (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
      } catch {
        // no-op
      }
    };

    compute();
    const handler = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = window.requestAnimationFrame(compute);
    };
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    timeoutId = window.setInterval(compute, RECT_POLL_MS);

    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timeoutId !== null) window.clearInterval(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetSelector, stepWaitsForRoute, currentStepIndex, totalSteps]);

  // ─── Cleanup onExit du dernier step au unmount ──────────────────────────
  useEffect(() => {
    return () => {
      const idx = previousStepRef.current;
      if (idx !== null) {
        try {
          steps[idx]?.onExit?.();
        } catch (err) {
          console.warn("[TourRunner] onExit (unmount) threw", err);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Handlers navigation ───────────────────────────────────────────────
  const goNext = useCallback(() => {
    setCurrentStepIndex((idx) => {
      if (idx + 1 >= totalSteps) {
        onClose("completed");
        return idx;
      }
      return idx + 1;
    });
  }, [totalSteps, onClose]);

  const goPrev = useCallback(() => {
    setCurrentStepIndex((idx) => (idx > 0 ? idx - 1 : 0));
  }, []);

  const skip = useCallback(() => {
    onClose("skipped");
  }, [onClose]);

  const dismiss = useCallback(() => {
    onClose("dismissed");
  }, [onClose]);

  // Escape = skip
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [skip]);

  if (!currentStep) return null;

  // Placement effectif : default "center" si pas de target, sinon "bottom".
  const effectivePlacement =
    currentStep.placement ?? (targetRect ? "bottom" : "center");

  const showSpotlight = !!targetSelector && !!targetRect && !stepWaitsForRoute;

  return (
    <>
      {/* Overlay : avec decoupe si on a un rect, sinon plein ecran cliquable */}
      <div
        onClick={dismiss}
        role="button"
        aria-label="Fermer le tutoriel"
        tabIndex={0}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: showSpotlight ? -1 : 9999,
          cursor: "pointer",
          background: showSpotlight ? "transparent" : "transparent",
        }}
      />
      <SpotlightOverlay targetRect={showSpotlight ? targetRect : null} />

      <TutorialTooltip
        stepIndex={currentStepIndex}
        totalSteps={totalSteps}
        title={currentStep.title}
        targetRect={showSpotlight ? targetRect : null}
        placement={effectivePlacement}
        onPrev={currentStepIndex > 0 ? goPrev : undefined}
        onNext={goNext}
        onSkip={skip}
        nextLabel={currentStep.nextLabel}
        isLast={isLast}
      >
        {currentStep.body}
      </TutorialTooltip>
    </>
  );
}
