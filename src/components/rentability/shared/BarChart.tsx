// =============================================================================
// BarChart SVG — barres mensuelles avec record (gold) + courant (gradient).
// Chantier Rentabilité Premium V2 (2026-05-20).
// =============================================================================

interface BarChartProps {
  data: number[];
  labels: string[];
  width?: number;
  height?: number;
  current?: number; // index of current month (gradient bar)
  peak?: number;    // index of peak month (gold bar)
}

export function BarChart({
  data,
  labels,
  width = 680,
  height = 220,
  current = -1,
  peak = -1,
}: BarChartProps) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);
  const padding = { top: 28, right: 16, bottom: 30, left: 16 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const gap = 8;
  const barW = (chartW - gap * (data.length - 1)) / data.length;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block", maxWidth: "100%" }}
    >
      <defs>
        <linearGradient id="bc-current" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--ls-rentab-teal)" />
          <stop offset="50%" stopColor="var(--ls-rentab-purple)" />
          <stop offset="100%" stopColor="var(--ls-rentab-coral)" />
        </linearGradient>
      </defs>
      {data.map((v, i) => {
        const x = padding.left + i * (barW + gap);
        const h = (v / max) * chartH;
        const y = padding.top + chartH - h;
        const isPeak = i === peak;
        const isCurrent = i === current;
        const fill = isCurrent
          ? "url(#bc-current)"
          : isPeak
          ? "var(--ls-rentab-gold)"
          : "var(--ls-rentab-bg-3)";
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={6}
              fill={fill}
              style={{
                animation: `bc-bar-rise 600ms ${i * 35}ms cubic-bezier(.16,1,.3,1) both`,
                transformOrigin: `${x + barW / 2}px ${padding.top + chartH}px`,
              }}
            />
            {isPeak && (
              <text
                x={x + barW / 2}
                y={y - 6}
                textAnchor="middle"
                style={{
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: 10,
                  fontWeight: 600,
                  fill: "var(--ls-rentab-gold)",
                }}
              >
                record
              </text>
            )}
            <text
              x={x + barW / 2}
              y={height - padding.bottom + 16}
              textAnchor="middle"
              style={{
                fontFamily: "DM Sans, sans-serif",
                fontSize: 10.5,
                fill: isCurrent ? "var(--ls-rentab-ink)" : "var(--ls-rentab-ink-3)",
                fontWeight: isCurrent ? 600 : 500,
              }}
            >
              {labels[i]}
            </text>
          </g>
        );
      })}
      <style>{`
        @keyframes bc-bar-rise {
          from { transform: scaleY(0); }
          to { transform: scaleY(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          rect { animation: none !important; }
        }
      `}</style>
    </svg>
  );
}
