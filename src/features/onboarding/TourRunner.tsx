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

/** Delai max d attente d apparition d une cible avant skip auto.
 *  Augmente a 6s (Vague 0.3) pour les transitions cross-route lentes. */
const TARGET_TIMEOUT_MS = 6000;
/** Periode du recompute rect (rescroll-safe, async-safe). */
const RECT_POLL_MS = 500;

/**
 * Patch 1 mobile (2026-04-26) : retourne le PREMIER element matching le
 * selector qui est REELLEMENT visible (rect non-zero + pas display:none /
 * visibility:hidden / opacity:0). Necessaire car la sidebar desktop reste
 * dans le DOM sur mobile (avec display:none via Tailwind xl:flex) — un
 * simple querySelector la prendrait avec un rect 0×0 → spotlight invisible.
 */
function findVisibleTarget(selector: string): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const elements = document.querySelectorAll<HTMLElement>(selector);
  for (const el of elements) {
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    const style = window.getComputedStyle(el);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.opacity === "0"
    ) {
      continue;
    }
    return el;
  }
  return null;
}

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
  const [targetEl, setTargetEl] = useState<HTMLElement | null>(null);
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
    setTargetEl(null);
    if (!targetSelector || stepWaitsForRoute) return;

    const startedAt = Date.now();
    let cleared = false;
    let timeoutId: number | null = null;

    const compute = () => {
      const el = findVisibleTarget(targetSelector);
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
      setTargetEl(el);
      try {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
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

  // ─── Click-on-target : avance ou intercept selon manualAdvance ──────────
  // Patch 2 (2026-04-26). Si target visible :
  //   - manualAdvance === true  → preventDefault + stopPropagation, le tour
  //     reste sur le step. User doit utiliser "Suivant".
  //   - manualAdvance falsy     → laisse l action native s executer ET
  //     avance au step suivant (ou complete si dernier).
  useEffect(() => {
    if (!targetEl || stepWaitsForRoute) return;
    const manualAdvance = currentStep?.manualAdvance === true;

    const handleClick = (e: Event) => {
      if (manualAdvance) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      // Laisser l action native passer. Avance ensuite (timeout 0 pour
      // laisser le bubbling se faire avant le re-render).
      window.setTimeout(() => {
        setCurrentStepIndex((idx) => {
          if (idx + 1 >= totalSteps) {
            onClose("completed");
            return idx;
          }
          return idx + 1;
        });
      }, 0);
    };

    // Capture phase pour intercepter avant les handlers React du target
    // (necessaire pour preventDefault d un NavLink en mode manualAdvance).
    targetEl.addEventListener("click", handleClick, true);
    return () => {
      targetEl.removeEventListener("click", handleClick, true);
    };
  }, [targetEl, stepWaitsForRoute, currentStep, totalSteps, onClose]);

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
      {/* Patch 2 (2026-04-26) : SpotlightOverlay porte desormais le click
          dismiss directement sur ses 4 bandes dim (quand showSpotlight) ou
          sur l overlay plein (mode modale center). Plus de click-catcher
          full-screen au-dessus → les clicks sur le target hole arrivent
          naturellement sur le target, et un click listener (effect plus
          haut) gere advance / intercept selon manualAdvance. */}
      <SpotlightOverlay
        targetRect={showSpotlight ? targetRect : null}
        onDismiss={dismiss}
      />

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
