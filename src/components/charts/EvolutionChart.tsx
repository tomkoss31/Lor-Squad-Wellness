interface ChartPoint {
  label: string;
  value: number | null;
  secondaryValue?: number | null;
}

interface EvolutionChartProps {
  data: ChartPoint[];
  primaryLabel: string;
  secondaryLabel?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

function buildPolyline(values: number[], width: number, height: number) {
  if (values.length === 0) {
    return "";
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");
}

export default function EvolutionChart({
  data,
  primaryLabel,
  secondaryLabel,
  primaryColor = "var(--lor-gold)",
  secondaryColor = "var(--lor-teal)"
}: EvolutionChartProps) {
  const primaryValues = data.map((point) => point.value).filter((value): value is number => value !== null);
  const secondaryValues = data
    .map((point) => point.secondaryValue)
    .filter((value): value is number => value !== null && value !== undefined);

  const primaryPolyline = buildPolyline(primaryValues, 100, 56);
  const secondaryPolyline = buildPolyline(secondaryValues, 100, 56);

  return (
    <div className="lor-card p-5">
      <div className="flex flex-wrap items-center gap-4">
        <Legend color={primaryColor} label={primaryLabel} />
        {secondaryLabel ? <Legend color={secondaryColor} label={secondaryLabel} /> : null}
      </div>
      <div className="mt-5 rounded-[10px] border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-4">
        <svg viewBox="0 0 100 56" className="h-[160px] w-full overflow-visible">
          <polyline
            fill="none"
            stroke={primaryColor}
            strokeWidth="2.5"
            points={primaryPolyline}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {secondaryLabel && secondaryPolyline ? (
            <polyline
              fill="none"
              stroke={secondaryColor}
              strokeWidth="2.5"
              points={secondaryPolyline}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}
        </svg>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-[var(--lor-muted)] md:grid-cols-4">
          {data.map((point) => (
            <div key={point.label} className="rounded-[8px] bg-[rgba(255,255,255,0.03)] px-3 py-2">
              <div>{point.label}</div>
              <div className="mt-1 text-[var(--lor-text)]">{point.value ?? "-"}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-[var(--lor-muted)]">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}
