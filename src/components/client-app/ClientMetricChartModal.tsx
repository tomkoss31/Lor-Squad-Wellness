// =============================================================================
// ClientMetricChartModal — courbe d'évolution d'UNE métrique de composition,
// ouverte au clic sur une carte indicateur (chantier PWA 2026-06-12).
//
// Réutilise le style exact de ClientAppWeightChart (SVG natif, zéro dépendance
// ajoutée dans le chunk client) mais paramétré par la métrique (clé bodyScan,
// libellé, unité, couleur, décimales). Le client clique « Masse grasse » →
// il voit sa courbe, comme le coach.
// =============================================================================

import type { Assessment } from "../../lib/clientAppData";
import { formatShortDate } from "../../lib/clientAppData";

export interface MetricDef {
  key: "weight" | "bodyFat" | "muscleMass" | "hydration" | "visceralFat";
  label: string;
  unit: string;
  color: string;
  decimals: number;
}

interface Props {
  metric: MetricDef;
  assessments: Assessment[];
  onClose: () => void;
}

export function ClientMetricChartModal({ metric, assessments, onClose }: Props) {
  const points = assessments
    .filter((a) => typeof a.bodyScan?.[metric.key] === "number")
    .map((a) => ({ date: a.date, value: a.bodyScan![metric.key] as number }));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Évolution ${metric.label}`}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(15,23,42,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#FFFFFF",
          borderRadius: 18,
          padding: "18px 16px 16px",
          boxShadow: "0 18px 50px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: metric.color, display: "inline-block" }} />
            <div style={{ fontFamily: "Sora, system-ui, sans-serif", fontWeight: 700, fontSize: 15, color: "#0F172A" }}>
              Évolution · {metric.label}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{
              border: "none",
              background: "#F1F5F9",
              borderRadius: 999,
              width: 30,
              height: 30,
              fontSize: 16,
              color: "#475569",
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <MetricChart points={points} metric={metric} />
      </div>
    </div>
  );
}

function MetricChart({
  points,
  metric,
}: {
  points: { date: string; value: number }[];
  metric: MetricDef;
}) {
  if (points.length < 2) {
    return (
      <div style={{ fontSize: 13, color: "#64748B", textAlign: "center", padding: "36px 16px", fontStyle: "italic" }}>
        Tu auras ta courbe dès ton 2e bilan ✨
      </div>
    );
  }

  const values = points.map((p) => p.value);
  const minV = Math.floor(Math.min(...values) - 1);
  const maxV = Math.ceil(Math.max(...values) + 1);
  const range = maxV - minV || 1;

  const w = 360;
  const h = 170;
  const left = 38;
  const right = 16;
  const top = 22;
  const bottom = 22;
  const chartW = w - left - right;
  const chartH = h - top - bottom;

  const x = (i: number) => left + (i / (points.length - 1)) * chartW;
  const y = (v: number) => top + ((maxV - v) / range) * chartH;
  const polyline = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  const yTicks = [maxV, maxV - Math.round(range / 3), minV + Math.round(range / 3), minV];

  const first = points[0].value;
  const last = points[points.length - 1].value;
  const delta = last - first;
  const deltaStr = `${delta > 0 ? "+" : delta < 0 ? "−" : ""}${Math.abs(delta).toFixed(metric.decimals)} ${metric.unit}`;

  return (
    <>
      <svg width="100%" height={h + 42} viewBox={`0 0 ${w + 20} ${h + 42}`} style={{ overflow: "visible" }}>
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
        <text x={left - 5} y={top + chartH + 12} textAnchor="end" fontSize="9" fill="#64748B" fontFamily="var(--font-sans)">
          {metric.unit}
        </text>

        <polyline points={polyline} fill="none" stroke={metric.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {points.map((p, i) => {
          const isFirst = i === 0;
          const isLast = i === points.length - 1;
          const cx = x(i);
          const cy = y(p.value);
          return (
            <g key={i}>
              {isLast ? <line x1={cx} y1={cy} x2={cx} y2={top + chartH} stroke={`${metric.color}55`} strokeWidth="0.5" /> : null}
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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, fontSize: 12, color: "#64748B" }}>
        <span>{points.length} bilans</span>
        <span>
          Depuis le départ :{" "}
          <strong style={{ color: metric.color }}>{deltaStr}</strong>
        </span>
      </div>
    </>
  );
}
