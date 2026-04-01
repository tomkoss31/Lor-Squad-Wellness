import {
  estimateMuscleMassKg,
  estimateMuscleMassPercent
} from "../../lib/calculations";
import { DeltaBadge } from "./DeltaBadge";
import {
  PedagogicalMetricCard,
  PedagogicalSection
} from "../education/PedagogicalSection";

type MuscleUnit = "kg" | "percent";

interface MuscleMassReference {
  weight: number;
  muscleMass: number;
  unit?: MuscleUnit;
}

interface MuscleMassInsightCardProps {
  current: MuscleMassReference;
  previous?: MuscleMassReference | null;
  initial?: MuscleMassReference | null;
}

export function MuscleMassInsightCard({
  current,
  previous = null,
  initial = null
}: MuscleMassInsightCardProps) {
  const currentMetrics = normalizeMuscleMass(current);
  const previousMetrics = previous ? normalizeMuscleMass(previous) : null;
  const initialMetrics = initial ? normalizeMuscleMass(initial) : null;

  const previousKgDelta =
    previousMetrics == null ? 0 : round(currentMetrics.kg - previousMetrics.kg);
  const previousPercentDelta =
    previousMetrics == null ? 0 : round(currentMetrics.percent - previousMetrics.percent);
  const initialKgDelta =
    initialMetrics == null ? 0 : round(currentMetrics.kg - initialMetrics.kg);
  const initialPercentDelta =
    initialMetrics == null ? 0 : round(currentMetrics.percent - initialMetrics.percent);

  return (
    <PedagogicalSection
      eyebrow="Lecture body scan"
      title="Masse musculaire"
      subtitle="Lecture musculaire en kilos et en pourcentage du poids actuel."
      statusLabel={`${currentMetrics.kg} kg`}
      statusTone="green"
      metrics={
        <>
          <PedagogicalMetricCard
            label="Kg actuels"
            value={`${currentMetrics.kg} kg`}
            accent="green"
          />
          <PedagogicalMetricCard
            label="% du poids"
            value={`${currentMetrics.percent} %`}
            accent="green"
          />

          <div className="md:col-span-2 xl:col-span-3 rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">Ecarts lisibles</p>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Suivi</p>
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              <DeltaPanel
                title="Vs bilan precedent"
                kgDelta={previousKgDelta}
                percentDelta={previousPercentDelta}
                enabled={previousMetrics != null}
              />
              <DeltaPanel
                title="Vs premier bilan"
                kgDelta={initialKgDelta}
                percentDelta={initialPercentDelta}
                enabled={initialMetrics != null}
              />
            </div>
          </div>
        </>
      }
    />
  );
}

function DeltaPanel({
  title,
  kgDelta,
  percentDelta,
  enabled
}: {
  title: string;
  kgDelta: number;
  percentDelta: number;
  enabled: boolean;
}) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-slate-950/35 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <div className="mt-4 grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-400">Variation en kg</span>
          <DeltaBadge value={enabled ? kgDelta : 0} suffix=" kg" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-400">Variation en %</span>
          <DeltaBadge value={enabled ? percentDelta : 0} suffix=" %" />
        </div>
      </div>
    </div>
  );
}

function normalizeMuscleMass(reference: MuscleMassReference) {
  if (reference.unit === "percent") {
    const percent = round(reference.muscleMass);
    const kg = estimateMuscleMassKg(reference.weight, percent);
    return { kg, percent };
  }

  const kg = round(reference.muscleMass);
  const percent = estimateMuscleMassPercent(reference.weight, kg);
  return { kg, percent };
}

function round(value: number) {
  return Number(value.toFixed(1));
}
