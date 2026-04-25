// Chantier MEGA app client v2 (2026-04-25).
// Graphique poids SVG — axes X/Y, dates JJ/MM, valeurs au-dessus de chaque
// point, départ outline gold + ligne pointillée, actuel teal r=6. Spec
// figée Thomas, code chirurgical.

import type { Assessment } from "../../lib/clientAppData";
import { formatShortDate } from "../../lib/clientAppData";

interface Props {
  assessments: Assessment[];
}

export function ClientAppWeightChart({ assessments }: Props) {
  const points = assessments
    .filter((a) => typeof a.bodyScan?.weight === "number")
    .map((a) => ({ date: a.date, weight: a.bodyScan!.weight as number }));

  if (points.length < 2) {
    return (
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "12px",
          padding: "16px 14px",
          marginTop: "12px",
        }}
      >
        <div
          style={{
            fontSize: "13px",
            color: "#444",
            fontWeight: 500,
            marginBottom: "12px",
          }}
        >
          📈 Évolution du poids
        </div>
        <div
          style={{
            fontSize: "12px",
            color: "#888",
            textAlign: "center",
            padding: "32px 16px",
            fontStyle: "italic",
          }}
        >
          Tu auras ta courbe dès le 2e bilan ✨
        </div>
      </div>
    );
  }

  const weights = points.map((p) => p.weight);
  const minW = Math.floor(Math.min(...weights) - 1);
  const maxW = Math.ceil(Math.max(...weights) + 1);
  const range = maxW - minW || 1;

  const w = 320;
  const h = 140;
  const left = 35;
  const right = 15;
  const top = 20;
  const bottom = 20;
  const chartW = w - left - right;
  const chartH = h - top - bottom;

  const x = (i: number) => left + (i / (points.length - 1)) * chartW;
  const y = (v: number) => top + ((maxW - v) / range) * chartH;

  const polyline = points.map((p, i) => `${x(i)},${y(p.weight)}`).join(" ");

  const yTicks = [
    maxW,
    maxW - Math.round(range / 3),
    minW + Math.round(range / 3),
    minW,
  ];

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: "12px",
        padding: "16px 14px",
        marginTop: "12px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "14px",
        }}
      >
        <div style={{ fontSize: "13px", color: "#444", fontWeight: 500 }}>
          📈 Évolution du poids
        </div>
        <div style={{ fontSize: "10px", color: "#888" }}>
          {points.length} bilans
        </div>
      </div>

      <svg
        width="100%"
        height={h + 40}
        viewBox={`0 0 ${w + 20} ${h + 40}`}
        style={{ overflow: "visible" }}
      >
        <line
          x1={left}
          y1={top}
          x2={left}
          y2={top + chartH}
          stroke="rgba(0,0,0,0.2)"
          strokeWidth="0.5"
        />
        <line
          x1={left}
          y1={top + chartH}
          x2={left + chartW}
          y2={top + chartH}
          stroke="rgba(0,0,0,0.2)"
          strokeWidth="0.5"
        />

        {yTicks.map((tick, idx) => (
          <g key={idx}>
            <line
              x1={left}
              y1={y(tick)}
              x2={left + chartW}
              y2={y(tick)}
              stroke="rgba(0,0,0,0.05)"
              strokeWidth="0.5"
              strokeDasharray="2,2"
            />
            <text
              x={left - 5}
              y={y(tick) + 3}
              textAnchor="end"
              fontSize="9"
              fill="#888"
              fontFamily="var(--font-sans)"
            >
              {tick}
            </text>
          </g>
        ))}
        <text
          x={left - 5}
          y={top + chartH + 12}
          textAnchor="end"
          fontSize="9"
          fill="#888"
          fontFamily="var(--font-sans)"
        >
          kg
        </text>

        <polyline
          points={polyline}
          fill="none"
          stroke="#B8922A"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((p, i) => {
          const isFirst = i === 0;
          const isLast = i === points.length - 1;
          const cx = x(i);
          const cy = y(p.weight);

          return (
            <g key={i}>
              {isFirst ? (
                <line
                  x1={cx}
                  y1={cy}
                  x2={cx}
                  y2={top + chartH}
                  stroke="rgba(184,146,42,0.15)"
                  strokeWidth="0.5"
                />
              ) : null}
              {isLast ? (
                <line
                  x1={cx}
                  y1={cy}
                  x2={cx}
                  y2={top + chartH}
                  stroke="rgba(29,158,117,0.3)"
                  strokeWidth="0.5"
                />
              ) : null}
              {isFirst ? (
                <circle
                  cx={cx}
                  cy={cy}
                  r="5"
                  fill="#FFFFFF"
                  stroke="#B8922A"
                  strokeWidth="2"
                />
              ) : isLast ? (
                <circle
                  cx={cx}
                  cy={cy}
                  r="6"
                  fill="#1D9E75"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
              ) : (
                <circle cx={cx} cy={cy} r="3" fill="#B8922A" />
              )}
              <text
                x={cx}
                y={cy - 8}
                textAnchor="middle"
                fontSize={isFirst || isLast ? "10" : "9"}
                fill={isFirst ? "#B8922A" : isLast ? "#1D9E75" : "#444"}
                fontWeight={isFirst || isLast ? 500 : 400}
                fontFamily="var(--font-sans)"
              >
                {p.weight.toFixed(1)}
              </text>
              <text
                x={cx}
                y={top + chartH + 15}
                textAnchor="middle"
                fontSize="9"
                fill={isFirst ? "#B8922A" : isLast ? "#1D9E75" : "#888"}
                fontWeight={isFirst || isLast ? 500 : 400}
                fontFamily="var(--font-sans)"
              >
                {formatShortDate(p.date)}
              </text>
            </g>
          );
        })}

        <text
          x={x(0)}
          y={top + chartH + 32}
          textAnchor="middle"
          fontSize="8"
          fill="#B8922A"
          fontWeight={500}
          fontFamily="var(--font-sans)"
        >
          📍 départ
        </text>
        <text
          x={x(points.length - 1)}
          y={top + chartH + 32}
          textAnchor="middle"
          fontSize="8"
          fill="#1D9E75"
          fontWeight={500}
          fontFamily="var(--font-sans)"
        >
          aujourd'hui
        </text>
      </svg>
    </div>
  );
}
