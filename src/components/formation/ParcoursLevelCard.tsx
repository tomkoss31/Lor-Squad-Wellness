// =============================================================================
// ParcoursLevelCard — card niveau du parcours guide (2026-04-30)
//
// Affichee 3 fois sur FormationPage (zone haute "Mon parcours guide").
// Etats visuels :
//   - en cours : accent vif + barre progression + CTA "Reprendre →"
//   - verrouille : grise + cadenas + texte "Termine N{x}"
//   - termine : checkmark + accent + CTA "Refaire"
//   - pas commence : accent atténué + CTA "Commencer →"
//
// Theme-aware via var(--ls-{accent}). Chiffre du niveau (1, 2, 3) en
// gros derriere l icone. Hover lift subtil.
// =============================================================================

import { Link } from "react-router-dom";
import type {
  FormationLevel,
  FormationLevelAccent,
} from "../../data/formation";
import type { FormationLevelStats } from "../../hooks/useFormationProgress";

interface Props {
  level: FormationLevel;
  stats: FormationLevelStats;
}

const ACCENT_TOKEN: Record<FormationLevelAccent, string> = {
  gold: "var(--ls-gold)",
  teal: "var(--ls-teal)",
  purple: "var(--ls-purple)",
};

export function ParcoursLevelCard({ level, stats }: Props) {
  const accentVar = ACCENT_TOKEN[level.accent];
  const { isLocked, isComplete, hasStarted, percent, totalCount } = stats;

  const cta = (() => {
    if (isLocked) return "Verrouillé";
    if (isComplete) return "Refaire →";
    if (hasStarted) return "Reprendre →";
    return "Commencer →";
  })();

  const stateLabel = (() => {
    if (isLocked) {
      const prereqLevel = level.unlockedBy === "demarrer" ? "N1" : "N2";
      return `🔒 Termine ${prereqLevel} d'abord`;
    }
    if (isComplete) return "✓ Terminé";
    if (hasStarted) return "En cours";
    if (totalCount === 0) return "Bientôt disponible";
    return "À démarrer";
  })();

  const target = isLocked ? "#" : `/formation/parcours/${level.slug}`;
  const opacity = isLocked ? 0.55 : 1;

  return (
    <Link
      to={target}
      onClick={(e) => {
        if (isLocked) e.preventDefault();
      }}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        padding: 18,
        background:
          isLocked
            ? "var(--ls-surface)"
            : `linear-gradient(135deg, color-mix(in srgb, ${accentVar} 8%, var(--ls-surface)) 0%, var(--ls-surface) 100%)`,
        border: isLocked
          ? "0.5px dashed var(--ls-border)"
          : `0.5px solid color-mix(in srgb, ${accentVar} 28%, var(--ls-border))`,
        borderTop: isLocked
          ? "0.5px dashed var(--ls-border)"
          : `3px solid ${accentVar}`,
        borderRadius: 16,
        textDecoration: "none",
        color: "var(--ls-text)",
        cursor: isLocked ? "not-allowed" : "pointer",
        transition: "transform 0.18s ease, box-shadow 0.18s ease",
        opacity,
        overflow: "hidden",
        minHeight: 220,
        fontFamily: "DM Sans, sans-serif",
      }}
      onMouseEnter={(e) => {
        if (isLocked) return;
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = `0 8px 22px -8px color-mix(in srgb, ${accentVar} 40%, transparent)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Big number watermark */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 10,
          right: 14,
          fontFamily: "Syne, serif",
          fontSize: 72,
          fontWeight: 900,
          color: `color-mix(in srgb, ${accentVar} 12%, transparent)`,
          lineHeight: 1,
          pointerEvents: "none",
          letterSpacing: "-0.04em",
        }}
      >
        {level.order}
      </span>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, position: "relative" }}>
        <span style={{ fontSize: 34, lineHeight: 1 }} aria-hidden="true">
          {level.icon}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontWeight: 700,
              color: accentVar,
              marginBottom: 2,
            }}
          >
            Niveau {level.order}
          </div>
          <h3
            style={{
              fontFamily: "Syne, serif",
              fontSize: 19,
              fontWeight: 800,
              color: "var(--ls-text)",
              margin: 0,
              letterSpacing: "-0.01em",
              lineHeight: 1.18,
            }}
          >
            {level.title}
          </h3>
          <div
            style={{
              fontSize: 12,
              color: accentVar,
              fontWeight: 600,
              marginTop: 2,
            }}
          >
            {level.subtitle}
          </div>
        </div>
      </div>

      {/* Description */}
      <p
        style={{
          fontSize: 12.5,
          color: "var(--ls-text-muted)",
          lineHeight: 1.55,
          margin: "0 0 16px",
          position: "relative",
        }}
      >
        {level.description}
      </p>

      {/* Spacer pour push le bas en bas */}
      <div style={{ flex: 1 }} />

      {/* Progression */}
      <div style={{ position: "relative", marginBottom: 12 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 11,
            color: "var(--ls-text-muted)",
            marginBottom: 6,
          }}
        >
          <span>{stateLabel}</span>
          {totalCount > 0 ? (
            <span style={{ fontWeight: 700, color: accentVar }}>
              {percent}%
            </span>
          ) : null}
        </div>
        <div
          style={{
            height: 4,
            borderRadius: 2,
            background: "var(--ls-surface2)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: totalCount > 0 ? `${percent}%` : "0%",
              height: "100%",
              background: accentVar,
              transition: "width 0.4s ease",
            }}
          />
        </div>
      </div>

      {/* CTA */}
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: isLocked ? "var(--ls-text-muted)" : accentVar,
          fontFamily: "Syne, serif",
          letterSpacing: "0.01em",
        }}
      >
        {cta}
      </div>

      {/* Quick win #5 (2026-11-04) : CTA "Obtenir mon certificat" si niveau
          100% complete. Sub-link en bas de card, ne pollue pas le CTA principal. */}
      {isComplete ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = `/formation/certificat?level=${level.id}`;
          }}
          style={{
            marginTop: 10,
            padding: "8px 12px",
            borderRadius: 10,
            background: `color-mix(in srgb, ${accentVar} 14%, var(--ls-surface))`,
            border: `0.5px solid color-mix(in srgb, ${accentVar} 35%, transparent)`,
            color: accentVar,
            fontFamily: "DM Sans, sans-serif",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            transition: "all 200ms ease",
          }}
          onMouseEnter={(ev) => {
            ev.currentTarget.style.background = `color-mix(in srgb, ${accentVar} 22%, var(--ls-surface))`;
          }}
          onMouseLeave={(ev) => {
            ev.currentTarget.style.background = `color-mix(in srgb, ${accentVar} 14%, var(--ls-surface))`;
          }}
        >
          🏆 Obtenir mon certificat
        </button>
      ) : null}
    </Link>
  );
}
