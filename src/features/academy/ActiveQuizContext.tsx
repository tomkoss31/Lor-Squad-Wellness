// Chantier Academy direction 2 (2026-04-28).
// Contexte global pour le quiz post-section. Pattern identique a
// ActiveTourContext : permet au QuizModal d etre rendu au niveau
// AppLayout afin de survivre aux changements de route apres la fin
// d un tour Academy.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AcademyQuiz } from "./sections";

export interface ActiveQuiz {
  quiz: AcademyQuiz;
  sectionTitle: string;
  onComplete: (passed: boolean, scorePercent: number) => void;
}

interface ActiveQuizContextValue {
  activeQuiz: ActiveQuiz | null;
  startQuiz: (q: ActiveQuiz) => void;
  closeQuiz: (passed: boolean, scorePercent: number) => void;
}

const ActiveQuizContext = createContext<ActiveQuizContextValue | null>(null);

export function ActiveQuizProvider({ children }: { children: ReactNode }) {
  const [activeQuiz, setActiveQuiz] = useState<ActiveQuiz | null>(null);

  const startQuiz = useCallback((q: ActiveQuiz) => {
    setActiveQuiz(q);
  }, []);

  const closeQuiz = useCallback((passed: boolean, scorePercent: number) => {
    setActiveQuiz((prev) => {
      if (prev) {
        try {
          prev.onComplete(passed, scorePercent);
        } catch (err) {
          console.warn("[ActiveQuiz] onComplete threw", err);
        }
      }
      return null;
    });
  }, []);

  const value = useMemo<ActiveQuizContextValue>(
    () => ({ activeQuiz, startQuiz, closeQuiz }),
    [activeQuiz, startQuiz, closeQuiz],
  );

  return <ActiveQuizContext.Provider value={value}>{children}</ActiveQuizContext.Provider>;
}

export function useActiveQuiz(): ActiveQuizContextValue {
  const ctx = useContext(ActiveQuizContext);
  if (!ctx) {
    throw new Error("useActiveQuiz must be used inside <ActiveQuizProvider>");
  }
  return ctx;
}
