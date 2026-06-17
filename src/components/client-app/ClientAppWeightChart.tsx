// Chantier app client — courbes multi-métriques (2026-06-16).
// Une seule courbe à la fois + sélecteur cliquable (poids, masse grasse,
// masse musculaire, hydratation, graisse viscérale…) → compact sur mobile,
// au lieu d'empiler toutes les courbes sur la page. Spec Thomas.

import { useMemo, useState } from "react";
import type { Assessment, BodyScan } from "../../lib/clientAppData";
import { formatShortDate } from "../../lib/clientAppData";

interface Props {
  assessments: Assessment[];
}

type MetricKey = keyof Pick<
  BodyScan,
  "weight" | "bodyFat" | "muscleMass" | "hydration" | "visceralFat" | "metabolicAge" | "bmr"
>;

const METRICS: Array<{
  key: MetricKey;
  label: string;
  unit: string;
  emoji: string;
  color: string;
  decimals: number;
}> = [
  { key: "weight", label: "Poids", unit: "kg", emoji: "⚖️", color: "#10B981", decimals: 1 },
  { key: "bodyFat", label: "Masse grasse", unit: "%", emoji: "🔥", color: "#EF6F4C", decimals: 1 },
  { key: "muscleMass", label: "Masse musculaire", unit: "kg", emoji: "💪", color: "#6366F1", decimals: 1 },
  { key: "hydration", label: "Hydratation", unit: "%", emoji: "💧", color: "#06B6D4", decimals: 1 },
  { key: "visceralFat", label: "Graisse viscérale", unit: "", emoji: "🫀", color: "#8B5CF6", decimals: 0 },
  { key: "metabolicAge", label: "Âge métabolique", unit: "ans", emoji: "⏳", color: "#D97706", decimals: 0 },
];

