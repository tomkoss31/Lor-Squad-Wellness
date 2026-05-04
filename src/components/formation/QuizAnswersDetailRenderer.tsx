// =============================================================================
// QuizAnswersDetailRenderer — render pur du détail QCM (2026-05-03)
//
// Pure UI : prend les questions + les réponses du user, rend le détail.
// Utilisé par :
//   - QuizAnswersDetailPanel (wrapper sponsor : fetch DB d'abord)
//   - QuizRunner post-soumission (state local : pas de DB needed)
//
// Le ton du label adapte selon `audience` :
//   - 'sponsor' : "sa réponse" / "bonne réponse"
//   - 'distri'  : "ta réponse" / "bonne réponse"
// =============================================================================

import type { FormationQcmQuestion } from "../../data/formation/types";

export interface QuizAnswerEntry {
  questionId: string;
  chosenIndex?: number;
  correctIndex?: number;
  isCorrect?: boolean;
}

interface Props {
  qcmQuestions: FormationQcmQuestion[];
  answers: QuizAnswerEntry[];
  audience: "sponsor" | "distri";
}

export function QuizAnswersDetailRenderer({ qcmQuestions, answers, audience }: Props) {
  if (qcmQuestions.length === 0 || answers.length === 0) {
    return (
      <div
        style={{
          fontSize: 11,
          color: "var(--ls-text-muted)",
          fontStyle: "italic",
          padding: "8px 0",
        }}
      >
        Pas de détail QCM disponible.
      </div>
    );
  }

  const correctCount = answers.filter((a) => a.isCorrect).length;
  const yourLabel = audience === "distri" ? "ta réponse" : "sa réponse";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          fontSize: 12,
          color: "var(--ls-text-muted)",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        <strong style={{ color: "var(--ls-text)" }}>
          {correctCount}/{qcmQuestions.length}
        </strong>{" "}
        question{qcmQuestions.length > 1 ? "s" : ""} correcte
        {correctCount > 1 ? "s" : ""}
      </div>

      {qcmQuestions.map((q, idx) => {
        const userAnswer = answers.find((a) => a.questionId === q.id);
        const chosen = userAnswer?.chosenIndex;
        const isCorrect = userAnswer?.isCorrect === true;
        return (
          <div
            key={q.id}
            style={{
              background: "var(--ls-surface2)",
              border: `0.5px solid ${isCorrect ? "color-mix(in srgb, var(--ls-teal) 35%, transparent)" : "color-mix(in srgb, var(--ls-coral) 35%, transparent)"}`,
              borderLeft: `3px solid ${isCorrect ? "var(--ls-teal)" : "var(--ls-coral)"}`,
              borderRadius: 8,
              padding: "10px 12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 8,
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 16 }} aria-hidden="true">
                {isCorrect ? "✅" : "❌"}
              </span>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--ls-text)",
                  fontFamily: "DM Sans, sans-serif",
                  flex: 1,
                }}
              >
                Q{idx + 1}. {q.question}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginLeft: 26 }}>
              {q.answers.map((ansText, aIdx) => {
                const isUserChoice = chosen === aIdx;
                const isCorrectAnswer = q.correctIndex === aIdx;
                let bg = "transparent";
                let color = "var(--ls-text-muted)";
                let prefix = "·";
                if (isUserChoice && isCorrectAnswer) {
                  bg = "color-mix(in srgb, var(--ls-teal) 18%, transparent)";
                  color = "var(--ls-teal)";
                  prefix = "✓";
                } else if (isUserChoice && !isCorrectAnswer) {
                  bg = "color-mix(in srgb, var(--ls-coral) 18%, transparent)";
                  color = "var(--ls-coral)";
                  prefix = "✗";
                } else if (isCorrectAnswer) {
                  bg = "color-mix(in srgb, var(--ls-teal) 8%, transparent)";
                  color = "var(--ls-teal)";
                  prefix = "✓";
                }
                return (
                  <div
                    key={aIdx}
                    style={{
                      fontSize: 11.5,
                      color,
                      padding: "4px 8px",
                      background: bg,
                      borderRadius: 4,
                      fontFamily: "DM Sans, sans-serif",
                      display: "flex",
                      gap: 6,
                      alignItems: "baseline",
                    }}
                  >
                    <span style={{ width: 14, textAlign: "center", fontWeight: 700 }}>
                      {prefix}
                    </span>
                    <span style={{ flex: 1 }}>
                      {ansText}
                      {isUserChoice && !isCorrectAnswer && (
                        <span style={{ marginLeft: 6, fontStyle: "italic", opacity: 0.85 }}>
                          ({yourLabel})
                        </span>
                      )}
                      {isCorrectAnswer && !isUserChoice && (
                        <span style={{ marginLeft: 6, fontStyle: "italic", opacity: 0.85 }}>
                          (bonne réponse)
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
            {q.explanation && (
              <div
                style={{
                  marginTop: 8,
                  marginLeft: 26,
                  padding: "6px 10px",
                  background: "color-mix(in srgb, var(--ls-gold) 8%, transparent)",
                  borderLeft: "2px solid var(--ls-gold)",
                  borderRadius: 4,
                  fontSize: 11,
                  fontStyle: "italic",
                  color: "var(--ls-text)",
                  fontFamily: "DM Sans, sans-serif",
                  lineHeight: 1.5,
                }}
              >
                💡 {q.explanation}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
