import { useState } from "react";
import type { AssessmentRecord, BodyScanMetrics } from "../../types/domain";

type MetricKey = keyof Pick<BodyScanMetrics, "weight" | "bodyFat" | "muscleMass">;

interface EvolutionChartProps {
  assessments: AssessmentRecord[];
}

const metricOptions: Array<{ key: MetricKey; label: string; suffix: string; tone: string }> = [
  { key: "weight", label: "Poids", suffix: "kg", tone: "from-sky-500 to-cyan-300" },
  { key: "bodyFat", label: "Masse grasse", suffix: "%", tone: "from-rose-500 to-orange-300" },
  { key: "muscleMass", label: "Masse musculaire", suffix: "kg", tone: "from-[#2DD4BF] to-[#F0C96A]" }
];

export function EvolutionChart({ assessments }: EvolutionChartProps) {
  const ordered = [...assessments].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const [metricKey, setMetricKey] = useState<MetricKey>("weight");

  const values = ordered.map((assessment) => assessment.bodyScan[metricKey]);
  const maxValue = Math.max(...values, 1);
  const selectedOption = metricOptions.find((option) => option.key === metricKey)!;

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Évolution des mesures clés</p>
          <p className="text-xs text-[#7A8099]">Poids, masse grasse et masse musculaire</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {metricOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setMetricKey(option.key)}
              className={`rounded-full border px-3 py-2 text-xs font-medium transition ${
                option.key === metricKey
                  ? "border-white/15 bg-white text-[#0B0D11]"
                  : "border-white/10 bg-white/[0.05] text-[#B0B4C4] hover:bg-white/[0.08]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ordered.map((assessment) => {
          const value = assessment.bodyScan[metricKey];
          const height = Math.max((value / maxValue) * 148, 16);

          return (
            <div
              key={assessment.id}
              className="rounded-[22px] border border-white/10 bg-[#0B0D11]/80 p-4"
            >
              <div className="flex h-40 items-end">
                <div
                  className={`w-full rounded-t-[18px] bg-gradient-to-t ${selectedOption.tone}`}
                  style={{ height }}
                />
              </div>
              <p className="mt-3 text-lg font-semibold text-white">
                {value} {selectedOption.suffix}
              </p>
              <p className="text-sm text-[#7A8099]">
                {new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(
                  new Date(assessment.date)
                )}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
