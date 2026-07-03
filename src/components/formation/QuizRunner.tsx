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

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFormationActions } from "../../features/formation";
import { getNextFormationStep } from "../../data/formation";
import type { FormationModule } from "../../data/formation";
import type {
  FormationFreeTextQuestion,
  FormationQcmQuestion,
} from "../../data/formation/types";
import { ConfettiBurst } from "../../features/academy/components/ConfettiBurst";
import { QuizAnswersDetailRenderer } from "./QuizAnswersDetailRenderer";

// ─── Anti-perte : sauvegarde brouillon free_text en localStorage ───────────
const DRAFT_STORAGE_PREFIX = "ls_formation_quiz_draft_";

function readDraft(moduleId: string): { qcm: Record<string, number>; free: Record<string, string> } {
  if (typeof window === "undefined") return { qcm: {}, free: {} };
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_PREFIX + moduleId);
    if (!raw) return { qcm: {}, free: {} };
    const parsed = JSON.parse(raw);
    return { qcm: parsed.qcm ?? {}, free: parsed.free ?? {} };
  } catch {
    return { qcm: {}, free: {} };
  }
}

function writeDraft(moduleId: string, data: { qcm: Record<string, number>; free: Record<string, string> }): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_STORAGE_PREFIX + moduleId, JSON.stringify(data));
  } catch {
    /* quota / private */
  }
}

function clearDraft(moduleId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_STORAGE_PREFIX + moduleId);
  } catch {
    /* noop */
  }
}

interface Props {
  module: FormationModule;
  /** Slug du niveau (pour le retour apres submission). */
  levelSlug: string;
  /** Callback quand le quiz est soumis avec succes (parent peut reload progression). */
  onSubmitDone?: () => void;
  /** Callback "annuler / retour aux leçons" depuis le quiz. */
  onCancel?: () => void;
}

type QcmAnswerMap = Record<string, number>;
type FreeTextAnswerMap = Record<string, string>;