export function ClientAppWeightChart({ assessments }: Props) {
  // Métriques ayant au moins 2 points (sinon pas de courbe).
  const available = useMemo(
    () =>
      METRICS.filter(
        (m) => assessments.filter((a) => typeof a.bodyScan?.[m.key] === "number").length >= 2,
      ),
    [assessments],
  );

  const [sel, setSel] = useState<MetricKey>("weight");
  const metric = available.find((m) => m.key === sel) ?? available[0];

  if (!metric) {
    return (
      <div style={{ background: "#FFFFFF", borderRadius: "12px", padding: "16px 14px", marginTop: "12px" }}>
        <div style={{ fontSize: "13px", color: "#475569", fontWeight: 500, marginBottom: "12px" }}>
          📈 Ton évolution
        </div>
        <div style={{ fontSize: "12px", color: "#64748B", textAlign: "center", padding: "32px 16px", fontStyle: "italic" }}>
          Tu auras tes courbes dès le 2e bilan ✨
        </div>
      </div>
    );
  }

  const points = assessments
    .filter((a) => typeof a.bodyScan?.[metric.key] === "number")
    .map((a) => ({ date: a.date, value: a.bodyScan![metric.key] as number }));

  const values = points.map((p) => p.value);
  const minV = Math.floor(Math.min(...values) - 1);
  const maxV = Math.ceil(Math.max(...values) + 1);
  const range = maxV - minV || 1;

  const w = 320;
  const h = 140;
  const left = 35;
  const right = 15;
  const top = 20;
  const bottom = 20;
  const chartW = w - left - right;
  const chartH = h - top - bottom;

  const x = (i: number) => left + (i / (points.length - 1)) * chartW;
  const y = (v: number) => top + ((maxV - v) / range) * chartH;
  const polyline = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  const yTicks = [maxV, maxV - Math.round(range / 3), minV + Math.round(range / 3), minV];

  return (
    <div style={{ background: "#FFFFFF", borderRadius: "12px", padding: "16px 14px", marginTop: "12px" }}>
      {/* Sélecteur de métrique — cliquable, défilable sur mobile */}
      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          paddingBottom: 4,
          marginBottom: 14,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {available.map((m) => {
          const on = m.key === metric.key;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => setSel(m.key)}
              style={{
                flex: "0 0 auto",
                padding: "7px 12px",
                borderRadius: 999,
                border: on ? `1px solid ${m.color}` : "1px solid #E2E8F0",
                background: on ? `color-mix(in srgb, ${m.color} 12%, #FFFFFF)` : "#FFFFFF",
                color: on ? m.color : "#64748B",
                fontSize: 12,
                fontWeight: on ? 700 : 500,
                fontFamily: "Inter, system-ui, sans-serif",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {m.emoji} {m.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: "13px", color: "#475569", fontWeight: 600 }}>
          {metric.emoji} {metric.label}
          {metric.unit ? <span style={{ color: "#94A3B8", fontWeight: 400 }}> ({metric.unit})</span> : null}
        </div>
        <div style={{ fontSize: "10px", color: "#64748B" }}>{points.length} bilans</div>
      </div>

      <svg width="100%" height={h + 40} viewBox={`0 0 ${w + 20} ${h + 40}`} style={{ overflow: "visible" }}>
        <line x1={left} y1={top} x2={left} y2={top + chartH} stroke="rgba(0,0,0,0.2)" strokeWidth="0.5" />
        <line x1={left} y1={top + chartH} x2={left + chartW} y2={top + chartH} stroke="rgba(0,0,0,0.2)" strokeWidth="0.5" />

        {yTicks.map((tick, idx) => (
          <g key={idx}>
            <line x1={left} y1={y(tick)} x2={left + chartW} y2={y(tick)} stroke="rgba(15,23,42,0.05)" strokeWidth="0.5" strokeDasharray="2,2" />
            <text x={left - 5} y={y(tick) + 3} textAnchor="end" fontSize="9" fill="#64748B" fontFamily="var(--font-sans)">
              {tick}
            </text>
          </g>
        ))}
        {metric.unit ? (
          <text x={left - 5} y={top + chartH + 12} textAnchor="end" fontSize="9" fill="#64748B" fontFamily="var(--font-sans)">
            {metric.unit}
          </text>
        ) : null}

        <polyline points={polyline} fill="none" stroke={metric.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {points.map((p, i) => {
          const isFirst = i === 0;
          const isLast = i === points.length - 1;
          const cx = x(i);
          const cy = y(p.value);
          return (
            <g key={i}>
              {(isFirst || isLast) ? (
                <line x1={cx} y1={cy} x2={cx} y2={top + chartH} stroke={`color-mix(in srgb, ${metric.color} ${isLast ? 30 : 15}%, transparent)`} strokeWidth="0.5" />
              ) : null}
              {isFirst ? (
                <circle cx={cx} cy={cy} r="5" fill="#FFFFFF" stroke={metric.color} strokeWidth="2" />
              ) : isLast ? (
                <circle cx={cx} cy={cy} r="6" fill={metric.color} stroke="#FFFFFF" strokeWidth="2" />
              ) : (
                <circle cx={cx} cy={cy} r="3" fill={metric.color} />
              )}
              <text x={cx} y={cy - 8} textAnchor="middle" fontSize={isFirst || isLast ? "10" : "9"} fill={isFirst || isLast ? metric.color : "#475569"} fontWeight={isFirst || isLast ? 500 : 400} fontFamily="var(--font-sans)">
                {p.value.toFixed(metric.decimals)}
              </text>
              <text x={cx} y={top + chartH + 15} textAnchor="middle" fontSize="9" fill={isFirst || isLast ? metric.color : "#64748B"} fontWeight={isFirst || isLast ? 500 : 400} fontFamily="var(--font-sans)">
                {formatShortDate(p.date)}
              </text>
            </g>
          );
        })}

        <text x={x(0)} y={top + chartH + 32} textAnchor="middle" fontSize="8" fill={metric.color} fontWeight={500} fontFamily="var(--font-sans)">
          📍 départ
        </text>
        <text x={x(points.length - 1)} y={top + chartH + 32} textAnchor="middle" fontSize="8" fill={metric.color} fontWeight={500} fontFamily="var(--font-sans)">
          aujourd'hui
        </text>
      </svg>
    </div>
  );
}
