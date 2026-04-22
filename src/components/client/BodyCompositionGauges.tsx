// Chantier Polish Vue complète + refonte bilan (2026-04-24).
// 3 jauges combinées (masse grasse / musculaire / hydratation) avec
// gradient de zones, 3 marqueurs (départ / actuel / cible) et message
// contextuel selon progression. Remplace BodyScanSnapshotCard sur Vue
// complète.

import {
  getMetricRange,
  getZone,
  getPercentOnBar,
  formatMetricDelta,
  type BiologicalSex,
  type MetricKind,
} from "../../lib/bodyCompositionRanges";

interface GaugeProps {
  metric: MetricKind;
  sex: BiologicalSex;
  label: string;
  current: number | null;
  initial: number | null;
  target?: number | null;
  unit?: string;
}

const TONE_COLORS: Record<"positive" | "neutral" | "warning", string> = {
  positive: "#1D9E75",
  neutral: "#6B6F7A",
  warning: "#D4537E",
};

function formatValue(v: number | null, unit: string): string {
  if (v == null) return "—";
  return `${v.toFixed(1)}${unit}`;
}

function Gauge({ metric, sex, label, current, initial, target, unit = "%" }: GaugeProps) {
  const range = getMetricRange(metric, sex);
  const currentZone = current != null ? getZone(current, metric, sex) : null;

  const gradientStops = range.zones
    .map((z) => {
      const fromPct = Math.max(
        0,
        Math.min(100, ((z.from - range.min) / (range.max - range.min)) * 100),
      );
      const toPct = Math.max(
        0,
        Math.min(100, ((z.to - range.min) / (range.max - range.min)) * 100),
      );
      return `${z.color} ${fromPct.toFixed(1)}% ${toPct.toFixed(1)}%`;
    })
    .join(", ");
  const gradient = `linear-gradient(90deg, ${gradientStops})`;

  const currentPct = current != null ? getPercentOnBar(current, metric, sex) : null;
  const initialPct = initial != null ? getPercentOnBar(initial, metric, sex) : null;
  const targetPct = target != null ? getPercentOnBar(target, metric, sex) : null;

  const delta = formatMetricDelta(current, initial, metric);

  return (
    <div
      style={{
        background: "var(--ls-surface)",
        border: "1px solid var(--ls-border)",
        borderRadius: 16,
        padding: "16px 18px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            fontFamily: "Syne, sans-serif",
            fontSize: 14,
            fontWeight: 700,
            color: "var(--ls-text)",
          }}
        >
          {label}
        </div>
        {currentZone ? (
          <div
            style={{
              padding: "3px 10px",
              borderRadius: 999,
              background: `${currentZone.color}22`,
              color: currentZone.color,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.02em",
            }}
          >
            {currentZone.label}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          fontSize: 13,
          color: "var(--ls-text-muted)",
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <span>{formatValue(initial, unit)}</span>
        <span style={{ opacity: 0.6 }}>→</span>
        <span
          style={{
            fontWeight: 700,
            color: "var(--ls-text)",
            fontSize: 16,
          }}
        >
          {formatValue(current, unit)}
        </span>
        {target != null ? (
          <>
            <span style={{ opacity: 0.6 }}>→</span>
            <span>cible {formatValue(target, unit)}</span>
          </>
        ) : null}
      </div>

      {/* Barre gradient + marqueurs + graduations chiffrées (V3) */}
      <div style={{ position: "relative", height: 22, marginTop: 4 }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 2,
            height: 18,
            borderRadius: 999,
            background: gradient,
          }}
        />
        {initialPct != null ? (
          <div
            aria-label="départ"
            style={{
              position: "absolute",
              left: `calc(${initialPct}% - 5px)`,
              top: 6,
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.85)",
              border: "1px solid rgba(0,0,0,0.2)",
            }}
          />
        ) : null}
        {targetPct != null ? (
          <div
            aria-label="cible"
            style={{
              position: "absolute",
              left: `calc(${targetPct}% - 1px)`,
              top: 0,
              width: 2,
              height: 22,
              background: "#FFFFFF",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.4)",
            }}
          />
        ) : null}
        {currentPct != null ? (
          <div
            aria-label="actuel"
            style={{
              position: "absolute",
              left: `calc(${currentPct}% - 11px)`,
              top: 0,
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "#FFFFFF",
              border: `3px solid ${currentZone?.color ?? "#1D9E75"}`,
              boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            }}
          />
        ) : null}
      </div>

      {/* Graduations chiffrées (V3) : une étiquette à chaque frontière de zone */}
      <div
        aria-hidden="true"
        style={{
          position: "relative",
          height: 14,
          marginBottom: 8,
          marginTop: 2,
        }}
      >
        {(() => {
          // Bornes : min + fin de chaque zone (dédupliquées, clampées 0-100)
          const borders = Array.from(
            new Set([
              range.min,
              ...range.zones.map((z) => z.from),
              ...range.zones.map((z) => z.to),
            ]),
          )
            .filter((v) => v >= range.min && v <= range.max)
            .sort((a, b) => a - b);
          return borders.map((v) => {
            const pct = ((v - range.min) / (range.max - range.min)) * 100;
            return (
              <span
                key={v}
                style={{
                  position: "absolute",
                  left: `${pct}%`,
                  transform:
                    pct < 5 ? "translateX(0)" : pct > 95 ? "translateX(-100%)" : "translateX(-50%)",
                  fontSize: 10,
                  color: "var(--ls-text-hint)",
                  fontFamily: "DM Sans, sans-serif",
                  whiteSpace: "nowrap",
                  lineHeight: 1,
                  top: 2,
                }}
              >
                {Math.round(v)}%
              </span>
            );
          });
        })()}
      </div>

      <div
        style={{
          fontSize: 12,
          color: TONE_COLORS[delta.tone],
          fontWeight: 500,
        }}
      >
        {delta.label}
      </div>
    </div>
  );
}

interface Props {
  sex: BiologicalSex;
  currentBodyFat: number | null;
  initialBodyFat: number | null;
  targetBodyFat?: number | null;
  currentMuscleMass: number | null;
  initialMuscleMass: number | null;
  currentHydration: number | null;
  initialHydration: number | null;
}

export function BodyCompositionGauges({
  sex,
  currentBodyFat,
  initialBodyFat,
  targetBodyFat,
  currentMuscleMass,
  initialMuscleMass,
  currentHydration,
  initialHydration,
}: Props) {
  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        gridTemplateColumns: "1fr",
      }}
    >
      <Gauge
        metric="bodyFat"
        sex={sex}
        label="Masse grasse"
        current={currentBodyFat}
        initial={initialBodyFat}
        target={targetBodyFat ?? null}
        unit="%"
      />
      <Gauge
        metric="muscleMass"
        sex={sex}
        label="Masse musculaire"
        current={currentMuscleMass}
        initial={initialMuscleMass}
        unit="%"
      />
      <Gauge
        metric="hydration"
        sex={sex}
        label="Hydratation"
        current={currentHydration}
        initial={initialHydration}
        unit="%"
      />
    </div>
  );
}
