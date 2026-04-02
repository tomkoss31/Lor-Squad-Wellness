import {
  estimateBodyFatKg,
  estimateHydrationKg,
  estimateMuscleMassPercent,
  estimateRelativeMassPercent
} from "../../lib/calculations";
import type { BodyScanMetrics } from "../../types/domain";

interface BodyScanSnapshotCardProps {
  title: string;
  dateLabel: string;
  metrics: BodyScanMetrics;
}

export function BodyScanSnapshotCard({
  title,
  dateLabel,
  metrics
}: BodyScanSnapshotCardProps) {
  const bodyFatKg = estimateBodyFatKg(metrics.weight, metrics.bodyFat);
  const musclePercent = estimateMuscleMassPercent(metrics.weight, metrics.muscleMass);
  const hydrationKg = estimateHydrationKg(metrics.weight, metrics.hydration);
  const bonePercent = estimateRelativeMassPercent(metrics.weight, metrics.boneMass);

  const items = [
    { label: "Poids", primary: `${metrics.weight} kg`, secondary: "Mesure actuelle", tone: "blue" as const },
    {
      label: "Masse grasse",
      primary: `${metrics.bodyFat} %`,
      secondary: `${bodyFatKg} kg`,
      tone: "red" as const
    },
    {
      label: "Masse musculaire",
      primary: `${metrics.muscleMass} kg`,
      secondary: `${musclePercent} % du poids`,
      tone: "green" as const
    },
    {
      label: "Hydratation",
      primary: `${metrics.hydration} %`,
      secondary: `${hydrationKg} kg`,
      tone: "blue" as const
    },
    {
      label: "Masse osseuse",
      primary: `${metrics.boneMass} kg`,
      secondary: `${bonePercent} % du poids`,
      tone: "blue" as const
    },
    { label: "Graisse viscerale", primary: `${metrics.visceralFat}`, tone: "red" as const },
    { label: "BMR", primary: `${metrics.bmr} kcal`, tone: "green" as const },
    { label: "Age metabolique", primary: `${metrics.metabolicAge} ans`, tone: "amber" as const }
  ];

  return (
    <div className="rounded-[26px] bg-slate-950/28 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow-label">{title}</p>
          <p className="mt-2 text-sm text-slate-400">{dateLabel}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.slice(0, 4).map((item) => (
          <SnapshotMetricCard
            key={item.label}
            label={item.label}
            primary={item.primary}
            secondary={item.secondary}
            tone={item.tone}
            emphasized
          />
        ))}
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.slice(4).map((item) => (
          <SnapshotMetricCard
            key={item.label}
            label={item.label}
            primary={item.primary}
            secondary={item.secondary}
            tone={item.tone}
          />
        ))}
      </div>
    </div>
  );
}

function SnapshotMetricCard({
  label,
  primary,
  secondary,
  tone,
  emphasized = false
}: {
  label: string;
  primary: string;
  secondary?: string;
  tone: "blue" | "green" | "red" | "amber";
  emphasized?: boolean;
}) {
  const accentClass =
    tone === "green"
      ? "from-emerald-400/90 via-lime-300/70 to-transparent"
      : tone === "red"
        ? "from-rose-400/90 via-orange-300/70 to-transparent"
        : tone === "amber"
          ? "from-amber-300/90 via-orange-300/65 to-transparent"
          : "from-sky-400/90 via-cyan-300/70 to-transparent";

  return (
    <div className="relative overflow-hidden rounded-[22px] bg-white/[0.03] p-4">
      <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${accentClass}`} />
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p
        className={`mt-3 font-semibold text-white ${
          emphasized ? "text-[1.8rem] leading-none" : "text-[1.35rem] leading-none"
        }`}
      >
        {primary}
      </p>
      {secondary ? <p className="mt-2 text-sm text-slate-400">{secondary}</p> : null}
    </div>
  );
}
