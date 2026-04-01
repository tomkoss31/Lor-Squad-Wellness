import { estimateBodyFatKg } from "../../lib/calculations";
import { DeltaBadge } from "./DeltaBadge";
import {
  PedagogicalMetricCard,
  PedagogicalSection
} from "../education/PedagogicalSection";
import type { BiologicalSex, Objective } from "../../types/domain";

interface BodyFatReference {
  weight: number;
  percent: number;
}

interface BodyFatInsightCardProps {
  current: BodyFatReference;
  previous?: BodyFatReference | null;
  initial?: BodyFatReference | null;
  objective?: Objective;
  sex?: BiologicalSex;
}

export function BodyFatInsightCard({
  current,
  previous = null,
  initial = null,
  objective,
  sex
}: BodyFatInsightCardProps) {
  const currentKg = estimateBodyFatKg(current.weight, current.percent);
  const previousKg = previous ? estimateBodyFatKg(previous.weight, previous.percent) : null;
  const initialKg = initial ? estimateBodyFatKg(initial.weight, initial.percent) : null;
  const gaugePosition = getGaugePosition(current.percent);
  const targetRange = getBodyFatTargetRange(sex, objective);
  const bodyFatTone = getBodyFatTone(current.percent, targetRange);
  const bodyFatBand = getBodyFatBand(current.percent, targetRange);
  const targetStart = getGaugePosition(targetRange.min);
  const targetEnd = getGaugePosition(targetRange.max);

  const previousPercentDelta = previous ? round(current.percent - previous.percent) : 0;
  const previousKgDelta = previousKg == null ? 0 : round(currentKg - previousKg);
  const initialPercentDelta = initial ? round(current.percent - initial.percent) : 0;
  const initialKgDelta = initialKg == null ? 0 : round(currentKg - initialKg);

  return (
    <PedagogicalSection
      eyebrow="Lecture body scan"
      title="Masse grasse"
      subtitle="Lecture directe en pourcentage et en kilos estimes pour situer la progression."
      statusLabel={`${current.percent} %`}
      statusTone={bodyFatTone}
      metrics={
        <>
          <PedagogicalMetricCard
            label="% actuel"
            value={`${current.percent} %`}
            accent="red"
          />
          <PedagogicalMetricCard
            label="Equivalent estime"
            value={`${currentKg} kg`}
            accent="red"
          />
          <div className="md:col-span-2 xl:col-span-3 rounded-[24px] border border-white/10 bg-slate-950/35 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Jauge corporelle</p>
                <p className="mt-2 text-sm text-slate-400">
                  Cible {getSexLabel(sex)} : {targetRange.min}-{targetRange.max} %
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-sm font-semibold text-white">
                {bodyFatBand}
              </span>
            </div>

            <div className="mt-4">
              <div className="relative h-3 rounded-full bg-gradient-to-r from-emerald-400 via-amber-300 to-rose-500">
                <div
                  className="absolute top-1/2 h-6 -translate-y-1/2 rounded-full border border-white/60 bg-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.12)]"
                  style={{
                    left: `${targetStart}%`,
                    width: `${Math.max(targetEnd - targetStart, 6)}%`
                  }}
                />
                <div
                  className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-white bg-slate-950 shadow-[0_0_0_4px_rgba(15,23,42,0.55)]"
                  style={{ left: `calc(${gaugePosition}% - 10px)` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-slate-500">
                {[10, 20, 30, 40, 50].map((value) => (
                  <span key={value}>{value}</span>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">
                  Zone cible
                </span>
                <span>{getTargetHint(sex, objective)}</span>
              </div>
            </div>
          </div>
          <div className="md:col-span-2 xl:col-span-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">Ecarts lisibles</p>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Suivi</p>
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-2">
            <DeltaPanel
              title="Vs bilan precedent"
              percentDelta={previousPercentDelta}
              kgDelta={previousKgDelta}
              enabled={previous != null}
            />
            <DeltaPanel
              title="Vs premier bilan"
              percentDelta={initialPercentDelta}
              kgDelta={initialKgDelta}
              enabled={initial != null}
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
  percentDelta,
  kgDelta,
  enabled
}: {
  title: string;
  percentDelta: number;
  kgDelta: number;
  enabled: boolean;
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-slate-950/35 p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <div className="mt-4 grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-400">Variation en %</span>
          <DeltaBadge value={enabled ? percentDelta : 0} suffix=" %" inverseGood />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-400">Variation en kg</span>
          <DeltaBadge value={enabled ? kgDelta : 0} suffix=" kg" inverseGood />
        </div>
      </div>
    </div>
  );
}

function round(value: number) {
  return Number(value.toFixed(1));
}

function getGaugePosition(percent: number) {
  const min = 10;
  const max = 50;
  const clamped = Math.min(Math.max(percent, min), max);
  return ((clamped - min) / (max - min)) * 100;
}

function getBodyFatTone(
  percent: number,
  targetRange: { min: number; max: number }
): "green" | "blue" | "amber" | "red" {
  if (percent >= targetRange.min && percent <= targetRange.max) {
    return "green";
  }

  if (percent < targetRange.min) {
    return "blue";
  }

  if (percent <= targetRange.max + 5) {
    return "amber";
  }

  return "red";
}

function getBodyFatBand(percent: number, targetRange: { min: number; max: number }) {
  if (percent < targetRange.min) {
    return "Sous la cible";
  }

  if (percent <= targetRange.max) {
    return "Dans la cible";
  }

  if (percent <= targetRange.max + 5) {
    return "Au-dessus de la cible";
  }

  return "Au-dessus de la cible";
}

function getBodyFatTargetRange(sex?: BiologicalSex, objective?: Objective) {
  if (sex === "male") {
    if (objective === "sport") {
      return { min: 10, max: 15 };
    }

    if (objective === "weight-loss") {
      return { min: 14, max: 20 };
    }

    return { min: 12, max: 20 };
  }

  if (objective === "sport") {
    return { min: 18, max: 24 };
  }

  if (objective === "weight-loss") {
    return { min: 24, max: 30 };
  }

  return { min: 22, max: 30 };
}

function getSexLabel(sex?: BiologicalSex) {
  if (sex === "male") {
    return "homme";
  }

  if (sex === "female") {
    return "femme";
  }

  return "profil";
}

function getTargetHint(sex?: BiologicalSex, objective?: Objective) {
  if (sex === "male" && objective === "sport") {
    return "Repere sport homme";
  }

  if (sex === "male" && objective === "weight-loss") {
    return "Repere progression homme";
  }

  if (sex === "female" && objective === "sport") {
    return "Repere sport femme";
  }

  if (sex === "female" && objective === "weight-loss") {
    return "Repere progression femme";
  }

  return "Repere corporel general";
}
