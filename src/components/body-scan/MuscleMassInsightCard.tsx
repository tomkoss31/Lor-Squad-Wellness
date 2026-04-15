import {
  estimateMuscleMassKg,
  estimateMuscleMassPercent
} from "../../lib/calculations";
import {
  PedagogicalMetricCard,
  PedagogicalSection
} from "../education/PedagogicalSection";
import { MetricTrendPanel } from "./MetricTrendPanel";

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
  history?: Array<(MuscleMassReference & { date: string; label?: string })>;
}

export function MuscleMassInsightCard({
  current,
  previous = null,
  initial = null,
  history = []
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

  const trendPoints = history.map((entry) => {
    const normalized = normalizeMuscleMass(entry);
    return {
      date: entry.date,
      label: entry.label,
      value: normalized.percent,
      secondary: `${normalized.kg} kg de masse musculaire`
    };
  });

  const shouldShowComparisonPanel =
    trendPoints.length > 0 || previousMetrics != null || initialMetrics != null;

  return (
    <PedagogicalSection
      eyebrow="Lecture body scan"
      title="Masse musculaire"
      subtitle="Lecture musculaire plus concrete pour voir si la base tient dans le temps."
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

          {trendPoints.length ? (
            <MetricTrendPanel
              title="Historique balance"
              subtitle="Toute la progression musculaire reste visible, avec les 3 derniers points en repere."
              unitLabel="Masse musculaire en %"
              points={trendPoints}
              gradientId="muscle-mass-line"
              gradientFrom="#34d399"
              gradientTo="#bef264"
              accentClass="border-[rgba(45,212,191,0.18)] bg-[rgba(45,212,191,0.08)]"
              valueSuffix="%"
            />
          ) : shouldShowComparisonPanel ? (
            <div className="md:col-span-2 xl:col-span-3 rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white">Ecarts lisibles</p>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--ls-text-hint)]">Suivi</p>
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
          ) : null}
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
    <div className="rounded-[20px] border border-white/10 bg-[var(--ls-bg)]/80 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--ls-text-hint)]">{title}</p>
      <div className="mt-4 grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-[var(--ls-text-muted)]">Variation en kg</span>
          <DeltaValue value={enabled ? kgDelta : 0} suffix=" kg" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-[var(--ls-text-muted)]">Variation en %</span>
          <DeltaValue value={enabled ? percentDelta : 0} suffix=" %" />
        </div>
      </div>
    </div>
  );
}

function DeltaValue({ value, suffix }: { value: number; suffix: string }) {
  const sign = value > 0 ? "+" : "";
  const tone =
    value === 0
      ? "bg-white/[0.05] text-[var(--ls-text)]"
      : value > 0
        ? "bg-[rgba(45,212,191,0.12)] text-[#2DD4BF]"
        : "bg-rose-400/[0.12] text-rose-200";

  return (
    <span className={`rounded-full px-3 py-1 text-sm font-semibold ${tone}`}>
      {sign}
      {value}
      {suffix}
    </span>
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
