// =============================================================================
// QuizAnswersDetailPanel — wrapper sponsor (fetch DB) — 2026-05-03
//
// Charge formation_user_progress.quiz_answers depuis la DB pour le
// progressId donné, puis délègue le rendu à QuizAnswersDetailRenderer
// avec audience='sponsor'.
//
// Utilisé dans ValidationDecisionDialog. Pour le distri post-soumission
// qui voit ses propres réponses sans aller en DB, voir directement
// QuizAnswersDetailRenderer (state local).
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import { FORMATION_LEVELS } from "../../data/formation";
import type { FormationModule, FormationQcmQuestion } from "../../data/formation/types";
import {
  QuizAnswersDetailRenderer,
  type QuizAnswerEntry,
} from "./QuizAnswersDetailRenderer";

interface Props {
  progressId: string;
  moduleId: string;
}

function findModuleById(moduleId: string): FormationModule | undefined {
  for (const level of FORMATION_LEVELS) {
    const m = level.modules.find((mod) => mod.id === moduleId);
    if (m) return m;
  }
  return undefined;
}

export function QuizAnswersDetailPanel({ progressId, moduleId }: Props) {
  const [answers, setAnswers] = useState<QuizAnswerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const sb = await getSupabaseClient();
      if (!sb) {
        if (!cancelled) {
          setError("Supabase indisponible");
          setLoading(false);
        }
        return;
      }
      const { data, error: e } = await sb
        .from("formation_user_progress")
        .select("quiz_answers")
        .eq("id", progressId)
        .single();
      if (cancelled) return;
      if (e) {
        setError(e.message);
        setLoading(false);
        return;
      }
      const raw = (data?.quiz_answers ?? []) as unknown[];
      setAnswers(
        raw.filter((x): x is QuizAnswerEntry => typeof x === "object" && x !== null),
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [progressId]);

  const module = useMemo(() => findModuleById(moduleId), [moduleId]);
  const qcmQuestions = useMemo<FormationQcmQuestion[]>(() => {
    if (!module?.quiz?.questions) return [];
    return module.quiz.questions.filter(
      (q): q is FormationQcmQuestion => q.kind === "qcm",
    );
  }, [module]);

  if (loading) {
    return (
      <div
        style={{
          fontSize: 11,
          color: "var(--ls-text-muted)",
          fontStyle: "italic",
          padding: "8px 0",
        }}
      >
        Chargement détail quiz…
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ fontSize: 11, color: "var(--ls-coral)", padding: "8px 0" }}>
        {error}
      </div>
    );
  }
  return (
    <QuizAnswersDetailRenderer
      qcmQuestions={qcmQuestions}
      answers={answers}
      audience="sponsor"
    />
  );
}
