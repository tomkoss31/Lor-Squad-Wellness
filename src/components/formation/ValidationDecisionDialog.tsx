// =============================================================================
// ValidationDecisionDialog — modale de validation sponsor/admin (Phase C)
//
// 3 actions principales :
//   ✅ Valider directement
//   💬 Demander un complément (status repasse en in_progress)
//   🚫 Rejeter (status='rejected', distri peut refaire)
//
// Inclut un panneau ReviewThreadPanel (discussion liee a la progression)
// pour voir l historique avant de decider.
// =============================================================================

import { useState } from "react";
import { useFormationActions } from "../../features/formation";
import { ReviewThreadPanel } from "./ReviewThreadPanel";
import { QuizAnswersDetailPanel } from "./QuizAnswersDetailPanel";

type Mode = "menu" | "validate" | "request" | "reject";

interface Props {
  progressId: string;
  userName: string;
  moduleId: string;
  quizScore?: number | null;
  isAdminRelay?: boolean;
  onClose: () => void;
  onActionDone: () => void;
}

export function ValidationDecisionDialog({
  progressId,
  userName,
  moduleId,
  quizScore,
  isAdminRelay = false,
  onClose,
  onActionDone,
}: Props) {
  const { validateModule, requestComplement, rejectModule, busy } = useFormationActions();
  const [mode, setMode] = useState<Mode>("menu");
  const [feedback, setFeedback] = useState("");

  async function handleValidate() {
    const ok = await validateModule({ progressId, feedback: feedback.trim() || undefined });
    if (ok) onActionDone();
  }
  async function handleRequest() {
    if (!feedback.trim()) return;
    const ok = await requestComplement({ progressId, message: feedback.trim() });
    if (ok) onActionDone();
  }
  async function handleReject() {
    if (!feedback.trim()) return;
    const ok = await rejectModule({ progressId, feedback: feedback.trim() });
    if (ok) onActionDone();
  }

  return (
    <div
      role="presentation"
      aria-hidden="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events -- stopPropagation only, dialog role on element */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ls-formation-validation-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--ls-surface)",
          border: "0.5px solid var(--ls-border)",
          borderTop: `3px solid ${isAdminRelay ? "var(--ls-purple)" : "var(--ls-gold)"}`,
          borderRadius: 18,
          width: "100%",
          maxWidth: 560,
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 24px 48px -16px rgba(0,0,0,0.45)",
          color: "var(--ls-text)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "0.5px solid var(--ls-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontWeight: 700,
                color: isAdminRelay ? "var(--ls-purple)" : "var(--ls-gold)",
                marginBottom: 2,
              }}
            >
              {isAdminRelay ? "Admin relay" : "Validation sponsor"}
            </div>
            <h2
              id="ls-formation-validation-title"
              style={{
                fontFamily: "Syne, serif",
                fontSize: 17,
                fontWeight: 800,
                margin: 0,
                color: "var(--ls-text)",
                letterSpacing: "-0.01em",
              }}
            >
              {userName} · Module {moduleId}
              {quizScore != null ? <> · Quiz {Math.round(quizScore)}%</> : null}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "transparent",
              border: "none",
              color: "var(--ls-text-muted)",
              cursor: "pointer",
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Détail du quiz QCM (refonte 2026-05-03 — visibilité erreurs sponsor) */}
        <div style={{ padding: "12px 20px", borderBottom: "0.5px solid var(--ls-border)" }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontWeight: 700,
              color: "var(--ls-gold)",
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span aria-hidden="true">📝</span>
            Détail du quiz
            {quizScore != null ? (
              <span style={{ marginLeft: "auto", color: "var(--ls-text-muted)", letterSpacing: 0 }}>
                Score : {Math.round(quizScore)}%
              </span>
            ) : null}
          </div>
          <QuizAnswersDetailPanel progressId={progressId} moduleId={moduleId} />
        </div>

        {/* Discussion historique */}
        <div style={{ padding: "12px 20px" }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontWeight: 700,
              color: "var(--ls-text-muted)",
              marginBottom: 8,
            }}
          >
            Historique (réponse libre + thread)
          </div>
          <ReviewThreadPanel progressId={progressId} compact />
        </div>

        {/* Mode menu : 3 actions */}
        {mode === "menu" ? (
          <div style={{ padding: "12px 20px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              type="button"
              disabled={busy}
              onClick={() => setMode("validate")}
              style={primaryButtonStyle("var(--ls-teal)")}
            >
              ✅ Valider ce module
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setMode("request")}
              style={secondaryButtonStyle("var(--ls-gold)")}
            >
              💬 Demander un complément
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setMode("reject")}
              style={secondaryButtonStyle("var(--ls-coral)")}
            >
              🚫 Rejeter
            </button>
          </div>
        ) : null}

        {/* Mode validate : champ feedback optionnel */}
        {mode === "validate" ? (
          <ActionPanel
            title="Valider ce module"
            color="var(--ls-teal)"
            placeholder="Message de félicitations (optionnel)"
            value={feedback}
            onChange={setFeedback}
            optional
            onCancel={() => setMode("menu")}
            onSubmit={handleValidate}
            submitLabel="Valider"
            busy={busy}
          />
        ) : null}

        {/* Mode request : message obligatoire */}
        {mode === "request" ? (
          <ActionPanel
            title="Demander un complément"
            color="var(--ls-gold)"
            placeholder="Décris ce qui manque ou ce que tu veux mieux comprendre…"
            value={feedback}
            onChange={setFeedback}
            onCancel={() => setMode("menu")}
            onSubmit={handleRequest}
            submitLabel="Envoyer la demande"
            busy={busy}
          />
        ) : null}

        {/* Mode reject : feedback obligatoire */}
        {mode === "reject" ? (
          <ActionPanel
            title="Rejeter ce module"
            color="var(--ls-coral)"
            placeholder="Explique pourquoi (le distri pourra refaire avec ton feedback)"
            value={feedback}
            onChange={setFeedback}
            onCancel={() => setMode("menu")}
            onSubmit={handleReject}
            submitLabel="Rejeter"
            busy={busy}
          />
        ) : null}
      </div>
    </div>
  );
}

