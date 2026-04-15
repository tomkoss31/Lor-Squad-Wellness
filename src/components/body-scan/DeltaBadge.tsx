import { formatDelta } from "../../lib/calculations";

interface DeltaBadgeProps {
  value: number;
  suffix?: string;
  inverseGood?: boolean;
}

export function DeltaBadge({
  value,
  suffix = "",
  inverseGood = false
}: DeltaBadgeProps) {
  const isNeutral = value === 0;
  const isPositive = inverseGood ? value < 0 : value > 0;

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
        isNeutral
          ? "bg-[var(--ls-surface2)] text-[var(--ls-text-muted)]"
          : isPositive
            ? "bg-[rgba(45,212,191,0.1)] text-[#2DD4BF]"
            : "bg-rose-400/10 text-rose-200"
      }`}
    >
      {formatDelta(value, suffix)}
    </span>
  );
}
