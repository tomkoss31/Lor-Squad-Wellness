// =============================================================================
// GaugeProjection — jauge circulaire premium avec marker projection + glow.
// Chantier Rentabilité Premium V2 (2026-05-20).
// Source design : docs/mockups/rentabilite-design-v2/.../common.jsx (Gauge)
// =============================================================================

import { useCountUp } from "./useCountUp";

interface GaugeProjectionProps {
  /** Fraction atteinte 0..1 */
  value: number;
  /** Fraction projection fin de mois 0..1 — position du marker */
  projection?: number;
  size?: number;
  thickness?: number;
  /** Si true → marker gold pulsant (en avance), sinon coral (en retard) */
  ahead?: boolean;
  /** Glow signature (recommandé dark mode) */
  glow?: boolean;
  uid?: string;
  centerTop?: string;
  centerBig?: string;
  centerSub?: string;
}

export function GaugeProjection({
  value,
  projection = 1,
  size = 186,
  thickness = 13,
  ahead = true,
  glow = false,
  uid = "gauge",
  centerTop,
  centerBig,
  centerSub,
}: GaugeProjectionProps) {
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * r;
  const sweep = 0.84;
  const startAngle = 130;

  const animVal = useCountUp(Math.min(1, Math.max(0, value)), { duration: 1100, delay: 120 });
  const dash = C * sweep * Math.min(1, Math.max(0, animVal));
  const trackDash = C * sweep;

  // Position marker projection sur l'arc
  const projAngle = ((startAngle + 360 * sweep * Math.min(1, Math.max(0, projection))) * Math.PI) / 180;
  const mx = cx + r * Math.cos(projAngle);
  const my = cy + r * Math.sin(projAngle);

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        filter: glow ? "drop-shadow(0 0 14px color-mix(in oklab, var(--ls-rentab-teal) 28%, transparent))" : "none",
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id={`${uid}-grad`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--ls-rentab-teal)" />
            <stop offset="60%" stopColor="var(--ls-rentab-purple)" />
            <stop offset="100%" stopColor="var(--ls-rentab-coral)" />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--ls-rentab-bg-2)"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${trackDash} ${C}`}
          transform={`rotate(${startAngle} ${cx} ${cy})`}
        />
        {/* Progress */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={`url(#${uid}-grad)`}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${C}`}
          transform={`rotate(${startAngle} ${cx} ${cy})`}
          style={{ transition: "stroke-dasharray 200ms linear" }}
        />
        {/* Projection marker */}
        <circle
          cx={mx}
          cy={my}
          r={7}
          fill="var(--ls-rentab-bg-1)"
          stroke={ahead ? "var(--ls-rentab-gold)" : "var(--ls-rentab-coral)"}
          strokeWidth="2.5"
          style={{
            animation: ahead ? "lr-marker-pulse 2s ease-in-out infinite" : undefined,
          }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: 2,
        }}
      >
        {centerTop && (
          <div
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: 10.5,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--ls-rentab-ink-3)",
            }}
          >
            {centerTop}
          </div>
        )}
        <div
          data-stealth
          className="lr-num"
          style={{
            fontWeight: 700,
            fontSize: size * 0.22,
            lineHeight: 1,
            color: "var(--ls-rentab-ink)",
            letterSpacing: "-0.02em",
          }}
        >
          {centerBig}
        </div>
        {centerSub && (
          <div
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: 11.5,
              color: "var(--ls-rentab-ink-3)",
              marginTop: 4,
            }}
          >
            {centerSub}
          </div>
        )}
      </div>
      <style>{`
        @keyframes lr-marker-pulse {
          0%, 100% { transform: none; }
          50% { transform: scale(1.18); }
        }
        @media (prefers-reduced-motion: reduce) {
          circle { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
