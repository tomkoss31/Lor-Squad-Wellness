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

  const trendHistory = history.map((entry) => ({
    ...entry,
    kg: estimateBodyFatKg(entry.weight, entry.percent)
  }));
  const recentHistory = trendHistory.slice(-3);
  const shouldShowHistoryPanel =
    trendHistory.length >= 2 || previous != null || initial != null;

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
            accent={bodyFatTone === "amber" ? "red" : bodyFatTone}
          />
          <PedagogicalMetricCard
            label="Equivalent estime"
            value={`${currentKg} kg`}
            accent={bodyFatTone === "amber" ? "red" : bodyFatTone}
          />
          <div className="md:col-span-2 xl:col-span-3 rounded-[24px] border border-white/10 bg-[var(--ls-bg)]/80 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium text-[var(--ls-text-hint)]">Jauge corporelle</p>
                <p className="mt-2 text-sm text-[var(--ls-text-muted)]">
                  Cible {getSexLabel(sex)} : {targetRange.min}-{targetRange.max} %
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-[var(--ls-surface2)] px-3 py-1 text-sm font-semibold text-white">
                {bodyFatBand}
              </span>
            </div>

            <div className="mt-4">
              <div className="relative h-3 rounded-full bg-gradient-to-r from-[#2DD4BF] via-[#C9A84C] to-rose-500">
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
              <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-[var(--ls-text-hint)]">
                {[10, 20, 30, 40, 50].map((value) => (
                  <span key={value}>{value}</span>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[var(--ls-text-hint)]">
                <span className="rounded-full bg-[var(--ls-surface2)] px-2.5 py-1">Zone cible</span>
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
          {shouldShowHistoryPanel ? (
            <div className="md:col-span-2 xl:col-span-3 rounded-[24px] bg-[var(--ls-surface2)] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Historique balance</p>
                  <p className="mt-1 text-xs text-[var(--ls-text-muted)]">
                    Toute la progression reste visible, avec les 3 derniers points en repère.
                  </p>
                </div>
                <p className="text-[11px] font-medium text-[var(--ls-text-hint)]">Progression</p>
              </div>

              {trendHistory.length >= 2 ? <BodyFatProgressChart points={trendHistory} /> : null}

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
          ) : null}
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
  const accent =
    tone === "green"
      ? { rgb: "45,212,191", hex: "var(--ls-teal)" }
      : tone === "blue"
        ? { rgb: "201,168,76", hex: "var(--ls-gold)" }
        : tone === "amber"
          ? { rgb: "245,158,11", hex: "#F59E0B" }
          : { rgb: "251,113,133", hex: "var(--ls-coral)" };

  return (
    <div
      style={{
        borderRadius: 18,
        padding: '12px 14px',
        background: active ? `rgba(${accent.rgb},0.18)` : `rgba(${accent.rgb},0.08)`,
        border: active ? `1.5px solid rgba(${accent.rgb},0.5)` : `1px solid rgba(${accent.rgb},0.2)`,
        boxShadow: active ? `0 4px 14px rgba(${accent.rgb},0.18)` : 'none',
        transition: 'all 0.15s',
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.02em',
          color: accent.hex,
          opacity: active ? 1 : 0.75,
        }}
      >
        {label}
      </p>
      <p
        style={{
          marginTop: 8,
          fontSize: 14,
          fontWeight: 600,
          color: active ? accent.hex : 'var(--ls-text)',
        }}
      >
        {value}
      </p>
    </div>
  );
}

function BodyFatProgressChart({
  points
}: {
  points: Array<{ date: string; label?: string; percent: number; kg: number }>;
}) {
  const max = Math.max(...points.map((point) => point.kg), 1);
  const min = Math.min(...points.map((point) => point.kg), max);
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
      ((point.kg - min) / range) * (height - paddingY * 2);

    return { ...point, x, y };
  });

  const path = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const guideValues = [max, round(min + range / 2), min];

  return (
    <div className="mt-4 rounded-[22px] border border-white/8 bg-[var(--ls-surface2)] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--ls-text-hint)]">
          Courbe recente
        </p>
        <p className="text-xs text-[var(--ls-text-muted)]">Masse grasse en kg</p>
      </div>

      <div className="mt-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-28 w-full overflow-visible">
          <defs>
            <linearGradient id="body-fat-line" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="100%" stopColor="#fdba74" />
            </linearGradient>
          </defs>
          {guideValues.map((value, index) => {
            const y =
              height - paddingY - ((value - min) / range) * (height - paddingY * 2);

            return (
              <g key={`guide-${value}-${index}`}>
                <line
                  x1={paddingX}
                  x2={width - paddingX}
                  y1={y}
                  y2={y}
                  stroke="rgba(148,163,184,0.18)"
                  strokeDasharray="4 6"
                />
                <text
                  x={4}
                  y={y + 4}
                  fill="var(--ls-text-muted)"
                  stroke="var(--ls-surface2)"
                  strokeWidth="2.5"
                  paintOrder="stroke"
                  fontSize="10"
                  fontWeight="500"
                >
                  {value} kg
                </text>
              </g>
            );
          })}
          <path
            d={path}
            fill="none"
            stroke="url(#body-fat-line)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {coordinates.map((point, index) => (
            <g key={`${point.date}-${index}`}>
              <circle
                cx={point.x}
                cy={point.y}
                r="5"
                fill="var(--ls-text)"
                stroke="var(--ls-surface2)"
                strokeWidth="2"
              />
              <text
                x={point.x}
                y={point.y - 10}
                textAnchor="middle"
                fill="var(--ls-text-muted)"
                stroke="var(--ls-surface2)"
                strokeWidth="3"
                paintOrder="stroke"
                fontSize="11"
                fontWeight="700"
              >
                {point.kg} kg
              </text>
            </g>
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
      style={{
        borderRadius: 20,
        padding: 16,
        background: emphasized ? 'rgba(220,38,38,0.08)' : 'var(--ls-surface2)',
        border: `1px solid ${emphasized ? 'rgba(220,38,38,0.25)' : 'var(--ls-border)'}`,
        boxShadow: emphasized ? '0 4px 16px rgba(220,38,38,0.1)' : 'none',
      }}
    >
      <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ls-text-hint)' }}>
        {label}
      </p>
      {dateLabel ? <p style={{ marginTop: 4, fontSize: 12, color: 'var(--ls-text-hint)' }}>{dateLabel}</p> : null}
      <div style={{ marginTop: 16 }}>
        <p style={{ fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.04em', color: 'var(--ls-text)' }}>{kg} kg</p>
        <p style={{ marginTop: 4, fontSize: 14, color: 'var(--ls-text-muted)' }}>{percent} % de masse grasse</p>
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
    <div className="rounded-[22px] bg-[var(--ls-bg)]/60 p-4">
      <p className="text-[11px] font-medium text-[var(--ls-text-hint)]">{title}</p>
      <div className="mt-4 grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-[var(--ls-text-muted)]">Variation en %</span>
          <DeltaValue value={enabled ? percentDelta : 0} suffix=" %" inverseGood />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-[var(--ls-text-muted)]">Variation en kg</span>
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
      ? "bg-[var(--ls-surface2)] text-[var(--ls-text)]"
      : inverseGood
        ? value < 0
          ? "bg-[rgba(45,212,191,0.12)] text-[#2DD4BF]"
          : "bg-rose-400/[0.12] text-rose-200"
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
      { label: "Sec", value: "< 10 %", min: Number.NEGATIVE_INFINITY, max: 9.9, tone: "blue" as const },
      { label: "Sain", value: "10 - 20 %", min: 10, max: 20, tone: "green" as const },
      { label: "Surpoids", value: "20 - 25 %", min: 20.1, max: 25, tone: "amber" as const },
      { label: "Obesite", value: "> 25 %", min: 25.1, max: Number.POSITIVE_INFINITY, tone: "red" as const }
    ];
  }

  return [
    { label: "Sec", value: "< 20 %", min: Number.NEGATIVE_INFINITY, max: 19.9, tone: "blue" as const },
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
    return "Repère sport homme";
  }

  if (sex === "male" && objective === "weight-loss") {
    return "Repère progression homme";
  }

  if (sex === "female" && objective === "sport") {
    return "Repère sport femme";
  }

  if (sex === "female" && objective === "weight-loss") {
    return "Repère progression femme";
  }

  return "Repère corporel general";
}
