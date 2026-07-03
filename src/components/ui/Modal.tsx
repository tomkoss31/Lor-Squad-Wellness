// =============================================================================
// Modal — conteneur de modale partagé (chantier design system 2026-07-03).
//
// Remplace les 33 backdrops de modale réinventés à la main (blur 4→8px, opacité
// 0.55→0.8, z-index 1000→10000, animations divergentes). Un seul standard :
//   backdrop rgba(0,0,0,0.6) + blur(6px), z-index 10000, fade + pop.
//
// Ferme sur ESC + clic backdrop. Portal-free (rendu in-flow avec position fixed,
// safe car c'est un overlay). 100 % tokens var(--ls-*).
// =============================================================================

import { useEffect } from "react";
import type { CSSProperties, ReactNode } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Titre optionnel (rendu en tête avec bouton ✕). */
  title?: ReactNode;
  /** Largeur max de la carte (défaut 560). */
  maxWidth?: number;
  /** "center" (défaut) ou "sheet" (colle en bas, mobile-friendly). */
  variant?: "center" | "sheet";
  /** Cacher le bouton ✕ (si le contenu gère sa propre fermeture). */
  hideClose?: boolean;
}

export function Modal({ open, onClose, children, title, maxWidth = 560, variant = "center", hideClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const sheet = variant === "sheet";
  const overlayStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 10000,
    background: "rgba(0,0,0,0.6)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    display: "flex",
    alignItems: sheet ? "flex-end" : "flex-start",
    justifyContent: "center",
    padding: sheet ? 0 : "40px 16px",
    overflowY: "auto",
    animation: "ls-modal-fade 0.18s ease-out",
  };
  const cardStyle: CSSProperties = {
    width: "100%",
    maxWidth: sheet ? "100%" : maxWidth,
    background: "var(--ls-surface2)",
    border: "1px solid var(--ls-border)",
    borderRadius: sheet ? "20px 20px 0 0" : 16,
    padding: 18,
    position: "relative",
    animation: sheet ? "ls-modal-slide 0.24s cubic-bezier(0.16,1,0.3,1)" : "ls-modal-pop 0.24s cubic-bezier(0.16,1,0.3,1)",
  };

  return (
    <div onClick={onClose} style={overlayStyle} role="presentation">
      <style>{`
        @keyframes ls-modal-fade{from{opacity:0}to{opacity:1}}
        @keyframes ls-modal-pop{from{opacity:0;transform:translateY(12px) scale(0.98)}to{opacity:1;transform:none}}
        @keyframes ls-modal-slide{from{transform:translateY(100%)}to{transform:none}}
        @media (prefers-reduced-motion: reduce){[style*="ls-modal"]{animation:none!important}}
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={cardStyle}
      >
        {title || !hideClose ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: title ? 12 : 0 }}>
            {title ? (
              <div style={{ fontFamily: "Anton, sans-serif", fontSize: 20, letterSpacing: "0.02em", textTransform: "uppercase", color: "var(--ls-text)" }}>
                {title}
              </div>
            ) : <span />}
            {!hideClose ? (
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  border: "1px solid var(--ls-border)",
                  background: "var(--ls-surface)",
                  color: "var(--ls-text-muted)",
                  cursor: "pointer",
                  fontSize: 16,
                  flex: "0 0 auto",
                }}
              >
                ✕
              </button>
            ) : null}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
