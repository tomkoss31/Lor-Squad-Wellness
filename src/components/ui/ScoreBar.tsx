interface ScoreBarProps {
  value: number;
  max: number;
  color: string;
  label: string;
  unit?: string;
}

export function ScoreBar({ value, max, color, label, unit = "" }: ScoreBarProps) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const safeMax = max > 0 ? max : 1;
  const width = Math.min((safeValue / safeMax) * 100, 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="text-[var(--lor-text)]">{label}</span>
        <span className="text-[var(--lor-muted)]">
          {safeValue}
          {unit}
        </span>
      </div>
      <div className="h-1 w-full rounded-[2px] bg-[var(--lor-surface2)]">
        <div className="h-1 rounded-[2px]" style={{ width: `${width}%`, background: color }} />
      </div>
    </div>
  );
}

export default ScoreBar;
