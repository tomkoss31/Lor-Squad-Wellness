// Key metrics grid 2x2 (Chantier Refonte Accueil + Évolution v2, 2026-04-25).
// 4 indicateurs clés : Poids / Masse grasse / Muscle / Eau.

import type { BodyScanLite } from "../../lib/clientAppData";
import { calculateDelta } from "../../lib/clientAppData";

interface Props {
  current: BodyScanLite | null;
  starting: BodyScanLite | null;
}

const GOLD = "#B8922A";
const CORAL = "#D85A30";
const TEAL = "#1D9E75";
const VIOLET = "#7F77DD";
const MUTED = "#888";
const BAD = "#DC2626";

type MetricDef = {
  key: keyof BodyScanLite;
  label: string;
  unit: string;
  color: string;
  /** Direction favorable du delta. "down" = la valeur doit diminuer. */
  favorable: "down" | "up";
};

const METRICS: MetricDef[] = [
  { key: "weight", label: "Poids", unit: "kg", color: GOLD, favorable: "down" },
  { key: "bodyFat", label: "Masse grasse", unit: "%", color: CORAL, favorable: "down" },
  { key: "muscleMass", label: "Muscle", unit: "kg", color: TEAL, favorable: "up" },
  { key: "hydration", label: "Eau", unit: "%", color: VIOLET, favorable: "up" },
];

function isNum(n: unknown): n is number {
  return typeof n === "number" && !Number.isNaN(n);
}

export function ClientAppKeyMetricsGrid({ current, starting }: Props) {
  return (
    <div style={{ fontFamily: '"DM Sans", sans-serif' }}>
      <div
        style={{
          fontSize: 10,
          color: GOLD,
          letterSpacing: 1.5,
          fontWeight: 500,
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        TES 4 INDICATEURS CLÉS
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {METRICS.map((m) => {
          const cur = current?.[m.key];
          const start = starting?.[m.key];
          const delta = calculateDelta(cur ?? null, start ?? null);

          let deltaNode: React.ReactNode = null;
          if (!starting) {
            deltaNode = (
              <div style={{ fontSize: 10, color: MUTED, marginTop: 4 }}>Premier bilan</div>
            );
          } else if (delta == null) {
            deltaNode = (
              <div style={{ fontSize: 10, color: MUTED, marginTop: 4 }}>—</div>
            );
          } else {
            const abs = Math.abs(delta);
            const arrow = delta < 0 ? "↓" : delta > 0 ? "↑" : "→";
            let color = MUTED;
            if (delta === 0) color = MUTED;
            else {
              const isFavorable =
                (m.favorable === "down" && delta < 0) ||
                (m.favorable === "up" && delta > 0);
              color = isFavorable ? TEAL : BAD;
            }
            deltaNode = (
              <div style={{ fontSize: 10, color, marginTop: 4, fontWeight: 500 }}>
                {arrow} {abs.toFixed(1)} {m.unit} depuis le départ
              </div>
            );
          }

          return (
            <div
              key={m.key as string}
              style={{
                background: "#FFFFFF",
                borderRadius: 12,
                padding: 14,
                borderTop: `3px solid ${m.color}`,
                border: "1px solid #eee",
                borderTopWidth: 3,
                borderTopColor: m.color,
                borderTopStyle: "solid",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: MUTED,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 4,
                }}
              >
                {m.label}
              </div>
              <div>
                <span
                  style={{
                    fontFamily: '"Syne", serif',
                    fontSize: 26,
                    color: m.color,
                    lineHeight: 1.1,
                  }}
                >
                  {isNum(cur) ? cur.toFixed(1) : "—"}
                </span>
                <span style={{ fontSize: 13, color: MUTED, marginLeft: 4 }}>
                  {m.unit}
                </span>
              </div>
              {deltaNode}
            </div>
          );
        })}
      </div>
    </div>
  );
}
