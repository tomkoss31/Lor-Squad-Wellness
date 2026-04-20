import type { ProgramChoice } from "../../data/programs";
import { ProgramVisual } from "./ProgramVisual";

interface Props {
  program: ProgramChoice;
  active: boolean;
  onSelect: () => void;
}

/**
 * Chantier refonte étape 11 (2026-04-20) — card programme dans le tunnel
 * de vente. Visuel SVG en haut, titre, prix, contenu court, badge
 * optionnel. Hover → border gold, active → border 2px gold.
 */
export function ProgramChoiceCard({ program, active, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        width: "100%",
        padding: 12,
        borderRadius: 14,
        border: active ? "2px solid var(--ls-gold)" : "1.5px solid var(--ls-border)",
        background: active ? "color-mix(in srgb, var(--ls-gold) 5%, var(--ls-surface))" : "var(--ls-surface)",
        cursor: "pointer",
        fontFamily: "'DM Sans', sans-serif",
        textAlign: "left",
        transition: "border-color 150ms, background 150ms, transform 150ms",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.borderColor = "var(--ls-gold)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.borderColor = "var(--ls-border)";
      }}
    >
      {program.badge && (
        <span
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            padding: "3px 8px",
            borderRadius: 999,
            background: "var(--ls-gold)",
            color: "var(--ls-gold-contrast, #0B0D11)",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            fontFamily: "'DM Sans', sans-serif",
            zIndex: 2,
          }}
        >
          {program.badge}
        </span>
      )}
      {/* Visuel SVG */}
      <div style={{ marginBottom: 10 }}>
        <ProgramVisual program={program.id} />
      </div>
      {/* Titre + prix */}
      <div style={{ marginBottom: 4 }}>
        <div
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: 15,
            color: "var(--ls-text)",
            lineHeight: 1.2,
          }}
        >
          {program.title}
        </div>
      </div>
      <div
        style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: 20,
          color: "var(--ls-gold)",
          marginBottom: 6,
        }}
      >
        {program.price}€
      </div>
      <div
        style={{
          fontSize: 11,
          color: "var(--ls-text-muted)",
          lineHeight: 1.5,
        }}
      >
        {program.shortContent}
      </div>
      {active && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            width: 22,
            height: 22,
            borderRadius: 999,
            background: "var(--ls-gold)",
            color: "var(--ls-gold-contrast, #0B0D11)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            zIndex: 2,
          }}
        >
          ✓
        </div>
      )}
    </button>
  );
}
