import { estimateBodyFatKg, formatDate } from "../../lib/calculations";
import {
  PedagogicalMetricCard,
  PedagogicalSection
} from "../education/PedagogicalSection";
import type { BiologicalSex, Objective } from "../../types/domain";

interface BodyFatReference {
  weight: number;
  percent: number;
}

interface BodyFatHistoryPoint extends BodyFatReference {
  date: string;
  label?: string;
}

interface BodyFatInsightCardProps {
  current: BodyFatReference;
  previous?: BodyFatReference | null;
  initial?: BodyFatReference | null;
  objective?: Objective;
  sex?: BiologicalSex;
  history?: BodyFatHistoryPoint[];
}

export function BodyFatInsightCard({
  current,
  previous = null,
  initial = null,
  objective,
  sex,
  history = []
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
  const gaugeRanges = getBodyFatGaugeRanges(sex);

  const previousPercentDelta = previous ? round(current.percent - previous.percent) : 0;
  const previousKgDelta = previousKg == null ? 0 : round(currentKg - previousKg);
  const initialPercentDelta = initial ? round(current.percent - initial.percent) : 0;
  const initialKgDelta = initialKg == null ? 0 : round(currentKg - initialKg);

  const recentHistory = history.slice(-3).map((entry) => ({
    ...entry,
    kg: estimateBodyFatKg(entry.weight, entry.percent)
  }));

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
                <p className="text-[11px] font-medium text-slate-500">Jauge corporelle</p>
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
              <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-slate-500">
                {[10, 20, 30, 40, 50].map((value) => (
                  <span key={value}>{value}</span>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-white/[0.03] px-2.5 py-1">Zone cible</span>
                <span>{getTargetHint(sex, objective)}</span>
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                {gaugeRanges.map((range) => (
                  <GaugeLegendChip
                    key={range.label}
                    label={range.label}
                    value={range.value}
                    tone={range.tone}
                    active={current.percent >= range.min && current.percent <= range.max}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="md:col-span-2 xl:col-span-3 rounded-[24px] bg-white/[0.04] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">3 derniers releves</p>
                <p className="mt-1 text-xs text-slate-400">
                  Une lecture plus concrete a montrer a la cliente avant le detail.
                </p>
              </div>
              <p className="text-[11px] font-medium text-slate-500">Progression</p>
            </div>

            {recentHistory.length >= 2 ? <BodyFatProgressChart points={recentHistory} /> : null}

            {recentHistory.length ? (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {recentHistory.map((entry, index) => (
                  <HistoryReadingCard
                    key={`${entry.date}-${entry.percent}-${index}`}
                    label={entry.label ?? formatDate(entry.date)}
                    dateLabel={entry.label ? formatDate(entry.date) : undefined}
                    percent={entry.percent}
                    kg={entry.kg}
                    emphasized={index === recentHistory.length - 1}
                  />
                ))}
              </div>
            ) : (
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
            )}
          </div>
        </>
      }
    />
  );
}

function GaugeLegendChip({
  label,
  value,
  tone,
  active
}: {
  label: string;
  value: string;
  tone: "blue" | "green" | "amber" | "red";
  active: boolean;
}) {
  const palette =
    tone === "green"
      ? {
          base: "bg-emerald-400/[0.08] ring-1 ring-emerald-300/12",
          active:
            "bg-emerald-400/[0.18] ring-1 ring-emerald-300/30 shadow-[0_0_0_1px_rgba(110,231,183,0.12),0_12px_28px_rgba(16,185,129,0.12)]",
          label: "text-emerald-100/90"
        }
      : tone === "blue"
        ? {
            base: "bg-sky-400/[0.08] ring-1 ring-sky-300/12",
            active:
              "bg-sky-400/[0.18] ring-1 ring-sky-300/30 shadow-[0_0_0_1px_rgba(125,211,252,0.12),0_12px_28px_rgba(14,165,233,0.12)]",
            label: "text-sky-100/90"
          }
        : tone === "amber"
          ? {
              base: "bg-amber-300/[0.08] ring-1 ring-amber-200/12",
              active:
                "bg-amber-300/[0.18] ring-1 ring-amber-200/28 shadow-[0_0_0_1px_rgba(252,211,77,0.12),0_12px_28px_rgba(245,158,11,0.12)]",
              label: "text-amber-50/90"
            }
          : {
              base: "bg-rose-400/[0.08] ring-1 ring-rose-300/12",
              active:
                "bg-rose-400/[0.18] ring-1 ring-rose-300/28 shadow-[0_0_0_1px_rgba(251,113,133,0.12),0_12px_28px_rgba(244,63,94,0.12)]",
              label: "text-rose-50/90"
            };

  return (
    <div
      className={`rounded-[18px] px-3 py-3 ${
        active ? palette.active : palette.base
      }`}
    >
      <p
        className={`text-[11px] font-medium tracking-[0.02em] ${
          active ? palette.label : "text-slate-400"
        }`}
      >
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function BodyFatProgressChart({
  points
}: {
  points: Array<{ date: string; label?: string; percent: number; kg: number }>;
}) {
  const max = Math.max(...points.map((point) => point.percent), 1);
  const min = Math.min(...points.map((point) => point.percent), max);
  const range = Math.max(max - min, 1);
  const width = 320;
  const height = 116;
  const paddingX = 16;
  const paddingY = 16;

  const coordinates = points.map((point, index) => {
    const x =
      points.length === 1
        ? width / 2
        : paddingX + (index * (width - paddingX * 2)) / (points.length - 1);
    const y =
      height -
      paddingY -
      ((point.percent - min) / range) * (height - paddingY * 2);

    return { ...point, x, y };
  });

  const path = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return (
    <div className="mt-4 rounded-[22px] border border-white/8 bg-slate-950/28 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
          Courbe recente
        </p>
        <p className="text-xs text-slate-400">Masse grasse en %</p>
      </div>

      <div className="mt-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-28 w-full overflow-visible">
          <defs>
            <linearGradient id="body-fat-line" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="100%" stopColor="#fdba74" />
            </linearGradient>
          </defs>
          <path
            d={path}
            fill="none"
            stroke="url(#body-fat-line)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {coordinates.map((point, index) => (
            <circle
              key={`${point.date}-${index}`}
              cx={point.x}
              cy={point.y}
              r="5"
              fill="#0f172a"
              stroke="#ffffff"
              strokeWidth="2"
            />
          ))}
        </svg>
      </div>
    </div>
  );
}

function HistoryReadingCard({
  label,
  dateLabel,
  percent,
  kg,
  emphasized
}: {
  label: string;
  dateLabel?: string;
  percent: number;
  kg: number;
  emphasized?: boolean;
}) {
  return (
    <div
      className={`rounded-[20px] border px-4 py-4 ${
        emphasized
          ? "border-rose-300/18 bg-rose-400/[0.08] shadow-[0_10px_30px_rgba(251,113,133,0.08)]"
          : "border-white/8 bg-slate-950/24"
      }`}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      {dateLabel ? <p className="mt-1 text-xs text-slate-400">{dateLabel}</p> : null}
      <div className="mt-4">
        <p className="text-[2rem] font-semibold tracking-[-0.04em] text-white">{percent} %</p>
        <p className="mt-1 text-sm text-slate-400">{kg} kg estimes</p>
      </div>
    </div>
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
    <div className="rounded-[22px] bg-slate-950/24 p-4">
      <p className="text-[11px] font-medium text-slate-500">{title}</p>
      <div className="mt-4 grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-400">Variation en %</span>
          <DeltaValue value={enabled ? percentDelta : 0} suffix=" %" inverseGood />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-400">Variation en kg</span>
          <DeltaValue value={enabled ? kgDelta : 0} suffix=" kg" inverseGood />
        </div>
      </div>
    </div>
  );
}

function DeltaValue({
  value,
  suffix,
  inverseGood = false
}: {
  value: number;
  suffix: string;
  inverseGood?: boolean;
}) {
  const sign = value > 0 ? "+" : "";
  const tone =
    value === 0
      ? "bg-white/[0.05] text-slate-200"
      : inverseGood
        ? value < 0
          ? "bg-emerald-400/[0.12] text-emerald-200"
          : "bg-rose-400/[0.12] text-rose-200"
        : value > 0
          ? "bg-emerald-400/[0.12] text-emerald-200"
          : "bg-rose-400/[0.12] text-rose-200";

  return (
    <span className={`rounded-full px-3 py-1 text-sm font-semibold ${tone}`}>
      {sign}
      {value}
      {suffix}
    </span>
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

function getBodyFatGaugeRanges(sex?: BiologicalSex) {
  if (sex === "male") {
    return [
      { label: "Sous-poids", value: "< 10 %", min: Number.NEGATIVE_INFINITY, max: 9.9, tone: "blue" as const },
      { label: "Sain", value: "10 - 20 %", min: 10, max: 20, tone: "green" as const },
      { label: "Surpoids", value: "20 - 25 %", min: 20.1, max: 25, tone: "amber" as const },
      { label: "Obesite", value: "> 25 %", min: 25.1, max: Number.POSITIVE_INFINITY, tone: "red" as const }
    ];
  }

  return [
    { label: "Sous-poids", value: "< 20 %", min: Number.NEGATIVE_INFINITY, max: 19.9, tone: "blue" as const },
    { label: "Sain", value: "20 - 30 %", min: 20, max: 30, tone: "green" as const },
    { label: "Surpoids", value: "30 - 35 %", min: 30.1, max: 35, tone: "amber" as const },
    { label: "Obesite", value: "> 35 %", min: 35.1, max: Number.POSITIVE_INFINITY, tone: "red" as const }
  ];
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
