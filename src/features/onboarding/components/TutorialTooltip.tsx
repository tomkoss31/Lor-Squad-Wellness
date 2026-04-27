// Chantier Tuto interactif client (2026-04-24).
// Tooltip réutilisable pour les étapes spotlight. Positionné manuellement
// par l'orchestrateur selon le rect de la cible (getBoundingClientRect).
// Gère aussi le mode "center" (modale centrée pour Welcome/Final).

import { useEffect, useRef, type ReactNode } from "react";
import { TutorialProgress } from "./TutorialProgress";
import { TutorialIllustration } from "./TutorialIllustration";
import type { TutorialIllustrationKind } from "../types";

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
  /** Polish C (2026-04-28) : illustration SVG inline au-dessus du titre. */
  illustrationKey?: TutorialIllustrationKind;
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
  illustrationKey,
}: TutorialTooltipProps) {
  const positionedStyle = computePosition(placement, targetRect);

  // Direction 8 (2026-04-28) : focus management. Au mount du tooltip
  // (et donc a chaque step grace au key={step.id} cote TourRunner),
  // on focus le dialog pour que le screen reader annonce le contenu
  // et que la nav clavier soit utilisable des le step.
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    // tabIndex=-1 + focus() -> reader annonce le titre/body, sans
    // ajouter le dialog dans la tab order naturelle.
    node.focus({ preventScroll: true });
  }, []);

  return (
    <>
      {/* Polish B (2026-04-28) : keyframes inline pour fade-in entre steps
          + hover lift sur le bouton Suivant gold. */}
      <style>{`
        @keyframes ls-tooltip-fade-in {
          0% {
            opacity: 0;
            transform: ${placement === "center" ? "translate(-50%, -50%) scale(0.94)" : "translate3d(0, 6px, 0) scale(0.97)"};
          }
          100% {
            opacity: 1;
            transform: ${placement === "center" ? "translate(-50%, -50%) scale(1)" : "translate3d(0, 0, 0) scale(1)"};
          }
        }
        .ls-tutorial-next-btn {
          transition: transform 160ms ease-out, box-shadow 160ms ease-out, filter 160ms ease-out;
        }
        .ls-tutorial-next-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(186,117,23,0.35);
          filter: brightness(1.05);
        }
        .ls-tutorial-next-btn:active {
          transform: translateY(0);
          box-shadow: 0 2px 6px rgba(186,117,23,0.25);
        }
      `}</style>
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ls-tutorial-title"
      aria-describedby="ls-tutorial-body"
      tabIndex={-1}
      style={{
        position: "fixed",
        zIndex: 10001,
        maxWidth: placement === "center" ? 480 : 400,
        width: placement === "center" ? "calc(100% - 32px)" : "min(420px, calc(100% - 24px))",
        background: "#FFFFFF",
        borderRadius: 14,
        padding: 18,
        boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
        color: "#111827",
        fontFamily: "DM Sans, sans-serif",
        animation: "ls-tooltip-fade-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
        willChange: "transform, opacity",
        outline: "none",
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
            aria-label="Passer le tutoriel (raccourci Échap)"
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

      {/* Illustration SVG inline (Polish C 2026-04-28) */}
      {illustrationKey ? <TutorialIllustration kind={illustrationKey} /> : null}

      {/* Titre */}
      <p
        id="ls-tutorial-title"
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

      {/* Body — aria-live polite pour annonce screen reader a chaque step */}
      <div
        id="ls-tutorial-body"
        aria-live="polite"
        aria-atomic="true"
        style={{ fontSize: 13, lineHeight: 1.55, color: "#374151" }}
      >
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
              aria-label="Étape précédente (raccourci flèche gauche)"
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
              aria-label={isLast ? "Terminer le tutoriel" : "Étape suivante (raccourci flèche droite)"}
              className="ls-tutorial-next-btn"
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
                boxShadow: "0 2px 6px rgba(186,117,23,0.25)",
              }}
            >
              {nextLabel ?? (isLast ? "Terminer le tuto 🎉" : "Suivant →")}
            </button>
          ) : null}
        </div>
      </div>
    </div>
    </>
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
