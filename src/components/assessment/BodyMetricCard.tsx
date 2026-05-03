// =============================================================================
// BodyMetricCard — carte saisie body scan premium (2026-11-04)
//
// Etape 3/6 du chantier visuel bilan profond.
//
// Wrap autour des inputs body-scan avec :
//   - Header icon + label (existant)
//   - Input central
//   - Bar de progression subtile en bas qui se remplit selon la valeur
//     vs la plage typique du metric (ex: bodyFat homme = 8-25%)
//   - Color-coded selon zone (under / typical / over) avec dot indicator
//
// Theme-aware : tous les couleurs via var(--ls-*) + color-mix.
// =============================================================================

import { type ReactNode } from "react";

export interface MetricRange {
  /** Valeur min "saine" affichee comme limite gauche du gradient. */
  healthyMin: number;
  /** Valeur max "saine" affichee comme limite droite du gradient. */
  healthyMax: number;
  /** Valeur max de l echelle visuelle (au-dela = barre 100%). */
  scaleMax: number;
}

export interface BodyMetricCardProps {
  label: string;
  icon: ReactNode;
  /** Couleur d accent (var(--ls-gold), --ls-teal, etc.) */
  accentColor: string;
  value: number;
  /** Plage indicative pour la barre de progression. Si absent, pas de barre. */
  range?: MetricRange;
  /** Suffixe affiche apres la valeur (ex: "%", "kg"). */
  unit?: string;
  /** Le composant input/saisie (DecimalInput typiquement). */
  children: ReactNode;
}

export function BodyMetricCard({
  label,
  icon,
  accentColor,
  value,
  range,
  unit,
  children,
}: BodyMetricCardProps) {
  const hasValue = value > 0;
  const fillPercent = range && hasValue
    ? Math.min(100, Math.max(0, (value / range.scaleMax) * 100))
    : 0;

  // Zone status : sous / dans / au-dessus de la plage saine
  const zoneStatus: "under" | "in" | "over" | "neutral" = !range || !hasValue
    ? "neutral"
    : value < range.healthyMin
      ? "under"
      : value > range.healthyMax
        ? "over"
        : "in";

  const zoneColor =
    zoneStatus === "in"
      ? "var(--ls-teal)"
      : zoneStatus === "neutral"
        ? "var(--ls-text-hint)"
        : accentColor;

  return (
    <div
      style={{
        background: "var(--ls-surface)",
        border: "1px solid var(--ls-border)",
        borderTop: `2px solid ${accentColor}`,
        borderRadius: 14,
        padding: "14px 16px 12px",
        position: "relative",
        overflow: "hidden",
        transition: "border-color 200ms ease, box-shadow 200ms ease",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 16 }} aria-hidden="true">
          {icon}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--ls-text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            flex: 1,
          }}
        >
          {label}
        </span>
        {/* Status dot zone */}
        {hasValue && range ? (
          <span
            aria-hidden="true"
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: zoneColor,
              boxShadow: `0 0 8px ${zoneColor}`,
              transition: "background 280ms ease, box-shadow 280ms ease",
            }}
          />
        ) : null}
      </div>

      {/* Input zone */}
      <div className="body-scan-big-input">{children}</div>

      {/* Unit hint */}
      {unit && hasValue ? (
        <div
          style={{
            position: "absolute",
            top: 14,
            right: 16,
            fontSize: 10,
            color: "var(--ls-text-hint)",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          {unit}
        </div>
      ) : null}

      {/* Progress bar relative to range */}
      {range ? (
        <div
          style={{
            marginTop: 12,
            position: "relative",
            height: 4,
            background: "var(--ls-surface2)",
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          {/* Healthy zone (background) */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 0,
              left: `${(range.healthyMin / range.scaleMax) * 100}%`,
              right: `${100 - (range.healthyMax / range.scaleMax) * 100}%`,
              height: "100%",
              background: "color-mix(in srgb, var(--ls-teal) 16%, transparent)",
            }}
          />
          {/* Active fill */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: `${fillPercent}%`,
              height: "100%",
              background: zoneColor,
              borderRadius: 999,
              transition: "width 480ms cubic-bezier(0.34, 1.56, 0.64, 1), background 280ms ease",
              boxShadow: hasValue ? `0 0 6px ${zoneColor}` : "none",
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
