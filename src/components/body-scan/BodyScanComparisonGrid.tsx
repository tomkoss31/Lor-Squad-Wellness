import { DeltaBadge } from "./DeltaBadge";

export interface ComparisonMetricCard {
  label: string;
  primary: string;
  secondary?: string;
  previousDelta: number;
  initialDelta: number;
  suffix: string;
  inverseGood?: boolean;
}

interface BodyScanComparisonGridProps {
  items: ComparisonMetricCard[];
}

export function BodyScanComparisonGrid({ items }: BodyScanComparisonGridProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-[22px] border border-white/10 bg-[var(--ls-surface2)] p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--ls-text-hint)]">{item.label}</p>
              <p className="mt-3 text-2xl font-semibold text-white">{item.primary}</p>
              {item.secondary ? (
                <p className="mt-2 text-sm text-[var(--ls-text-muted)]">{item.secondary}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <ComparisonLine
              label="Vs precedent"
              value={item.previousDelta}
              suffix={item.suffix}
              inverseGood={item.inverseGood}
            />
            <ComparisonLine
              label="Vs premier bilan"
              value={item.initialDelta}
              suffix={item.suffix}
              inverseGood={item.inverseGood}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ComparisonLine({
  label,
  value,
  suffix,
  inverseGood
}: {
  label: string;
  value: number;
  suffix: string;
  inverseGood?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[18px] bg-[var(--ls-bg)]/80 px-3 py-3">
      <span className="text-xs uppercase tracking-[0.18em] text-[var(--ls-text-hint)]">{label}</span>
      <DeltaBadge value={value} suffix={suffix} inverseGood={inverseGood} />
    </div>
  );
}
