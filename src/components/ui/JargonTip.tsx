// =============================================================================
// JargonTip — petite bulle ⓘ qui explique un mot compliqué en 1 phrase.
// (refonte langage 2026-06-22, demande Thomas : « simplifier OU être éducatif »)
//
// Usage :
//   <JargonTip term="pv" />                       // texte depuis src/data/jargon.ts
//   <JargonTip label="Mon mot" tip="Explication." /> // texte custom
//
// - Clic / tap → ouvre une bulle (portal sur document.body, jamais clippée).
// - Theme-aware (var(--ls-*)), fonctionne en clair ET sombre.
// - a11y : bouton focusable, aria-label, fermeture Échap / clic dehors / scroll.
// =============================================================================

import { useEffect, useId, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import { JARGON, type JargonKey } from "../../data/jargon";

interface JargonTipProps {
  /** Clé du dictionnaire src/data/jargon.ts. */
  term?: JargonKey;
  /** Titre custom (si pas de `term`). */
  label?: string;
  /** Explication custom (si pas de `term`). */
  tip?: string;
  /** Diamètre approximatif de l'icône (px). Défaut 15. */
  size?: number;
}

const POP_WIDTH = 264;

export function JargonTip({ term, label, tip, size = 15 }: JargonTipProps) {
  const entry = term ? JARGON[term] : undefined;
  const resolvedLabel = label ?? entry?.label ?? "";
  const resolvedTip = tip ?? entry?.tip ?? "";

  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();

  const place = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.min(POP_WIDTH, window.innerWidth - 24);
    let left = r.left + r.width / 2 - width / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
    setCoords({ top: r.bottom + 8, left });
  };

  const toggle = (e: ReactMouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!open) place();
    setOpen((o) => !o);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        !popRef.current?.contains(e.target as Node) &&
        !btnRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onLeave = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onLeave, true);
    window.addEventListener("resize", onLeave);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onLeave, true);
      window.removeEventListener("resize", onLeave);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!resolvedTip) return null;

  return (
    <>
      <span
        ref={btnRef}
        role="button"
        tabIndex={0}
        aria-label={resolvedLabel ? `${resolvedLabel} — c'est quoi ?` : "C'est quoi ?"}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            if (!open) place();
            setOpen((o) => !o);
          }
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: size,
          height: size,
          minWidth: size,
          padding: 0,
          marginLeft: 5,
          borderRadius: "50%",
          border: "1px solid color-mix(in srgb, var(--ls-teal) 50%, transparent)",
          background: "color-mix(in srgb, var(--ls-teal) 14%, transparent)",
          color: "var(--ls-teal)",
          fontSize: Math.max(9, size - 5),
          fontWeight: 700,
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontStyle: "italic",
          lineHeight: 1,
          cursor: "help",
          verticalAlign: "middle",
          flexShrink: 0,
          userSelect: "none",
        }}
      >
        i
      </span>
      {open && coords
        ? createPortal(
            <div
              ref={popRef}
              role="tooltip"
              id={tooltipId}
              style={{
                position: "fixed",
                top: coords.top,
                left: coords.left,
                width: Math.min(POP_WIDTH, window.innerWidth - 24),
                zIndex: 9999,
                background: "var(--ls-surface-elevated, var(--ls-surface))",
                border: "0.5px solid color-mix(in srgb, var(--ls-teal) 30%, var(--ls-border))",
                borderRadius: 12,
                boxShadow: "0 12px 34px rgba(0,0,0,0.38)",
                padding: "12px 14px",
                fontFamily: "DM Sans, sans-serif",
                animation: "ls-jargon-pop 120ms ease-out",
              }}
            >
              {resolvedLabel ? (
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 12.5,
                    color: "var(--ls-teal)",
                    marginBottom: 5,
                    fontFamily: "Syne, sans-serif",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {resolvedLabel}
                </div>
              ) : null}
              <p
                style={{
                  margin: 0,
                  fontSize: 12.5,
                  lineHeight: 1.55,
                  color: "var(--ls-text)",
                  fontWeight: 500,
                }}
              >
                {resolvedTip}
              </p>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
