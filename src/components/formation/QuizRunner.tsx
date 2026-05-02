// =============================================================================
// QuizRunner — orchestrateur quiz module Formation (Phase F-UI)
//
// Rend les questions QCM + free_text d un module en mode formulaire
// (toutes affichees, pas de step-by-step pour eviter friction).
//
// Logique :
//   1. State : map answers (questionId → answer)
//   2. Validation cote front : QCM doit avoir un index choisi, free_text
//      doit avoir minChars caracteres saisis
//   3. Submit : calcule quiz_score sur QCM uniquement (% de bonnes
//      reponses), passe les free_text a freeTextAnswers, appelle
//      submitModule via useFormationActions
//   4. Si autoValidated → ConfettiBurst + redirige vers la page niveau
//   5. Sinon → toast (gere par useFormationActions) + reload progression
// =============================================================================

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFormationActions } from "../../features/formation";
import type { FormationModule } from "../../data/formation";
import type {
  FormationFreeTextQuestion,
  FormationQcmQuestion,
} from "../../data/formation/types";
import { ConfettiBurst } from "../../features/academy/components/ConfettiBurst";

interface Props {
  module: FormationModule;
  /** Slug du niveau (pour le retour apres submission). */
  levelSlug: string;
  /** Callback quand le quiz est soumis avec succes (parent peut reload progression). */
  onSubmitDone?: () => void;
}

type QcmAnswerMap = Record<string, number>;
type FreeTextAnswerMap = Record<string, string>;

