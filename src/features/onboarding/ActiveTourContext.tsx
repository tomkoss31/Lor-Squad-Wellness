// Chantier Academy section 1 (2026-04-27) — fix runtime.
// Contexte global pour l etat du tour actif. Permet au TourRunner d etre
// rendu a un niveau superieur au Routes (AppLayout) afin de survivre aux
// changements de route pendant le tour. Sans ca, naviguer du /academy/:id
// vers /parametres unmount AcademySectionPage et donc TourRunner.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { TutorialStep } from "./types";

export type TourCloseReason = "completed" | "skipped" | "dismissed";

export interface ActiveTour {
  /** Identifiant logique (ex: section Academy) — pour callbacks externes. */
  id: string;
  steps: TutorialStep[];
  /** Callback appele a la fermeture du tour, quelle que soit la raison. */
  onClose: (reason: TourCloseReason) => void;
  /** Direction 4 (2026-04-28) : step de depart pour reprise. Defaut 0. */
  initialStep?: number;
  /** Callback appele a chaque changement de step (utile pour persistance). */
  onStepChange?: (stepIndex: number) => void;
}

interface ActiveTourContextValue {
  activeTour: ActiveTour | null;
  startTour: (tour: ActiveTour) => void;
  closeTour: (reason: TourCloseReason) => void;
}

const ActiveTourContext = createContext<ActiveTourContextValue | null>(null);

export function ActiveTourProvider({ children }: { children: ReactNode }) {
  const [activeTour, setActiveTour] = useState<ActiveTour | null>(null);

  const startTour = useCallback((tour: ActiveTour) => {
    setActiveTour(tour);
  }, []);

  const closeTour = useCallback(
    (reason: TourCloseReason) => {
      setActiveTour((prev) => {
        if (prev) {
          try {
            prev.onClose(reason);
          } catch (err) {
            console.warn("[ActiveTour] onClose threw", err);
          }
        }
        return null;
      });
    },
    [],
  );

  const value = useMemo<ActiveTourContextValue>(
    () => ({ activeTour, startTour, closeTour }),
    [activeTour, startTour, closeTour],
  );

  return <ActiveTourContext.Provider value={value}>{children}</ActiveTourContext.Provider>;
}

export function useActiveTour(): ActiveTourContextValue {
  const ctx = useContext(ActiveTourContext);
  if (!ctx) {
    throw new Error("useActiveTour must be used inside <ActiveTourProvider>");
  }
  return ctx;
}
