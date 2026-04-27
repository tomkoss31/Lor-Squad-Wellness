// Chantier Academy direction 2 (2026-04-28).
// Modal QCM affichee apres la completion d une section qui a un quiz.
// Une question a la fois, 4 reponses, feedback immediat (vert si bon /
// coral si mauvais), explanation toujours montree. Score final + bouton
// "Continuer" qui appelle onComplete.

import { useState } from "react";
import type { AcademyQuiz } from "../sections";

interface Props {
  quiz: AcademyQuiz;
  sectionTitle: string;
  onComplete: (passed: boolean, scorePercent: number) => void;
}

export function QuizModal({ quiz, sectionTitle, onComplete }: Props) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const total = quiz.questions.length;
  const currentQuestion = quiz.questions[questionIndex];
  const passThreshold = quiz.passThreshold ?? 0.6;
  const finalPercent = Math.round((score / total) * 100);
  const passed = score / total >= passThreshold;

  const handleSelect = (idx: number) => {
    if (selectedIndex !== null) return; // already answered
    setSelectedIndex(idx);
    if (idx === currentQuestion.correctIndex) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (questionIndex + 1 >= total) {
      setDone(true);
      return;
    }
    setQuestionIndex((i) => i + 1);
    setSelectedIndex(null);
  };

  const handleFinish = () => {
    onComplete(passed, finalPercent);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,15,25,0.55)",
        backdropFilter: "blur(3px)",
        zIndex: 10005,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: "var(--ls-font-sans, system-ui, sans-serif)",
      }}
    >
      <style>{`
        @keyframes ls-quiz-enter {
          0% { opacity: 0; transform: translateY(10px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ls-quiz-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}</style>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quiz-title"
        style={{
          background: "white",
          borderRadius: 18,
          padding: 26,
          maxWidth: 480,
          width: "100%",
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
          boxShadow: "0 16px 50px rgba(0,0,0,0.30)",
          animation: "ls-quiz-enter 280ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      >
        {!done ? (
          <>
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 14,
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: 11,
                    color: "#6B6B62",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    margin: 0,
                  }}
                >
                  Quiz · {sectionTitle}
                </p>
                <p
                  id="quiz-title"
                  style={{
                    fontFamily: "Syne, serif",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#2C2C2A",
                    margin: "4px 0 0",
                  }}
                >
                  Question {questionIndex + 1} / {total}
                </p>
              </div>
              <span
                style={{
                  background: "rgba(184,146,42,0.12)",
                  color: "#B8922A",
                  padding: "4px 10px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                Score {score}/{total}
              </span>
            </div>

            {/* Question */}
            <p
              style={{
                fontFamily: "Syne, serif",
                fontSize: 18,
                fontWeight: 500,
                color: "#2C2C2A",
                margin: "0 0 18px",
                lineHeight: 1.4,
              }}
            >
              {currentQuestion.question}
            </p>

            {/* Réponses */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {currentQuestion.answers.map((answer, idx) => {
                const isSelected = selectedIndex === idx;
                const isCorrect = idx === currentQuestion.correctIndex;
                const showResult = selectedIndex !== null;
                let bg = "white";
                let borderColor = "#E5DFCF";
                let color = "#2C2C2A";
                let weight: 400 | 500 | 600 = 400;
                let animation: string | undefined;
                if (showResult) {
                  if (isCorrect) {
                    bg = "rgba(29,158,117,0.12)";
                    borderColor = "#1D9E75";
                    color = "#0F6E56";
                    weight = 600;
                  } else if (isSelected) {
                    bg = "rgba(216,90,48,0.12)";
                    borderColor = "#D85A30";
                    color = "#993556";
                    weight = 600;
                    animation = "ls-quiz-shake 280ms ease-out";
                  } else {
                    color = "#888";
                  }
                } else if (isSelected) {
                  borderColor = "#B8922A";
                }
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelect(idx)}
                    disabled={showResult}
                    style={{
                      textAlign: "left",
                      padding: "12px 14px",
                      borderRadius: 10,
                      background: bg,
                      border: `1.5px solid ${borderColor}`,
                      color,
                      fontWeight: weight,
                      fontFamily: "DM Sans, sans-serif",
                      fontSize: 14,
                      cursor: showResult ? "default" : "pointer",
                      transition: "background 200ms, border-color 200ms",
                      animation,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: showResult && isCorrect ? "#1D9E75" : showResult && isSelected ? "#D85A30" : "transparent",
                        border: showResult && (isCorrect || isSelected) ? "none" : "1.5px solid #C9C2AB",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        flexShrink: 0,
                      }}
                    >
                      {showResult && isCorrect ? "✓" : showResult && isSelected ? "✗" : String.fromCharCode(65 + idx)}
                    </span>
                    {answer}
                  </button>
                );
              })}
            </div>

            {/* Explication après réponse */}
            {selectedIndex !== null ? (
              <div
                style={{
                  background: selectedIndex === currentQuestion.correctIndex
                    ? "rgba(29,158,117,0.08)"
                    : "rgba(184,146,42,0.08)",
                  border: `1px solid ${selectedIndex === currentQuestion.correctIndex ? "rgba(29,158,117,0.25)" : "rgba(184,146,42,0.25)"}`,
                  borderRadius: 10,
                  padding: "12px 14px",
                  marginBottom: 14,
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    color: selectedIndex === currentQuestion.correctIndex ? "#0F6E56" : "#854F0B",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    margin: 0,
                    fontWeight: 600,
                  }}
                >
                  {selectedIndex === currentQuestion.correctIndex ? "✓ Bonne réponse" : "💡 À retenir"}
                </p>
                <p
                  style={{
                    fontSize: 13,
                    color: "#2C2C2A",
                    margin: "4px 0 0",
                    lineHeight: 1.5,
                  }}
                >
                  {currentQuestion.explanation}
                </p>
              </div>
            ) : null}

            {/* Bouton Suivant / Voir score */}
            {selectedIndex !== null ? (
              <button
                type="button"
                onClick={handleNext}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
                  color: "white",
                  border: "none",
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: "DM Sans, sans-serif",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(186,117,23,0.3)",
                }}
              >
                {questionIndex + 1 >= total ? "Voir mon score 🎯" : "Question suivante →"}
              </button>
            ) : null}
          </>
        ) : (
          <>
            {/* Écran final score */}
            <div style={{ textAlign: "center", padding: "10px 0 6px" }}>
              <div style={{ fontSize: 56, marginBottom: 4 }}>{passed ? "🎯" : "💪"}</div>
              <p
                style={{
                  fontFamily: "Syne, serif",
                  fontSize: 22,
                  fontWeight: 500,
                  color: "#2C2C2A",
                  margin: "8px 0 4px",
                }}
              >
                {passed ? "Bien joué !" : "Pas mal, mais tu peux mieux"}
              </p>
              <p style={{ fontSize: 14, color: "#5F5E5A", margin: 0 }}>
                Score : <strong style={{ color: passed ? "#1D9E75" : "#B8922A" }}>{score} / {total}</strong>{" "}
                ({finalPercent} %)
              </p>
              <p style={{ fontSize: 13, color: "#6B6B62", margin: "12px 0 0", lineHeight: 1.5 }}>
                {passed
                  ? "Tu as bien compris l'essentiel de cette section. La validation est confirmée."
                  : "Tu peux relancer cette section depuis /academy quand tu veux pour réviser. La validation est quand même comptée."}
              </p>
            </div>
            <button
              type="button"
              onClick={handleFinish}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 10,
                background: passed
                  ? "linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)"
                  : "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
                color: "white",
                border: "none",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "DM Sans, sans-serif",
                cursor: "pointer",
                marginTop: 18,
                boxShadow: passed
                  ? "0 2px 8px rgba(29,158,117,0.3)"
                  : "0 2px 8px rgba(186,117,23,0.3)",
              }}
            >
              Continuer →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