export function QuizRunner({ module, levelSlug, onSubmitDone }: Props) {
  const navigate = useNavigate();
  const { submitModule, busy } = useFormationActions();
  const [qcmAnswers, setQcmAnswers] = useState<QcmAnswerMap>({});
  const [freeTextAnswers, setFreeTextAnswers] = useState<FreeTextAnswerMap>({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<null | {
    autoValidated: boolean;
    score: number;
  }>(null);

  // Memos doivent etre AVANT tout early return (rules-of-hooks).
  const questions = module.quiz?.questions ?? [];
  const qcmQuestions = useMemo(
    () => questions.filter((q): q is FormationQcmQuestion => q.kind === "qcm"),
    [questions],
  );
  const freeQuestions = useMemo(
    () => questions.filter((q): q is FormationFreeTextQuestion => q.kind === "free_text"),
    [questions],
  );

  if (!module.quiz) {
    return (
      <div
        style={{
          padding: 20,
          textAlign: "center",
          color: "var(--ls-text-muted)",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        Pas de quiz pour ce module.
      </div>
    );
  }

  // Validation : tous les QCM ont une réponse + tous les free_text ont
  // minChars caractères.
  const allQcmAnswered = qcmQuestions.every((q) => qcmAnswers[q.id] !== undefined);
  const allFreeTextValid = freeQuestions.every((q) => {
    const answer = (freeTextAnswers[q.id] ?? "").trim();
    return answer.length >= (q.minChars ?? 1);
  });
  const canSubmit = allQcmAnswered && allFreeTextValid && !busy;

  async function handleSubmit() {
    if (!canSubmit) return;
    // Calcule score QCM (pourcentage)
    const correctCount = qcmQuestions.filter(
      (q) => qcmAnswers[q.id] === q.correctIndex,
    ).length;
    const totalQcm = qcmQuestions.length;
    const quizScore = totalQcm > 0 ? Math.round((correctCount / totalQcm) * 100) : 0;

    const freeTextPayload = freeQuestions.map((q) => ({
      questionId: q.id,
      question: q.question,
      answer: freeTextAnswers[q.id] ?? "",
    }));

    const result = await submitModule({
      moduleId: module.id,
      quizScore,
      quizAnswers: qcmQuestions.map((q) => ({
        questionId: q.id,
        chosenIndex: qcmAnswers[q.id],
        correctIndex: q.correctIndex,
        isCorrect: qcmAnswers[q.id] === q.correctIndex,
      })),
      freeTextAnswers: freeTextPayload,
    });

    if (!result) return;

    setSubmittedResult({ autoValidated: result.autoValidated, score: quizScore });
    if (result.autoValidated) {
      setShowConfetti(true);
    } else {
      // Redirige vers la page niveau apres 1.5s pour laisser voir le toast
      window.setTimeout(() => {
        navigate(`/formation/parcours/${levelSlug}`);
      }, 1500);
    }
    onSubmitDone?.();
  }

  // ─── Rendu post-submission (auto-validated avec confetti) ───────────────
  if (submittedResult?.autoValidated) {
    return (
      <>
        {showConfetti ? <ConfettiBurst onComplete={() => setShowConfetti(false)} /> : null}
        <div
          style={{
            padding: 32,
            textAlign: "center",
            fontFamily: "DM Sans, sans-serif",
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--ls-teal) 10%, var(--ls-surface)) 0%, var(--ls-surface) 100%)",
            border: "0.5px solid color-mix(in srgb, var(--ls-teal) 30%, var(--ls-border))",
            borderTop: "3px solid var(--ls-teal)",
            borderRadius: 18,
          }}
        >
          <div style={{ fontSize: 56, marginBottom: 12 }} aria-hidden="true">
            🎉
          </div>
          <h2
            style={{
              fontFamily: "Syne, serif",
              fontSize: 24,
              fontWeight: 800,
              margin: "0 0 8px",
              color: "var(--ls-text)",
              letterSpacing: "-0.02em",
            }}
          >
            Module validé à 100% !
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "var(--ls-text-muted)",
              margin: "0 0 16px",
              lineHeight: 1.55,
            }}
          >
            QCM parfait. Ton sponsor a reçu une notif et lira tes réponses libres pour rebondir.
          </p>
          <button
            type="button"
            onClick={() => navigate(`/formation/parcours/${levelSlug}`)}
            style={{
              padding: "10px 22px",
              borderRadius: 999,
              border: "none",
              background:
                "linear-gradient(135deg, var(--ls-teal) 0%, color-mix(in srgb, var(--ls-teal) 70%, #000) 100%)",
              color: "white",
              fontFamily: "Syne, serif",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              boxShadow: "0 6px 16px -4px color-mix(in srgb, var(--ls-teal) 35%, transparent)",
            }}
          >
            Continuer le parcours →
          </button>
        </div>
      </>
    );
  }

  // ─── Rendu post-submission (pending sponsor) ────────────────────────────
  if (submittedResult && !submittedResult.autoValidated) {
    return (
      <div
        style={{
          padding: 28,
          textAlign: "center",
          fontFamily: "DM Sans, sans-serif",
          background: "var(--ls-surface)",
          border: "0.5px solid var(--ls-border)",
          borderTop: "3px solid var(--ls-gold)",
          borderRadius: 18,
        }}
      >
        <div style={{ fontSize: 44, marginBottom: 12 }} aria-hidden="true">
          📬
        </div>
        <h2
          style={{
            fontFamily: "Syne, serif",
            fontSize: 22,
            fontWeight: 800,
            margin: "0 0 8px",
            color: "var(--ls-text)",
          }}
        >
          Soumis pour validation
        </h2>
        <p style={{ fontSize: 13.5, color: "var(--ls-text-muted)", margin: 0, lineHeight: 1.55 }}>
          QCM {submittedResult.score}% — ton sponsor va relire tes réponses et te répondre sous 48h.
          Tu seras notifié.
        </p>
      </div>
    );
  }

  // ─── Rendu formulaire principal ─────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, fontFamily: "DM Sans, sans-serif" }}>
      <div
        style={{
          padding: "12px 14px",
          background: "color-mix(in srgb, var(--ls-gold) 6%, var(--ls-surface))",
          border: "0.5px dashed color-mix(in srgb, var(--ls-gold) 30%, transparent)",
          borderRadius: 12,
          fontSize: 12.5,
          color: "var(--ls-text-muted)",
          lineHeight: 1.5,
        }}
      >
        💡 <strong style={{ color: "var(--ls-gold)" }}>Comment ça marche :</strong> les QCM
        comptent dans ton score. Les réponses libres ne comptent pas mais sont obligatoires —
        ton sponsor les lira. Si tu fais 100% des QCM = validation auto + félicitations 🎉
      </div>

      {/* QCM */}
      {qcmQuestions.map((q, idx) => (
        <QcmPanel
          key={q.id}
          question={q}
          index={idx + 1}
          chosenIndex={qcmAnswers[q.id]}
          onChoose={(i) => setQcmAnswers((s) => ({ ...s, [q.id]: i }))}
        />
      ))}

      {/* Free text */}
      {freeQuestions.map((q, idx) => (
        <FreeTextPanel
          key={q.id}
          question={q}
          index={qcmQuestions.length + idx + 1}
          value={freeTextAnswers[q.id] ?? ""}
          onChange={(v) => setFreeTextAnswers((s) => ({ ...s, [q.id]: v }))}
        />
      ))}

      {/* Submit */}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => void handleSubmit()}
          style={{
            padding: "12px 26px",
            borderRadius: 999,
            border: "none",
            background:
              "linear-gradient(135deg, var(--ls-gold) 0%, color-mix(in srgb, var(--ls-gold) 70%, #000) 100%)",
            color: "var(--ls-gold-contrast, #FFFFFF)",
            fontFamily: "Syne, serif",
            fontWeight: 700,
            fontSize: 14,
            cursor: canSubmit ? "pointer" : "not-allowed",
            opacity: canSubmit ? 1 : 0.5,
            boxShadow: canSubmit
              ? "0 6px 18px -4px color-mix(in srgb, var(--ls-gold) 40%, transparent)"
              : "none",
            transition: "transform 0.15s, filter 0.15s",
          }}
        >
          {busy ? "Envoi…" : "✅ Soumettre le quiz"}
        </button>
      </div>
    </div>
  );
}

