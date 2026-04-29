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
  /**
   * Tier B #8 (2026-04-28) : chips "Voir aussi" sous le body. Click
   * → onCrossRef(sectionId, stepId).
   */
  crossRefs?: Array<{ label: string; sectionId: string; stepId?: string }>;
  onCrossRef?: (sectionId: string, stepId?: string) => void;
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
  crossRefs,
  onCrossRef,
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
        // Constraint vertical (V3.4 — 2026-04-29) : ne deborde plus du viewport
        // sur les longs contenus. Scroll interne au popup si necessaire.
        maxHeight: "calc(100vh - 24px)",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        // Theme-aware (V3.4 — 2026-04-29) : avant en hardcoded #FFFFFF + #111827
        background: "var(--ls-surface)",
        color: "var(--ls-text)",
        border: "0.5px solid var(--ls-border)",
        borderRadius: 14,
        padding: 18,
        boxShadow: "0 12px 40px rgba(0,0,0,0.40), 0 0 0 1px rgba(239,159,39,0.10)",
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
            background: "color-mix(in srgb, var(--ls-gold) 14%, transparent)",
            color: "var(--ls-gold)",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.05em",
            border: "0.5px solid color-mix(in srgb, var(--ls-gold) 30%, transparent)",
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
              color: "var(--ls-text-muted)",
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
              color: "var(--ls-text-muted)",
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
          color: "var(--ls-text)",
        }}
      >
        {title}
      </p>

      {/* Body — aria-live polite pour annonce screen reader a chaque step */}
      <div
        id="ls-tutorial-body"
        aria-live="polite"
        aria-atomic="true"
        style={{ fontSize: 13, lineHeight: 1.55, color: "var(--ls-text-muted)" }}
      >
        {children}
      </div>

      {/* Tier B #8 (2026-04-28) : chips "Voir aussi" pour cross-refs. */}
      {crossRefs && crossRefs.length > 0 ? (
        <div
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: "0.5px dashed #E5DFCF",
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--ls-text-muted)",
              fontWeight: 600,
              marginRight: 4,
            }}
          >
            🔗 Voir aussi
          </span>
          {crossRefs.map((ref, idx) => (
            <button
              key={`${ref.sectionId}-${ref.stepId ?? idx}`}
              type="button"
              onClick={() => onCrossRef?.(ref.sectionId, ref.stepId)}
              style={{
                padding: "4px 10px",
                background: "color-mix(in srgb, var(--ls-gold) 10%, transparent)",
                border: "0.5px solid color-mix(in srgb, var(--ls-gold) 40%, transparent)",
                borderRadius: 999,
                fontSize: 11,
                fontFamily: "DM Sans, sans-serif",
                fontWeight: 600,
                color: "var(--ls-gold)",
                cursor: "pointer",
                transition: "background 120ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "color-mix(in srgb, var(--ls-gold) 20%, transparent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "color-mix(in srgb, var(--ls-gold) 10%, transparent)";
              }}
            >
              {ref.label} →
            </button>
          ))}
        </div>
      ) : null}

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
                border: "0.5px solid var(--ls-border)",
                background: "var(--ls-surface2)",
                color: "var(--ls-text-muted)",
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

  // Estimation popup height (vraie taille calculee au render via maxHeight).
  // On utilise 360 comme valeur safe par defaut. Le popup a maxHeight: 100vh - 24px
  // donc si le contenu deborde il scrollera dedans, mais on essaye de positionner
  // au mieux pour eviter d'avoir a scroller.
  const popupH = 360;

  const spaceBelow = viewportH - targetRect.bottom - margin;
  const spaceAbove = targetRect.top - margin;

  // Place le popup la ou il y a le plus de place (V3.4 — 2026-04-29).
  // Avant : prefer bottom systematique avec calcul fixe → debordait sur les
  // pages ou le target est en milieu/bas (PV gauge sur Co-pilote, etc).
  let top: number;
  if (placement === "top") {
    // Force au-dessus si possible
    top = Math.max(margin, targetRect.top - popupH - margin);
  } else if (placement === "bottom" && spaceBelow >= popupH) {
    top = targetRect.bottom + margin;
  } else if (spaceAbove >= popupH) {
    // Pas assez de place en dessous → bascule au-dessus
    top = Math.max(margin, targetRect.top - popupH - margin);
  } else if (spaceBelow >= spaceAbove) {
    // Force en dessous mais clamp pour que le bottom ne sorte pas
    top = Math.min(targetRect.bottom + margin, viewportH - popupH - margin);
    top = Math.max(margin, top);
  } else {
    // Force au-dessus avec clamp
    top = Math.max(margin, targetRect.top - popupH - margin);
  }

  // Calcul X (V3.5 — 2026-04-29) : si la cible est sur un bord (sidebar
  // gauche, panier sticky droit, etc), centrer le popup sur la cible le
  // ferait chevaucher la cible elle-meme. On detecte ce cas et on place
  // le popup a cote (a droite si cible a gauche, a gauche si cible a droite).
  const popupW = 420;
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const isLeftEdge = targetRect.right < viewportW * 0.35;  // cible dans 1/3 gauche
  const isRightEdge = targetRect.left > viewportW * 0.65;  // cible dans 1/3 droite

  let left: number;
  if (isLeftEdge && targetRect.right + margin + popupW <= viewportW - margin) {
    // Place a droite de la cible (pas en dessous)
    left = targetRect.right + margin;
  } else if (isRightEdge && targetRect.left - margin - popupW >= margin) {
    // Place a gauche de la cible
    left = targetRect.left - margin - popupW;
  } else {
    // Cas normal : centre sur la cible (avec clamp dans le viewport)
    left = Math.max(
      margin,
      Math.min(viewportW - popupW - margin, targetCenterX - popupW / 2),
    );
  }

  // Si on a place le popup a cote (gauche/droite), on aligne verticalement
  // avec le centre de la cible plutot que dessus/dessous.
  if (isLeftEdge || isRightEdge) {
    const targetCenterY = targetRect.top + targetRect.height / 2;
    top = Math.max(margin, Math.min(viewportH - popupH - margin, targetCenterY - popupH / 2));
  }

  return {
    top,
    left,
  };
}
