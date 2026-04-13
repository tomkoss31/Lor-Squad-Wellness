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
          ? "bg-white/[0.06] text-[#B0B4C4]"
          : isPositive
            ? "bg-emerald-400/10 text-emerald-200"
            : "bg-rose-400/10 text-rose-200"
      }`}
    >
      {formatDelta(value, suffix)}
    </span>
  );
}
