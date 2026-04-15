import type { BodyScanDelta, BodyScanMetrics } from "../../types/domain";
import { DeltaBadge } from "./DeltaBadge";

interface BodyScanDeltaGridProps {
  latest: BodyScanMetrics;
  delta: BodyScanDelta;
}

export function BodyScanDeltaGrid({ latest, delta }: BodyScanDeltaGridProps) {
  const metrics = [
    { label: "Poids", value: `${latest.weight} kg`, delta: delta.weight, suffix: " kg", inverseGood: true },
    { label: "Masse grasse", value: `${latest.bodyFat} %`, delta: delta.bodyFat, suffix: " %", inverseGood: true },
    { label: "Masse musculaire", value: `${latest.muscleMass} kg`, delta: delta.muscleMass, suffix: " kg" },
    { label: "Hydratation", value: `${latest.hydration} %`, delta: delta.hydration, suffix: " %" },
    { label: "Masse osseuse", value: `${latest.boneMass} kg`, delta: delta.boneMass, suffix: " kg" },
    { label: "Graisse viscérale", value: `${latest.visceralFat}`, delta: delta.visceralFat, inverseGood: true },
    { label: "BMR", value: `${latest.bmr} kcal`, delta: delta.bmr, suffix: " kcal" },
    { label: "Âge métabolique", value: `${latest.metabolicAge} ans`, delta: delta.metabolicAge, suffix: " ans", inverseGood: true }
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-[22px] bg-[var(--ls-surface2)] p-4">
          <p className="text-[11px] font-medium text-[var(--ls-text-hint)]">{metric.label}</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xl font-semibold text-white">{metric.value}</p>
            <DeltaBadge
              value={metric.delta}
              suffix={metric.suffix}
              inverseGood={metric.inverseGood}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
