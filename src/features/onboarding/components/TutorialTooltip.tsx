// Chantier Tuto interactif client (2026-04-24).
// Tooltip réutilisable pour les étapes spotlight. Positionné manuellement
// par l'orchestrateur selon le rect de la cible (getBoundingClientRect).
// Gère aussi le mode "center" (modale centrée pour Welcome/Final).

import type { ReactNode } from "react";
import { TutorialProgress } from "./TutorialProgress";

export interface TutorialTooltipProps {
  stepIndex: number; // 0-based
  totalSteps: number;
  title: string;
  children?: ReactNode;
  placement?: "center" | "top" | "bottom";
  targetRect?: DOMRect | null;
  onNext?: () => void;
  onPrev?: () => void;
  onSkip?: () => void;
  onClose?: () => void;
  nextLabel?: string;
  isLast?: boolean;
}

export function TutorialTooltip({
  stepIndex,
  totalSteps,
  title,
  children,
  placement = "bottom",
  targetRect,
  onNext,
  onPrev,
  onSkip,
  onClose,
  nextLabel,
  isLast = false,
}: TutorialTooltipProps) {
  const positionedStyle = computePosition(placement, targetRect);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: "fixed",
        zIndex: 10001,
        maxWidth: placement === "center" ? 440 : 400,
        width: placement === "center" ? "calc(100% - 32px)" : "min(420px, calc(100% - 24px))",
        background: "#FFFFFF",
        borderRadius: 14,
        padding: 18,
        boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
        color: "#111827",
        fontFamily: "DM Sans, sans-serif",
        ...positionedStyle,
      }}
    >
      {/* Header : pastille step + skip */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
        <span
          style={{
            padding: "3px 8px",
            borderRadius: 6,
            background: "rgba(186,117,23,0.12)",
            color: "#BA7517",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.05em",
          }}
        >
          {stepIndex + 1}/{totalSteps}
        </span>
        {onSkip ? (
          <button
            type="button"
            onClick={onSkip}
            style={{
              marginLeft: "auto",
              padding: "4px 8px",
              border: "none",
              background: "transparent",
              fontSize: 11,
              color: "#9CA3AF",
              cursor: "pointer",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Passer
          </button>
        ) : null}
        {onClose && !onSkip ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{
              marginLeft: "auto",
              width: 24,
              height: 24,
              border: "none",
              background: "transparent",
              fontSize: 16,
              color: "#9CA3AF",
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        ) : null}
      </div>

      {/* Titre */}
      <p
        style={{
          fontFamily: "Syne, sans-serif",
          fontSize: 17,
          fontWeight: 500,
          margin: 0,
          marginBottom: 8,
          color: "#111827",
        }}
      >
        {title}
      </p>

      {/* Body */}
      <div style={{ fontSize: 13, lineHeight: 1.55, color: "#374151" }}>
        {children}
      </div>

      {/* Footer : progress + actions */}
      <div
        style={{
          marginTop: 16,
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <TutorialProgress current={stepIndex} total={totalSteps} />
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {onPrev ? (
            <button
              type="button"
              onClick={onPrev}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid rgba(0,0,0,0.12)",
                background: "#FFFFFF",
                color: "#6B7280",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              Précédent
            </button>
          ) : null}
          {onNext ? (
            <button
              type="button"
              onClick={onNext}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
                color: "#FFFFFF",
                border: "none",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "DM Sans, sans-serif",
                letterSpacing: 0.2,
              }}
            >
              {nextLabel ?? (isLast ? "Terminer le tuto 🎉" : "Suivant →")}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function computePosition(
  placement: "center" | "top" | "bottom",
  targetRect: DOMRect | null | undefined,
): React.CSSProperties {
  if (placement === "center" || !targetRect) {
    return {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    };
  }
  const margin = 12;
  const viewportW = typeof window !== "undefined" ? window.innerWidth : 800;
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 600;
  const preferBottom = targetRect.bottom + 320 < viewportH;
  const top = preferBottom
    ? Math.min(targetRect.bottom + margin, viewportH - 280)
    : Math.max(margin, targetRect.top - 280);
  const centerX = targetRect.left + targetRect.width / 2;
  const left = Math.max(
    margin,
    Math.min(viewportW - 420 - margin, centerX - 210),
  );
  return {
    top,
    left,
  };
}