export function QuizRunner({ module, levelSlug, onSubmitDone, onCancel }: Props) {
  const navigate = useNavigate();
  const { submitModule, busy } = useFormationActions();

  // Restaure le brouillon des reponses si refresh / retour arriere
  const initialDraft = useMemo(() => readDraft(module.id), [module.id]);
  const [qcmAnswers, setQcmAnswers] = useState<QcmAnswerMap>(initialDraft.qcm);
  const [freeTextAnswers, setFreeTextAnswers] = useState<FreeTextAnswerMap>(initialDraft.free);
  const [showConfetti, setShowConfetti] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<null | {
    autoValidated: boolean;
    score: number;
  }>(null);

  // UX safety (2026-05-03) : écran intro de confirmation avant que les
  // questions s'affichent. Évite les clics par erreur (cf. retour Mandy
  // "j'ai cliqué sans faire exprès et n'arrivais pas à faire retour").
  // Si un brouillon existe déjà → on saute l'intro (l'user reprend là
  // où il en était).
  const hasDraft =
    Object.keys(initialDraft.qcm).length > 0 ||
    Object.values(initialDraft.free).some((v) => v.trim().length > 0);
  const [started, setStarted] = useState(hasDraft);

  // Persiste le brouillon en localStorage a chaque modif (debounce-free,
  // setItem est rapide).
  useEffect(() => {
    writeDraft(module.id, { qcm: qcmAnswers, free: freeTextAnswers });
  }, [module.id, qcmAnswers, freeTextAnswers]);

  // Memos doivent etre AVANT tout early return (rules-of-hooks).
  const questions = useMemo(() => module.quiz?.questions ?? [], [module.quiz]);
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
  // au moins 1 caractère (Phase 0.9 brainstorm Égypte 2026-05 — Thomas
  // a retiré le minimum 80 caractères pour ne pas frustrer l'apprenant.
  // Le sponsor lit quand même la réponse libre quel qu'en soit la taille).
  const allQcmAnswered = qcmQuestions.every((q) => qcmAnswers[q.id] !== undefined);
  const allFreeTextValid = freeQuestions.every((q) => {
    const answer = (freeTextAnswers[q.id] ?? "").trim();
    return answer.length >= 1;
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
    // Cleanup brouillon apres soumission reussie
    clearDraft(module.id);
    // Chantier récap quiz (2026-05-28) : confettis si score ≥ 80% (qu'il y
    // ait validation auto ou pas). Sinon icône neutre côté UI. Plus de redirect
    // auto — l'utilisateur reste sur la page récap et choisit lui-même
    // "module suivant" ou "retour accueil".
    if (quizScore >= 80) {
      setShowConfetti(true);
    }
    onSubmitDone?.();
  }

  // ─── Rendu post-submission (récap unifié — chantier 2026-05-28) ─────────
  // Une SEULE page récap qui couvre les 3 cas :
  //   - autoValidated (100% QCM) → 🎉 célébration + confettis
  //   - score ≥ 80 mais pas auto → 🎉 "Bien joué" + confettis (l'effort est là)
  //   - score < 80 → ✓ neutre, pas de confettis, l'user voit clairement
  //     qu'il peut relire ses erreurs avant de continuer
  //
  // Plus de redirect auto. L'utilisateur choisit lui-même via 2 boutons :
  //   - "Passer au module suivant" (primaire) — pointe sur le module N+1
  //     du même niveau, ou sur la page du niveau N+1 si dernier module,
  //     ou sur /formation si dernier module du dernier niveau.
  //   - "Retour à l'accueil formation" (secondaire) — /formation
  if (submittedResult) {
    const { autoValidated, score } = submittedResult;
    const isHighScore = score >= 80;
    const localAnswers = qcmQuestions.map((q) => ({
      questionId: q.id,
      chosenIndex: qcmAnswers[q.id],
      correctIndex: q.correctIndex,
      isCorrect: qcmAnswers[q.id] === q.correctIndex,
    }));
    const correctCount = localAnswers.filter((a) => a.isCorrect).length;
    const totalQcm = qcmQuestions.length;
    const nextStep = getNextFormationStep(levelSlug, module.slug);

    // Hero copy contextualisé
    const heroIcon = autoValidated ? "🎉" : isHighScore ? "🎉" : "✓";
    const heroTitle = autoValidated
      ? "Module validé à 100% !"
      : isHighScore
        ? "Bien joué !"
        : "Quiz terminé";
    const heroSubtitle = autoValidated
      ? "QCM parfait. Ton sponsor a reçu une notif et lira tes réponses libres pour rebondir."
      : isHighScore
        ? `Bon score ! ${freeQuestions.length > 0 ? "Ton sponsor relira tes réponses libres et te répondra sous 48h." : "Tu peux passer à la suite."}`
        : "Tu peux relire ci-dessous les bonnes réponses avant de passer au module suivant.";
    const heroAccent = isHighScore ? "var(--ls-teal)" : "var(--ls-gold)";

    return (
      <>
        {showConfetti ? <ConfettiBurst onComplete={() => setShowConfetti(false)} /> : null}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, fontFamily: "DM Sans, sans-serif" }}>
          {/* HERO Score + Jauge bonnes réponses */}
          <div
            style={{
              padding: "clamp(20px, 5vw, 32px)",
              textAlign: "center",
              background: `linear-gradient(135deg, color-mix(in srgb, ${heroAccent} 10%, var(--ls-surface)) 0%, var(--ls-surface) 100%)`,
              border: `0.5px solid color-mix(in srgb, ${heroAccent} 30%, var(--ls-border))`,
              borderTop: `3px solid ${heroAccent}`,
              borderRadius: 18,
            }}
          >
            <div style={{ fontSize: "clamp(44px, 12vw, 56px)", marginBottom: 12, lineHeight: 1 }} aria-hidden="true">
              {heroIcon}
            </div>
            <h2
              style={{
                fontFamily: "Syne, sans-serif",
                fontSize: "clamp(20px, 5.5vw, 24px)",
                fontWeight: 800,
                margin: "0 0 8px",
                color: "var(--ls-text)",
                letterSpacing: "-0.02em",
              }}
            >
              {heroTitle}
            </h2>
            <p
              style={{
                fontSize: 13.5,
                color: "var(--ls-text-muted)",
                margin: "0 0 16px",
                lineHeight: 1.55,
                maxWidth: 460,
                marginInline: "auto",
              }}
            >
              {heroSubtitle}
            </p>

            {/* Jauge bonnes réponses */}
            {totalQcm > 0 ? (
              <div style={{ maxWidth: 360, margin: "0 auto" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: 6,
                    fontSize: 12,
                    color: "var(--ls-text-muted)",
                    fontWeight: 600,
                  }}
                >
                  <span>Bonnes réponses QCM</span>
                  <span
                    style={{
                      fontFamily: "Syne, sans-serif",
                      fontWeight: 800,
                      fontSize: 16,
                      color: heroAccent,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {correctCount} / {totalQcm} · {score}%
                  </span>
                </div>
                <div
                  style={{
                    height: 8,
                    borderRadius: 4,
                    background: "var(--ls-surface2)",
                    overflow: "hidden",
                    border: "0.5px solid var(--ls-border)",
                  }}
                >
                  <div
                    style={{
                      width: `${score}%`,
                      height: "100%",
                      background: heroAccent,
                      transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>

          {/* Détail QCM (relire bonnes réponses + erreurs) */}
          {totalQcm > 0 ? (
            <div
              style={{
                padding: "clamp(14px, 3.5vw, 18px)",
                background: "var(--ls-surface)",
                border: "0.5px solid var(--ls-border)",
                borderRadius: 14,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  color: "var(--ls-gold)",
                  marginBottom: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span aria-hidden="true">📝</span> Détail de tes réponses
              </div>
              <QuizAnswersDetailRenderer
                qcmQuestions={qcmQuestions}
                answers={localAnswers}
                audience="distri"
              />
            </div>
          ) : null}

          {/* Détail free_text avec badge "💬 En attente sponsor" */}
          {freeQuestions.length > 0 ? (
            <div
              style={{
                padding: "clamp(14px, 3.5vw, 18px)",
                background: "var(--ls-surface)",
                border: "0.5px solid var(--ls-border)",
                borderLeft: "3px solid var(--ls-purple)",
                borderRadius: 14,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  color: "var(--ls-purple)",
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span aria-hidden="true">💭</span> Tes réponses libres
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {freeQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    style={{
                      padding: "12px 14px",
                      background: "var(--ls-surface2)",
                      border: "0.5px solid var(--ls-border)",
                      borderRadius: 10,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "Syne, sans-serif",
                          fontWeight: 800,
                          fontSize: 12,
                          color: "var(--ls-text)",
                          flex: 1,
                          minWidth: 0,
                          lineHeight: 1.4,
                        }}
                      >
                        Q{qcmQuestions.length + idx + 1} · {q.question}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 999,
                          background: "color-mix(in srgb, var(--ls-purple) 14%, transparent)",
                          color: "var(--ls-purple)",
                          border: "0.5px solid color-mix(in srgb, var(--ls-purple) 35%, transparent)",
                          letterSpacing: "0.04em",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        💬 En attente sponsor
                      </span>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        color: "var(--ls-text-muted)",
                        lineHeight: 1.55,
                        whiteSpace: "pre-wrap",
                        fontStyle: "italic",
                      }}
                    >
                      « {freeTextAnswers[q.id]?.trim() || "(vide)"} »
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* 2 boutons navigation : étape suivante (primaire) + accueil (secondaire) */}
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              justifyContent: "center",
              marginTop: 4,
            }}
          >
            <button
              type="button"
              onClick={() => navigate(nextStep.path)}
              style={{
                flex: "1 1 240px",
                minWidth: 0,
                maxWidth: 360,
                padding: "14px 22px",
                borderRadius: 14,
                border: "none",
                background:
                  "linear-gradient(135deg, var(--ls-gold) 0%, color-mix(in srgb, var(--ls-gold) 70%, var(--ls-coral)) 100%)",
                color: "var(--ls-bg)",
                fontFamily: "Syne, sans-serif",
                fontWeight: 800,
                fontSize: 14,
                cursor: "pointer",
                boxShadow: "0 6px 18px -4px color-mix(in srgb, var(--ls-gold) 40%, transparent)",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: 12,
                lineHeight: 1.3,
              }}
            >
              <span style={{ fontSize: 22, flexShrink: 0 }} aria-hidden="true">
                →
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block" }}>{nextStep.label}</span>
                {nextStep.subLabel ? (
                  <span
                    style={{
                      display: "block",
                      fontSize: 11.5,
                      fontWeight: 500,
                      opacity: 0.85,
                      marginTop: 2,
                      fontFamily: "DM Sans, sans-serif",
                      letterSpacing: 0,
                    }}
                  >
                    {nextStep.subLabel}
                  </span>
                ) : null}
              </span>
            </button>
            <button
              type="button"
              onClick={() => navigate("/formation")}
              style={{
                flex: "0 1 200px",
                padding: "14px 22px",
                borderRadius: 14,
                border: "0.5px solid var(--ls-border)",
                background: "var(--ls-surface)",
                color: "var(--ls-text-muted)",
                fontFamily: "DM Sans, sans-serif",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                lineHeight: 1.3,
              }}
            >
              ← Retour à l'accueil de la formation
            </button>
          </div>
        </div>
      </>
    );
  }

  // ─── Écran intro (avant démarrage) ──────────────────────────────────────
  // UX safety : oblige le user à confirmer avant de voir les questions.
  if (!started) {
    return (
      <div
        style={{
          padding: "clamp(18px, 4.5vw, 28px)",
          textAlign: "center",
          fontFamily: "DM Sans, sans-serif",
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 8%, var(--ls-surface)) 0%, var(--ls-surface) 100%)",
          border: "0.5px solid color-mix(in srgb, var(--ls-gold) 30%, var(--ls-border))",
          borderTop: "3px solid var(--ls-gold)",
          borderRadius: 18,
        }}
      >
        <div style={{ fontSize: 44, marginBottom: 12 }} aria-hidden="true">
          ✦
        </div>
        <h2
          style={{
            fontFamily: "Syne, sans-serif",
            fontSize: 22,
            fontWeight: 800,
            margin: "0 0 10px",
            color: "var(--ls-text)",
            letterSpacing: "-0.01em",
          }}
        >
          Tu es prêt·e ?
        </h2>
        <p
          style={{
            fontSize: 13.5,
            color: "var(--ls-text-muted)",
            margin: "0 0 20px",
            lineHeight: 1.6,
            maxWidth: 460,
            marginInline: "auto",
          }}
        >
          {qcmQuestions.length} question{qcmQuestions.length > 1 ? "s" : ""} QCM
          {freeQuestions.length > 0
            ? ` + ${freeQuestions.length} réponse${freeQuestions.length > 1 ? "s" : ""} libre${freeQuestions.length > 1 ? "s" : ""}`
            : ""}
          . Prends ton temps pour bien lire chaque question. Pas de stress —
          tant que tu n'as pas cliqué « Soumettre », tu peux annuler et
          revenir aux leçons.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => onCancel?.()}
            disabled={!onCancel}
            style={{
              padding: "12px 22px",
              borderRadius: 999,
              border: "0.5px solid var(--ls-border)",
              background: "transparent",
              color: "var(--ls-text-muted)",
              fontFamily: "DM Sans, sans-serif",
              fontSize: 13,
              cursor: onCancel ? "pointer" : "default",
              opacity: onCancel ? 1 : 0.4,
            }}
          >
            ← Revenir aux leçons
          </button>
          <button
            type="button"
            onClick={() => setStarted(true)}
            style={{
              padding: "12px 28px",
              borderRadius: 999,
              border: "none",
              background:
                "linear-gradient(135deg, var(--ls-gold) 0%, color-mix(in srgb, var(--ls-gold) 70%, var(--ls-coral)) 100%)",
              color: "var(--ls-bg)",
              fontFamily: "Syne, sans-serif",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              boxShadow: "0 6px 16px -4px color-mix(in srgb, var(--ls-gold) 35%, transparent)",
            }}
          >
            🚀 Lancer le quiz
          </button>
        </div>
      </div>
    );
  }

  // ─── Rendu formulaire principal ─────────────────────────────────────────
  // Compteurs de progression
  const qcmAnsweredCount = qcmQuestions.filter((q) => qcmAnswers[q.id] !== undefined).length;
  const freeTextValidCount = freeQuestions.filter((q) => {
    const ans = (freeTextAnswers[q.id] ?? "").trim();
    return ans.length >= (q.minChars ?? 1);
  }).length;
  const totalCount = qcmQuestions.length + freeQuestions.length;
  const filledCount = qcmAnsweredCount + freeTextValidCount;
  const progressPct = totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0;

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

      {/* Bouton "Revenir aux leçons" toujours visible (UX safety 2026-05-03) */}
      {onCancel && (
        <button
          type="button"
          onClick={() => {
            const confirmExit = window.confirm(
              "Quitter le quiz ?\n\nTes réponses en cours seront sauvegardées. Tu pourras reprendre quand tu veux.",
            );
            if (confirmExit) onCancel();
          }}
          style={{
            alignSelf: "flex-start",
            padding: "6px 14px",
            borderRadius: 999,
            border: "0.5px solid var(--ls-border)",
            background: "transparent",
            color: "var(--ls-text-muted)",
            fontFamily: "DM Sans, sans-serif",
            fontSize: 11.5,
            cursor: "pointer",
          }}
        >
          ← Revenir aux leçons
        </button>
      )}

      {/* Indicateur progression quiz */}
      <div
        style={{
          padding: "10px 14px",
          background: "var(--ls-surface)",
          border: "0.5px solid var(--ls-border)",
          borderRadius: 12,
          fontSize: 12,
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ color: "var(--ls-text-muted)", fontWeight: 600 }}>
            Ta progression
          </span>
          <span
            style={{
              fontFamily: "Syne, sans-serif",
              fontWeight: 800,
              color: progressPct === 100 ? "var(--ls-teal)" : "var(--ls-gold)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {filledCount} / {totalCount}
          </span>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: "var(--ls-surface2)", overflow: "hidden" }}>
          <div
            style={{
              width: `${progressPct}%`,
              height: "100%",
              background: progressPct === 100 ? "var(--ls-teal)" : "var(--ls-gold)",
              transition: "width 0.4s ease",
            }}
          />
        </div>
        {progressPct < 100 ? (
          <div style={{ fontSize: 10.5, color: "var(--ls-text-hint)", marginTop: 6 }}>
            ✏️ Brouillon sauvegardé automatiquement — tu peux fermer et revenir plus tard.
          </div>
        ) : null}
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

      {/* Free text — Phase 0.9 brainstorm Égypte (2026-05) : section pliable
          pour ne plus mélanger QCM et réponse libre. Auto-ouvert si une
          réponse a déjà été commencée (continuation), sinon fermé par
          défaut (l'apprenant doit faire l'effort de l'ouvrir = focus QCM
          d'abord). */}
      {freeQuestions.length > 0 ? (
        <details
          open={freeQuestions.some((q) => (freeTextAnswers[q.id] ?? "").trim().length > 0)}
          style={{
            background: "var(--ls-surface)",
            border: "0.5px solid var(--ls-border)",
            borderLeft: "3px solid var(--ls-purple)",
            borderRadius: 14,
          }}
        >
          <summary
            style={{
              cursor: "pointer",
              padding: "14px 18px",
              fontFamily: "Syne, sans-serif",
              fontWeight: 800,
              fontSize: 14,
              color: "var(--ls-text)",
              letterSpacing: "-0.01em",
              listStyle: "none",
              outline: "none",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span aria-hidden="true">💭</span>
            <span>Ton ressenti libre</span>
            <span
              style={{
                fontSize: 10,
                color: "var(--ls-text-muted)",
                fontFamily: "DM Sans, sans-serif",
                fontWeight: 500,
                letterSpacing: 0,
                marginLeft: "auto",
                textTransform: "uppercase",
              }}
            >
              Obligatoire
            </span>
          </summary>
          <div
            style={{
              padding: "0 14px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {freeQuestions.map((q, idx) => (
              <FreeTextPanel
                key={q.id}
                question={q}
                index={qcmQuestions.length + idx + 1}
                value={freeTextAnswers[q.id] ?? ""}
                onChange={(v) => setFreeTextAnswers((s) => ({ ...s, [q.id]: v }))}
              />
            ))}
          </div>
        </details>
      ) : null}

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
            fontFamily: "Syne, sans-serif",
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
        padding: "clamp(12px, 3.5vw, 18px)",
        margin: 0,
      }}
    >
      <legend
        style={{
          fontFamily: "Syne, sans-serif",
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
  // Phase 0.9 brainstorm Égypte 2026-05 : minimum forcé à 1 caractère
  // (Thomas a retiré le minimum 80 caractères). On garde le champ
  // obligatoire mais 1 char suffit.
  const currentLength = value.trim().length;
  const isValid = currentLength >= 1;

  return (
    <fieldset
      style={{
        background: "var(--ls-surface)",
        border: "0.5px solid var(--ls-border)",
        borderLeft: "3px solid var(--ls-purple)",
        borderRadius: 14,
        padding: "clamp(12px, 3.5vw, 18px)",
        margin: 0,
      }}
    >
      <legend
        style={{
          fontFamily: "Syne, sans-serif",
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
          {isValid ? "✓" : "○"} Obligatoire
        </span>
        <span style={{ fontFamily: "DM Mono, monospace", fontVariantNumeric: "tabular-nums" }}>
          {currentLength}
        </span>
      </div>
    </fieldset>
  );
}
