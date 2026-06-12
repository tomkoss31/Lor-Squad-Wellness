// =============================================================================
// KebabMenu — menu déroulant « ⋮ » réutilisable (chantier simplification UI
// 2026-06-12). Désengorge les headers chargés : on garde 3-4 actions
// quotidiennes visibles et on replie les actions rares ici.
//
// Générique : prend une liste d'items { icon, label, sublabel?, onClick,
// disabled?, danger? }. Ferme au clic dehors + Échap. Tokens var(--ls-*),
// donc theme-aware (clair/sombre).
// =============================================================================

import { useEffect, useRef, useState } from "react";

export interface KebabItem {
  icon?: string;
  label: string;
  sublabel?: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

interface Props {
  items: KebabItem[];
  /** Libellé d'en-tête du menu (optionnel). */
  heading?: string;
  /** Aligne le menu à droite du bouton (défaut) ou à gauche. */
  align?: "right" | "left";
  ariaLabel?: string;
}

export function KebabMenu({ items, heading = "Plus d'actions", align = "right", ariaLabel = "Plus d'actions" }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const visible = items.filter((it) => !it.disabled || it.sublabel !== "__hidden__");
  if (visible.length === 0) return null;

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-[40px] items-center justify-center rounded-[12px] border border-[var(--ls-border2)] bg-[var(--ls-surface2)] px-3 py-2 text-white transition hover:bg-white/[0.08]"
        style={{ fontSize: 18, fontWeight: 800, lineHeight: 1, width: 44 }}
      >
        ⋮
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: 46,
            [align]: 0,
            width: 248,
            background: "var(--ls-surface2)",
            border: "1px solid var(--ls-border2)",
            borderRadius: 13,
            padding: 6,
            boxShadow: "0 18px 50px rgba(0,0,0,0.5)",
            zIndex: 50,
          } as React.CSSProperties}
        >
          {heading ? (
            <div
              style={{
                fontSize: 9.5,
                letterSpacing: 1,
                textTransform: "uppercase",
                color: "var(--ls-text-muted)",
                padding: "6px 11px 3px",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              {heading}
            </div>
          ) : null}
          {items.map((it, i) => (
            <button
              key={i}
              type="button"
              role="menuitem"
              disabled={it.disabled}
              onClick={() => {
                setOpen(false);
                it.onClick();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                textAlign: "left",
                padding: "9px 11px",
                borderRadius: 9,
                border: "none",
                background: "transparent",
                color: it.danger ? "var(--ls-coral)" : "var(--ls-text)",
                fontSize: 13,
                fontFamily: "DM Sans, sans-serif",
                cursor: it.disabled ? "not-allowed" : "pointer",
                opacity: it.disabled ? 0.45 : 1,
              }}
              onMouseEnter={(e) => {
                if (!it.disabled) e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              {it.icon ? <span style={{ width: 18, textAlign: "center" }} aria-hidden>{it.icon}</span> : null}
              <span style={{ display: "block" }}>
                {it.label}
                {it.sublabel ? (
                  <span style={{ display: "block", fontSize: 10.5, color: "var(--ls-text-muted)" }}>{it.sublabel}</span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
