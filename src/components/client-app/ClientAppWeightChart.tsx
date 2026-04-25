// Weight chart SVG (Chantier Refonte Accueil + Évolution v2, 2026-04-25).

interface WeightPoint {
  date: string;
  weight: number;
}

interface Props {
  history: WeightPoint[];
}

const GOLD = "#B8922A";
const TEAL = "#1D9E75";
const TEXT = "#444";
const MUTED = "#888";

function formatDM(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

export function ClientAppWeightChart({ history }: Props) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        border: "1px solid #eee",
        fontFamily: '"DM Sans", sans-serif',
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>
        📈 Évolution du poids
      </div>
      <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
        {history.length} derniers bilans
      </div>

      {history.length < 2 ? (
        <div
          style={{
            padding: "20px 0",
            textAlign: "center",
            color: MUTED,
            fontSize: 13,
            fontStyle: "italic",
          }}
        >
          Tu auras ta courbe dès le 2e bilan ✨
        </div>
      ) : (
        <ChartSvg history={history} />
      )}
    </div>
  );
}

function ChartSvg({ history }: { history: WeightPoint[] }) {
  // Sort asc by date for plotting
  const sorted = [...history].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const W = 320;
  const H = 180;
  const PAD_LEFT = 28;
  const PAD_RIGHT = 12;
  const PAD_TOP = 18;
  const PAD_BOTTOM = 28;
  const innerW = W - PAD_LEFT - PAD_RIGHT;
  const innerH = H - PAD_TOP - PAD_BOTTOM;

  const weights = sorted.map((p) => p.weight);
  const rawMin = Math.min(...weights) - 0.5;
  const rawMax = Math.max(...weights) + 0.5;
  const minY = Math.floor(rawMin);
  const maxY = Math.ceil(rawMax);
  const rangeY = Math.max(0.5, maxY - minY);

  const xFor = (i: number) =>
    PAD_LEFT + (sorted.length === 1 ? innerW / 2 : (i / (sorted.length - 1)) * innerW);
  const yFor = (w: number) =>
    PAD_TOP + innerH - ((w - minY) / rangeY) * innerH;

  // Y graduations (4 lignes)
  const yTicks: number[] = [];
  for (let i = 0; i < 4; i++) {
    yTicks.push(minY + (rangeY * i) / 3);
  }

  const polyPoints = sorted.map((p, i) => `${xFor(i)},${yFor(p.weight)}`).join(" ");

  const firstIdx = 0;
  const lastIdx = sorted.length - 1;

  return (
    <div style={{ marginTop: 10 }}>
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Courbe d'évolution du poids"
      >
        {/* Y graduations */}
        {yTicks.map((tick, i) => {
          const y = yFor(tick);
          return (
            <g key={`y-${i}`}>
              <line
                x1={PAD_LEFT}
                y1={y}
                x2={W - PAD_RIGHT}
                y2={y}
                stroke="#eee"
                strokeDasharray="3,3"
                strokeWidth="1"
              />
              <text
                x={PAD_LEFT - 6}
                y={y + 3}
                fontSize="10"
                fill={MUTED}
                textAnchor="end"
                fontFamily='"DM Sans", sans-serif'
              >
                {Math.round(tick)}
              </text>
            </g>
          );
        })}

        {/* Axe X */}
        <line
          x1={PAD_LEFT}
          y1={H - PAD_BOTTOM}
          x2={W - PAD_RIGHT}
          y2={H - PAD_BOTTOM}
          stroke="#ddd"
          strokeWidth="1"
        />

        {/* Ligne pointillée verticale sous le 1er point */}
        <line
          x1={xFor(firstIdx)}
          y1={yFor(sorted[firstIdx].weight)}
          x2={xFor(firstIdx)}
          y2={H - PAD_BOTTOM}
          stroke={GOLD}
          strokeDasharray="3,3"
          strokeWidth="1"
          opacity="0.4"
        />

        {/* Polyline */}
        <polyline
          points={polyPoints}
          fill="none"
          stroke={GOLD}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Points + labels */}
        {sorted.map((p, i) => {
          const cx = xFor(i);
          const cy = yFor(p.weight);
          const isFirst = i === firstIdx;
          const isLast = i === lastIdx;
          return (
            <g key={`pt-${i}`}>
              {/* Valeur au-dessus */}
              <text
                x={cx}
                y={cy - 8}
                fontSize="9"
                fill={TEXT}
                textAnchor="middle"
                fontFamily='"Syne", serif'
              >
                {p.weight.toFixed(1)}
              </text>
              {/* Cercle */}
              {isLast ? (
                <circle cx={cx} cy={cy} r={6} fill={TEAL} stroke="#FFFFFF" strokeWidth="2" />
              ) : isFirst ? (
                <circle cx={cx} cy={cy} r={5} fill="#FFFFFF" stroke={GOLD} strokeWidth="2" />
              ) : (
                <circle cx={cx} cy={cy} r={3} fill={GOLD} />
              )}
              {/* Date X */}
              <text
                x={cx}
                y={H - PAD_BOTTOM + 12}
                fontSize="9"
                fill={MUTED}
                textAnchor="middle"
                fontFamily='"DM Sans", sans-serif'
              >
                {formatDM(p.date)}
              </text>
            </g>
          );
        })}

        {/* Labels départ / aujourd'hui */}
        <text
          x={xFor(firstIdx)}
          y={H - 4}
          fontSize="10"
          fill={GOLD}
          textAnchor="middle"
          fontFamily='"DM Sans", sans-serif'
        >
          📍 départ
        </text>
        <text
          x={xFor(lastIdx)}
          y={H - 4}
          fontSize="10"
          fill={TEAL}
          textAnchor="middle"
          fontFamily='"DM Sans", sans-serif'
        >
          aujourd&apos;hui
        </text>
      </svg>
    </div>
  );
}