// ─── Sous-composant QcmPanel ──────────────────────────────────────────────

function QcmPanel({
  question,
  index,
  chosenIndex,
  onChoose,
}: {
  question: FormationQcmQuestion;
  index: number;
  chosenIndex: number | undefined;
  onChoose: (i: number) => void;
}) {
  return (
    <fieldset
      style={{
        background: "var(--ls-surface)",
        border: "0.5px solid var(--ls-border)",
        borderRadius: 14,
        padding: "16px 18px",
        margin: 0,
      }}
    >
      <legend
        style={{
          fontFamily: "Syne, serif",
          fontWeight: 800,
          fontSize: 13,
          color: "var(--ls-text)",
          padding: "0 8px",
          letterSpacing: "-0.01em",
        }}
      >
        Q{index} · QCM
      </legend>
      <p
        style={{
          fontSize: 14.5,
          color: "var(--ls-text)",
          fontWeight: 600,
          margin: "0 0 12px",
          lineHeight: 1.5,
        }}
      >
        {question.question}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {question.answers.map((ans, idx) => {
          const isChosen = chosenIndex === idx;
          return (
            <label
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                background: isChosen
                  ? "color-mix(in srgb, var(--ls-teal) 12%, var(--ls-surface2))"
                  : "var(--ls-surface2)",
                border: isChosen
                  ? "0.5px solid color-mix(in srgb, var(--ls-teal) 50%, transparent)"
                  : "0.5px solid var(--ls-border)",
                borderRadius: 10,
                cursor: "pointer",
                fontSize: 13.5,
                color: "var(--ls-text)",
                transition: "background 0.15s, border-color 0.15s",
              }}
            >
              <input
                type="radio"
                name={question.id}
                checked={isChosen}
                onChange={() => onChoose(idx)}
                style={{
                  accentColor: "var(--ls-teal)",
                  cursor: "pointer",
                }}
              />
              <span>{ans}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

// ─── Sous-composant FreeTextPanel ─────────────────────────────────────────

function FreeTextPanel({
  question,
  index,
  value,
  onChange,
}: {
  question: FormationFreeTextQuestion;
  index: number;
  value: string;
  onChange: (v: string) => void;
}) {
  const minChars = question.minChars ?? 1;
  const currentLength = value.trim().length;
  const isValid = currentLength >= minChars;

  return (
    <fieldset
      style={{
        background: "var(--ls-surface)",
        border: "0.5px solid var(--ls-border)",
        borderLeft: "3px solid var(--ls-purple)",
        borderRadius: 14,
        padding: "16px 18px",
        margin: 0,
      }}
    >
      <legend
        style={{
          fontFamily: "Syne, serif",
          fontWeight: 800,
          fontSize: 13,
          color: "var(--ls-purple)",
          padding: "0 8px",
          letterSpacing: "-0.01em",
        }}
      >
        Q{index} · Réponse libre
      </legend>
      <p
        style={{
          fontSize: 14.5,
          color: "var(--ls-text)",
          fontWeight: 600,
          margin: "0 0 6px",
          lineHeight: 1.5,
        }}
      >
        {question.question}
      </p>
      <p
        style={{
          fontSize: 12.5,
          color: "var(--ls-text-muted)",
          margin: "0 0 12px",
          lineHeight: 1.5,
          fontStyle: "italic",
        }}
      >
        {question.prompt}
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        placeholder="Écris ta réponse ici…"
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "10px 12px",
          background: "var(--ls-surface2)",
          border: "0.5px solid var(--ls-border)",
          borderRadius: 12,
          color: "var(--ls-text)",
          fontFamily: "DM Sans, sans-serif",
          fontSize: 13.5,
          lineHeight: 1.5,
          resize: "vertical",
          outline: "none",
        }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 6,
          fontSize: 11,
          color: isValid ? "var(--ls-teal)" : "var(--ls-text-muted)",
          fontWeight: 600,
        }}
      >
        <span>
          {isValid ? "✓" : "○"} Minimum {minChars} caractères
        </span>
        <span style={{ fontFamily: "DM Mono, monospace", fontVariantNumeric: "tabular-nums" }}>
          {currentLength}
        </span>
      </div>
    </fieldset>
  );
}
