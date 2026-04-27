// Chantier Refactor onboarding additif (2026-04-26).
// Composant SpotlightOverlay extrait de OnboardingTutorial.tsx pour
// permettre la reutilisation par TourRunner (Academy) sans dupliquer
// la logique des 4 bandes + ring gold.
//
// Comportement strictement identique a la version inline d origine :
//   - targetRect null  → overlay plein ecran sans decoupe
//   - targetRect fourni → 4 bandes fixes autour + ring gold #EF9F27

import type { CSSProperties } from "react";

export interface SpotlightOverlayProps {
  targetRect: DOMRect | null;
  /** z-index du dim. Le ring gold est dessine au meme niveau. Defaut 10000. */
  zIndex?: number;
  /**
   * Si fourni, les 4 bandes dim deviennent cliquables et appellent
   * onDismiss. Le ring gold + le trou autour du target restent
   * non-interactifs (le user peut cliquer SUR le target qui execute
   * son action native). Ajoute au Patch 2 (2026-04-26) pour permettre
   * "click bandes = dismiss" sans bloquer le click sur le target.
   */
  onDismiss?: () => void;
}

export function SpotlightOverlay({
  targetRect,
  zIndex = 10000,
  onDismiss,
}: SpotlightOverlayProps) {
  // Si pas de rect (stage modale), overlay plein. Sinon, decoupe via
  // 4 rectangles autour de la cible pour laisser passer le spotlight.
  if (!targetRect) {
    return (
      <div
        role={onDismiss ? "button" : "presentation"}
        aria-label={onDismiss ? "Fermer" : undefined}
        tabIndex={onDismiss ? 0 : undefined}
        onClick={onDismiss}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(10, 15, 25, 0.6)",
          backdropFilter: "blur(2px)",
          zIndex,
          cursor: onDismiss ? "pointer" : "default",
        }}
      />
    );
  }
  const pad = 8;
  return (
    <>
      {/* 4 bandes autour du rect */}
      <OverlayBand
        zIndex={zIndex}
        onDismiss={onDismiss}
        style={{ top: 0, left: 0, right: 0, height: Math.max(0, targetRect.top - pad) }}
      />
      <OverlayBand
        zIndex={zIndex}
        onDismiss={onDismiss}
        style={{
          top: Math.max(0, targetRect.top - pad),
          left: 0,
          width: Math.max(0, targetRect.left - pad),
          height: targetRect.height + pad * 2,
        }}
      />
      <OverlayBand
        zIndex={zIndex}
        onDismiss={onDismiss}
        style={{
          top: Math.max(0, targetRect.top - pad),
          left: Math.min(window.innerWidth, targetRect.right + pad),
          right: 0,
          height: targetRect.height + pad * 2,
        }}
      />
      <OverlayBand
        zIndex={zIndex}
        onDismiss={onDismiss}
        style={{
          top: Math.min(window.innerHeight, targetRect.bottom + pad),
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
      {/* Ring gold autour du target — animation breathe (Polish B 2026-04-28) */}
      <style>{`
        @keyframes ls-spotlight-breathe {
          0%, 100% {
            box-shadow:
              0 0 0 2px rgba(239,159,39,0.30),
              0 0 18px 0 rgba(239,159,39,0.15);
          }
          50% {
            box-shadow:
              0 0 0 7px rgba(239,159,39,0.10),
              0 0 28px 4px rgba(239,159,39,0.40);
          }
        }
      `}</style>
      <div
        style={{
          position: "fixed",
          top: targetRect.top - pad,
          left: targetRect.left - pad,
          width: targetRect.width + pad * 2,
          height: targetRect.height + pad * 2,
          border: "2px solid #EF9F27",
          borderRadius: 12,
          zIndex,
          pointerEvents: "none",
          animation: "ls-spotlight-breathe 2.4s ease-in-out infinite",
        }}
      />
    </>
  );
}

function OverlayBand({
  style,
  zIndex,
  onDismiss,
}: {
  style: CSSProperties;
  zIndex: number;
  onDismiss?: () => void;
}) {
  return (
    <div
      role={onDismiss ? "button" : "presentation"}
      aria-label={onDismiss ? "Fermer le tutoriel" : undefined}
      tabIndex={onDismiss ? 0 : undefined}
      aria-hidden={!onDismiss}
      onClick={onDismiss}
      style={{
        position: "fixed",
        background: "rgba(10, 15, 25, 0.6)",
        backdropFilter: "blur(2px)",
        zIndex,
        cursor: onDismiss ? "pointer" : "default",
        ...style,
      }}
    />
  );
}
