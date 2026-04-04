import { formatDate } from "../../lib/calculations";

export interface MetricTrendPoint {
  date: string;
  value: number;
  secondary: string;
  label?: string;
}

interface MetricTrendPanelProps {
  title: string;
  subtitle: string;
  unitLabel: string;
  points: MetricTrendPoint[];
  gradientId: string;
  gradientFrom: string;
  gradientTo: string;
  accentClass: string;
  valueSuffix?: string;
}

export function MetricTrendPanel({
  title,
  subtitle,
  unitLabel,
  points,
  gradientId,
  gradientFrom,
  gradientTo,
  accentClass,
  valueSuffix = ""
}: MetricTrendPanelProps) {
  if (!points.length) {
    return null;
  }

  const chartPoints = points;
  const recentPoints = points.slice(-3);
  const max = Math.max(...chartPoints.map((point) => point.value), 1);
  const min = Math.min(...chartPoints.map((point) => point.value), max);
  const range = Math.max(max - min, 1);
  const width = 320;
  const height = 116;
  const paddingX = 16;
  const paddingY = 16;

  const coordinates = chartPoints.map((point, index) => {
    const x =
      chartPoints.length === 1
        ? width / 2
        : paddingX + (index * (width - paddingX * 2)) / (chartPoints.length - 1);
    const y =
      height -
      paddingY -
      ((point.value - min) / range) * (height - paddingY * 2);

    return { ...point, x, y };
  });

  const guideValues = [max, round(min + range / 2), min];
  const path = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return (
    <div className="md:col-span-2 xl:col-span-3 rounded-[24px] bg-white/[0.04] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        </div>
        <p className="text-[11px] font-medium text-slate-500">Progression</p>
      </div>

      <div className="mt-4 rounded-[22px] border border-white/8 bg-slate-950/28 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Courbe complete
          </p>
          <p className="text-xs text-slate-400">{unitLabel}</p>
        </div>

        <div className="mt-4">
          <svg viewBox={`0 0 ${width} ${height}`} className="h-28 w-full overflow-visible">
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={gradientFrom} />
                <stop offset="100%" stopColor={gradientTo} />
              </linearGradient>
            </defs>
            {guideValues.map((value, index) => {
              const y =
                height - paddingY - ((value - min) / range) * (height - paddingY * 2);

              return (
                <g key={`guide-${gradientId}-${index}`}>
                  <line
                    x1={paddingX}
                    x2={width - paddingX}
                    y1={y}
                    y2={y}
                    stroke="rgba(148,163,184,0.18)"
                    strokeDasharray="4 6"
                  />
                  <text
                    x={4}
                    y={y + 4}
                  fill="rgba(148,163,184,0.7)"
                  fontSize="10"
                  fontWeight="500"
                >
                  {`${value}${valueSuffix}`}
                </text>
              </g>
            );
            })}
            <path
              d={path}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {coordinates.map((point, index) => (
              <g key={`${gradientId}-${point.date}-${index}`}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="5"
                  fill="#0f172a"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                <text
                  x={point.x}
                  y={point.y - 10}
                  textAnchor="middle"
                fill="rgba(255,255,255,0.92)"
                fontSize="10"
                fontWeight="600"
              >
                {`${point.value}${valueSuffix}`}
              </text>
            </g>
          ))}
          </svg>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {recentPoints.map((point, index) => (
          <div
            key={`${gradientId}-card-${point.date}-${index}`}
            className={`rounded-[20px] border px-4 py-4 ${
              index === recentPoints.length - 1
                ? `${accentClass} shadow-[0_10px_30px_rgba(0,0,0,0.12)]`
                : "border-white/8 bg-slate-950/24"
            }`}
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
              {point.label ?? formatDate(point.date)}
            </p>
            {point.label ? <p className="mt-1 text-xs text-slate-400">{formatDate(point.date)}</p> : null}
            <div className="mt-4">
              <p className="text-[2rem] font-semibold tracking-[-0.04em] text-white">
                {`${point.value}${valueSuffix}`}
              </p>
              <p className="mt-1 text-sm text-slate-400">{point.secondary}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function round(value: number) {
  return Number(value.toFixed(1));
}
