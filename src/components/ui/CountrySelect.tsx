// =============================================================================
// CountrySelect — dropdown custom React pour choisir un pays avec drapeau
// (2026-05-19 — fix limitation Windows Chrome sur <option> natifs)
// =============================================================================
//
// Pourquoi pas un <select> natif ? Sur Windows Chrome, les <option> sont
// rendues par l'OS (pas par le navigateur), donc impossible d'appliquer
// notre font-family 'Twemoji Country Flags'. Les emojis de drapeaux
// regional indicators apparaissent en "FR / BE / CH" bruts. Solution
// = custom dropdown en <div> stylisables.
//
// Comportement :
// - Click sur le trigger → ouvre la liste
// - Click sur une option → sélectionne + ferme
// - Esc / click outside → ferme
// - Sélection vide → "—" (placeholder) + value ""
// =============================================================================

import { useEffect, useRef, useState } from "react";
import { listCountries, getCountry } from "../../lib/countries";

interface Props {
  value: string; // code ISO ou "" pour vide
  onChange: (code: string) => void;
  /** Inclure une option "Aucun" en tête. Défaut true. */
  includeEmpty?: boolean;
  /** Inclure une option "🌍 Tous pays" (pour filtres). Défaut false. */
  includeAllFilter?: boolean;
  /** Label affiché quand value === "" et qu'on n'utilise pas includeAllFilter. */
  emptyLabel?: string;
  /** Style externe du trigger (pour aligner avec selectStyle de la page). */
  triggerStyle?: React.CSSProperties;
  /** Aria-label pour a11y. */
  ariaLabel?: string;
}

const FLAG_FONT =
  "'Twemoji Country Flags', 'Apple Color Emoji', 'Segoe UI Emoji', emoji";

export function CountrySelect({
  value,
  onChange,
  includeEmpty = true,
  includeAllFilter = false,
  emptyLabel = "—",
  triggerStyle,
  ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Esc + click-outside
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const selected = getCountry(value);
  const triggerLabel = (() => {
    if (selected) {
      return (
        <>
          <span style={{ fontFamily: FLAG_FONT, fontSize: 16, lineHeight: 1 }}>
            {selected.flag}
          </span>
          <span>{selected.label}</span>
        </>
      );
    }
    if (includeAllFilter && value === "all") {
      return (
        <>
          <span style={{ fontFamily: FLAG_FONT, fontSize: 16, lineHeight: 1 }}>🌍</span>
          <span>Tous pays</span>
        </>
      );
    }
    return <span style={{ color: "var(--ls-text-muted)" }}>{emptyLabel}</span>;
  })();

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", display: "inline-block", minWidth: 180 }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel ?? "Sélectionner un pays"}
        style={{
          padding: "10px 14px",
          background: "var(--ls-input-bg, var(--ls-surface))",
          border: "1px solid var(--ls-border)",
          borderRadius: 10,
          fontSize: 13,
          fontFamily: "DM Sans, sans-serif",
          color: "var(--ls-text)",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          textAlign: "left",
          ...(triggerStyle ?? {}),
        }}
      >
        <span style={{ flex: 1, display: "inline-flex", alignItems: "center", gap: 8 }}>
          {triggerLabel}
        </span>
        <span aria-hidden="true" style={{ opacity: 0.5, fontSize: 10 }}>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <ul
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 100,
            maxHeight: 280,
            overflowY: "auto",
            margin: 0,
            padding: 4,
            listStyle: "none",
            background: "var(--ls-surface)",
            border: "1px solid var(--ls-border)",
            borderRadius: 10,
            boxShadow: "0 8px 24px -8px rgba(0,0,0,0.18)",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          {includeAllFilter && (
            <CountryOption
              flag="🌍"
              label="Tous pays"
              selected={value === "all"}
              onClick={() => {
                onChange("all");
                setOpen(false);
              }}
            />
          )}
          {includeEmpty && !includeAllFilter && (
            <CountryOption
              flag=""
              label={emptyLabel}
              selected={value === ""}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            />
          )}
          {listCountries().map((c) => (
            <CountryOption
              key={c.code}
              flag={c.flag}
              label={c.label}
              selected={value === c.code}
              onClick={() => {
                onChange(c.code);
                setOpen(false);
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

interface OptionProps {
  flag: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}

function CountryOption({ flag, label, selected, onClick }: OptionProps) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        role="option"
        aria-selected={selected}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "10px 12px",
          border: "none",
          borderRadius: 8,
          background: selected
            ? "color-mix(in srgb, var(--ls-gold) 14%, transparent)"
            : "transparent",
          color: selected ? "var(--ls-gold)" : "var(--ls-text)",
          fontWeight: selected ? 600 : 500,
          fontSize: 13,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontFamily: "inherit",
        }}
        onMouseEnter={(e) => {
          if (!selected) {
            e.currentTarget.style.background = "var(--ls-surface2)";
          }
        }}
        onMouseLeave={(e) => {
          if (!selected) {
            e.currentTarget.style.background = "transparent";
          }
        }}
      >
        <span
          style={{
            fontFamily: FLAG_FONT,
            fontSize: 18,
            lineHeight: 1,
            minWidth: 22,
            display: "inline-block",
          }}
        >
          {flag || "·"}
        </span>
        <span>{label}</span>
      </button>
    </li>
  );
}
