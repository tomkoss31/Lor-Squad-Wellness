// =============================================================================
// RentabilitySankeyFlow — diagramme de flux pour la section "Le calcul".
// 3 sources (CA perso, Override équipe, Override hors-app) → 1 destination
// (Total net). Les rubans courbes ont une hauteur proportionnelle.
//
// Chantier Rentabilité Premium V2 (2026-05-20).
// Source design : docs/mockups/rentabilite-design-v2/.../surprises.jsx
// =============================================================================

interface Props {
  /** Conservé pour signature future (audit, debug). */
  caBrut?: number;
  marginPct: number;
  margeDirecte: number;
  overrideTeam: number;
  overrideExt: number;
  productsCount: number;
  teamCount: number;
  externalCount: number;
  month: string;
}

export function RentabilitySankeyFlow({
  marginPct,
  margeDirecte,
  overrideTeam,
  overrideExt,
  productsCount,
  teamCount,
  externalCount,
  month,
}: Props) {
  const total = Math.max(1, margeDirecte + overrideTeam + overrideExt);

  // Layout
  const W = 940;
  const H = 460;
  const left = 60;
  const right = W - 60;
  const srcWidth = 220;
  const destWidth = 220;

  // Sources avec hauteur proportionnelle (min 56px pour rester lisibles)
  const minH = 56;
  const totalHeight = 360;
  const sourcesRaw = [
    {
      label: "CA brut perso",
      sub: `${productsCount} programme${productsCount > 1 ? "s" : ""}`,
      note: `× ${Math.round(marginPct)}% marge`,
      value: margeDirecte,
      color: "var(--ls-rentab-teal)",
    },
    {
      label: "Override équipe app",
      sub: `${teamCount} distri`,
      note: "L1 direct",
      value: overrideTeam,
      color: "var(--ls-rentab-purple)",
    },
    {
      label: "Override hors-app",
      sub: `${externalCount} distri saisi${externalCount > 1 ? "s" : ""}`,
      note: "manuel",
      value: overrideExt,
      color: "var(--ls-rentab-purple-soft)",
    },
  ];

  // Hauteurs proportionnelles avec floor minH si > 0
  const sumValues = sourcesRaw.reduce((acc, s) => acc + Math.max(0, s.value), 0);
  let cursorY = 30;
  const sources = sourcesRaw.map((s) => {
    const h = s.value > 0
      ? Math.max(minH, (s.value / Math.max(1, sumValues)) * totalHeight)
      : minH;
    const node = { ...s, y: cursorY, h };
    cursorY += h + 16;
    return node;
  });

  // Destination total stacked (top→bottom dans même ordre)
  const destY = 50;
  const destH = totalHeight + 20;
  let destCursor = destY;
  const dest = sources.map((s) => {
    const h = s.value > 0 ? (s.value / Math.max(1, sumValues)) * destH : 0;
    const slice = { y: destCursor, h, value: s.value, color: s.color };
    destCursor += h;
    return slice;
  });

  return (
    <div className="lr-card" style={{ position: "relative", padding: 18, overflow: "hidden", marginBottom: 18 }}>
      <div className="lr-mesh" style={{ opacity: 0.5 }} />
      <div style={{ position: "relative", marginBottom: 14 }}>
        <div className="lr-eyebrow">
          <span aria-hidden="true">◆</span>
          Le calcul · vue flux
        </div>
        <div
          style={{
            fontFamily: "Syne, sans-serif",
            fontWeight: 600,
            fontSize: 26,
            color: "var(--ls-rentab-ink)",
            marginTop: 4,
            letterSpacing: "-0.01em",
          }}
        >
          D'où viennent les{" "}
          <em
            data-stealth
            style={{
              fontStyle: "italic",
              background:
                "linear-gradient(95deg, var(--ls-rentab-teal), var(--ls-rentab-purple), var(--ls-rentab-coral))",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {Math.round(total).toLocaleString("fr-FR")} €
          </em>
        </div>
      </div>

      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ position: "relative", display: "block", maxWidth: "100%" }}
      >
        <defs>
          {sources.map((s, i) => (
            <linearGradient key={i} id={`sk-g-${i}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.55" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0.85" />
            </linearGradient>
          ))}
          <linearGradient id="sk-dest-bar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ls-rentab-teal)" />
            <stop offset="50%" stopColor="var(--ls-rentab-purple)" />
            <stop offset="100%" stopColor="var(--ls-rentab-coral)" />
          </linearGradient>
        </defs>

        {/* Ribbons */}
        {sources.map((s, i) => {
          const x1 = left + srcWidth;
          const x2 = right - destWidth;
          const cp = (x1 + x2) / 2;
          if (s.value <= 0) return null;
          const path = `M ${x1} ${s.y}
                        C ${cp} ${s.y}, ${cp} ${dest[i].y}, ${x2} ${dest[i].y}
                        L ${x2} ${dest[i].y + dest[i].h}
                        C ${cp} ${dest[i].y + dest[i].h}, ${cp} ${s.y + s.h}, ${x1} ${s.y + s.h} Z`;
          return (
            <path
              key={i}
              d={path}
              fill={`url(#sk-g-${i})`}
              style={{
                animation: `sk-rib 900ms ${100 + i * 100}ms cubic-bezier(.16,1,.3,1) both`,
                filter: "blur(.3px)",
              }}
            />
          );
        })}

        {/* Source nodes */}
        {sources.map((s, i) => (
          <g key={i}>
            <rect
              x={left}
              y={s.y}
              width={srcWidth}
              height={s.h}
              rx={14}
              fill="var(--ls-rentab-bg-1)"
              stroke={s.color}
              strokeOpacity="0.4"
              strokeWidth="1.5"
            />
            <rect x={left} y={s.y} width={5} height={s.h} fill={s.color} rx={2.5} />
            <text
              x={left + 18}
              y={s.y + 22}
              style={{
                fontFamily: "DM Sans, sans-serif",
                fontWeight: 600,
                fontSize: 13.5,
                fill: "var(--ls-rentab-ink)",
              }}
            >
              {s.label}
            </text>
            <text
              x={left + 18}
              y={s.y + 40}
              style={{
                fontFamily: "DM Sans, sans-serif",
                fontSize: 11.5,
                fill: "var(--ls-rentab-ink-3)",
              }}
            >
              {s.sub} · {s.note}
            </text>
            <text
              data-stealth=""
              x={left + 18}
              y={s.y + s.h - 14}
              style={{
                fontFamily: "Syne, sans-serif",
                fontStyle: "italic",
                fontWeight: 700,
                fontSize: 26,
                fill: s.color,
                letterSpacing: "-0.01em",
              }}
            >
              {Math.round(s.value).toLocaleString("fr-FR")} €
            </text>
          </g>
        ))}

        {/* Destination node */}
        <g>
          <rect
            x={right - destWidth}
            y={destY}
            width={destWidth}
            height={destH}
            rx={16}
            fill="var(--ls-rentab-bg-1)"
            stroke="var(--ls-rentab-line-2)"
            strokeWidth="1.5"
          />
          <rect x={right - destWidth} y={destY} width={5} height={destH} rx={2.5} fill="url(#sk-dest-bar)" />
          <text
            x={right - destWidth + 20}
            y={destY + 26}
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: 10.5,
              fill: "var(--ls-rentab-ink-3)",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            Total net · {month}
          </text>
          <text
            data-stealth=""
            x={right - destWidth + 20}
            y={destY + 110}
            style={{
              fontFamily: "Syne, sans-serif",
              fontStyle: "italic",
              fontWeight: 700,
              fontSize: 56,
              fill: "var(--ls-rentab-ink)",
              letterSpacing: "-0.02em",
            }}
          >
            {Math.round(total).toLocaleString("fr-FR")}
          </text>
          <text
            x={right - destWidth + 20}
            y={destY + 140}
            style={{
              fontFamily: "Syne, sans-serif",
              fontStyle: "italic",
              fontWeight: 600,
              fontSize: 22,
              fill: "var(--ls-rentab-ink-2)",
            }}
          >
            euros
          </text>
          {dest.map((d, i) => {
            if (d.h === 0) return null;
            return (
              <g key={i}>
                <rect
                  x={right - destWidth + 20}
                  y={destY + 180 + i * 46}
                  width={6}
                  height={6}
                  rx={3}
                  fill={d.color}
                />
                <text
                  x={right - destWidth + 32}
                  y={destY + 186 + i * 46}
                  style={{
                    fontFamily: "DM Sans, sans-serif",
                    fontSize: 12,
                    fill: "var(--ls-rentab-ink-2)",
                  }}
                >
                  {sources[i].label.replace(" app", "").replace(" perso", "")}
                </text>
                <text
                  data-stealth=""
                  x={right - 24}
                  y={destY + 186 + i * 46}
                  textAnchor="end"
                  style={{
                    fontFamily: "Syne, sans-serif",
                    fontStyle: "italic",
                    fontWeight: 700,
                    fontSize: 14,
                    fill: "var(--ls-rentab-ink)",
                  }}
                >
                  {Math.round(d.value).toLocaleString("fr-FR")} €
                </text>
                <rect
                  x={right - destWidth + 20}
                  y={destY + 196 + i * 46}
                  width={170}
                  height={3}
                  rx={2}
                  fill="var(--ls-rentab-bg-2)"
                />
                <rect
                  x={right - destWidth + 20}
                  y={destY + 196 + i * 46}
                  width={170 * (d.value / total)}
                  height={3}
                  rx={2}
                  fill={d.color}
                  style={{
                    animation: `sk-fill ${600 + i * 100}ms ${300 + i * 100}ms cubic-bezier(.16,1,.3,1) both`,
                    transformOrigin: "left",
                    transform: "scaleX(0)",
                  }}
                />
              </g>
            );
          })}
        </g>

        {/* connector dots */}
        {sources.map((s, i) => {
          if (s.value <= 0) return null;
          return (
            <g key={i}>
              <circle cx={left + srcWidth} cy={s.y + s.h / 2} r={3.5} fill={s.color} />
              <circle cx={right - destWidth} cy={dest[i].y + dest[i].h / 2} r={3.5} fill={s.color} />
            </g>
          );
        })}
      </svg>

      <style>{`
        @keyframes sk-rib { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes sk-fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @media (prefers-reduced-motion: reduce) {
          path, rect { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