// ─── Sous-composant ActionPanel ─────────────────────────────────────────────

function ActionPanel({
  title,
  color,
  placeholder,
  value,
  onChange,
  optional = false,
  onCancel,
  onSubmit,
  submitLabel,
  busy,
}: {
  title: string;
  color: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  optional?: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
  busy: boolean;
}) {
  const canSubmit = optional || value.trim().length > 0;
  return (
    <div style={{ padding: "12px 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      <h3
        style={{
          fontFamily: "Syne, serif",
          fontWeight: 800,
          fontSize: 15,
          margin: 0,
          color: "var(--ls-text)",
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h3>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
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
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          style={{
            padding: "9px 18px",
            borderRadius: 999,
            border: "0.5px solid var(--ls-border)",
            background: "transparent",
            color: "var(--ls-text-muted)",
            fontSize: 13,
            fontWeight: 500,
            cursor: busy ? "not-allowed" : "pointer",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          Retour
        </button>
        <button
          type="button"
          disabled={busy || !canSubmit}
          onClick={onSubmit}
          style={primaryButtonStyle(color)}
        >
          {busy ? "Envoi…" : submitLabel}
        </button>
      </div>
    </div>
  );
}

function primaryButtonStyle(accentVar: string): React.CSSProperties {
  return {
    padding: "10px 22px",
    borderRadius: 999,
    border: "none",
    background: `linear-gradient(135deg, ${accentVar} 0%, color-mix(in srgb, ${accentVar} 70%, #000) 100%)`,
    color: "white",
    fontFamily: "Syne, serif",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    boxShadow: `0 4px 12px -4px color-mix(in srgb, ${accentVar} 35%, transparent)`,
    fontFamily_: "DM Sans",
  } as unknown as React.CSSProperties;
}

function secondaryButtonStyle(accentVar: string): React.CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: 12,
    border: `0.5px solid color-mix(in srgb, ${accentVar} 30%, var(--ls-border))`,
    background: `color-mix(in srgb, ${accentVar} 6%, var(--ls-surface))`,
    color: accentVar,
    fontFamily: "DM Sans, sans-serif",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    textAlign: "left",
  };
}
