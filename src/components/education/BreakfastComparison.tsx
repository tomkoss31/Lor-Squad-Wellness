import { Card } from "../ui/Card";
import classicBreakfastVisual from "../../../assets/visuels-pedagogiques/petit-dejeuner-francais-optimized.jpg";
import breakfastSupportVisual from "../../../assets/visuels-pedagogiques/routine-matin-optimized.jpg";
import {
  breakfastFacts,
  breakfastMetricOrder,
  breakfastMetricRanges,
  breakfastProfiles,
  type BreakfastMetricKey,
  type BreakfastMetricRange
} from "../../data/breakfastComparison";

export function BreakfastComparison() {
  return (
    <Card className="space-y-6 bg-[linear-gradient(180deg,rgba(15,23,42,0.28),rgba(15,23,42,0.5))]">
      <div className="max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Repere du matin</p>
        <h3 className="mt-2 text-[1.9rem] leading-none text-white md:text-[2.1rem]">
          Comparer un matin improvise a une routine plus structuree
        </h3>
        <p className="mt-3 text-[14px] leading-7 text-slate-300">
          Le client doit voir vite ce qui change en apports, en hydratation et en regularite.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ImageScenarioCard
          title={breakfastProfiles.classic.title}
          subtitle={breakfastProfiles.classic.subtitle}
          image={classicBreakfastVisual}
          imageAlt="Petit-dejeuner classique"
          points={breakfastProfiles.classic.chips}
        />

        <SupportVisualCard />
      </div>

      <div className="rounded-[24px] border border-white/10 bg-slate-950/35 p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Lecture utile</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Repere configurable selon la routine du matin choisie dans l'app.
            </p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-200">
            Comparatif simple
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {breakfastMetricOrder.map((metricKey) => {
            const metric = breakfastMetricRanges[metricKey];
            return (
              <ComparisonMetricRow
                key={metricKey}
                metricKey={metricKey}
                label={metric.label}
                helper={metric.helper}
                classic={metric.classic}
                structured={metric.structured}
              />
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function ImageScenarioCard({
  title,
  subtitle,
  image,
  imageAlt,
  points
}: {
  title: string;
  subtitle: string;
  image: string;
  imageAlt: string;
  points: string[];
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03]">
      <div className="relative min-h-[320px] bg-slate-950">
        <img
          src={image}
          alt={imageAlt}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.04),rgba(2,6,23,0.14)_45%,rgba(2,6,23,0.58)_100%)]" />
      </div>

      <div className="space-y-4 p-5">
        <div>
          <h4 className="text-[1.5rem] leading-none text-white">{title}</h4>
          <p className="mt-3 text-sm leading-6 text-slate-300">{subtitle}</p>
        </div>
        <div className="grid gap-2">
          {points.map((point) => (
            <div
              key={point}
              className="rounded-[18px] border border-white/8 bg-slate-950/35 px-4 py-3 text-sm text-slate-200"
            >
              {point}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SupportVisualCard() {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03]">
      <div className="relative min-h-[320px] bg-slate-950">
        <img
          src={breakfastSupportVisual}
          alt="Visuel pedagogique petit-dejeuner Lor'Squad"
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.03),rgba(2,6,23,0.08)_40%,rgba(2,6,23,0.52)_100%)]" />
      </div>

      <div className="space-y-4 p-5">
        <div>
          <h4 className="text-[1.5rem] leading-none text-white">
            {breakfastProfiles.structured.title}
          </h4>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            {breakfastProfiles.structured.subtitle}
          </p>
        </div>
        <div className="grid gap-2">
          {breakfastProfiles.structured.chips.map((point) => (
            <div
              key={point}
              className="rounded-[18px] border border-white/8 bg-slate-950/35 px-4 py-3 text-sm text-slate-200"
            >
              {point}
            </div>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {breakfastFacts.map((fact) => (
            <div key={fact.title} className="rounded-[20px] bg-slate-950/24 px-4 py-4">
              <p className="text-sm font-semibold text-white">{fact.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{fact.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ComparisonMetricRow({
  metricKey,
  label,
  helper,
  classic,
  structured
}: {
  metricKey: BreakfastMetricKey;
  label: string;
  helper: string;
  classic: BreakfastMetricRange;
  structured: BreakfastMetricRange;
}) {
  const maxValue = Math.max(classic.max, structured.max, 1);
  const classicWidth = `${(getMetricMidpoint(classic) / maxValue) * 100}%`;
  const structuredWidth = `${(getMetricMidpoint(structured) / maxValue) * 100}%`;
  const classicTone =
    metricKey === "fastSugar" ? "bg-amber-300/85" : metricKey === "hydration" ? "bg-slate-500/75" : "bg-white/70";
  const structuredTone =
    metricKey === "fastSugar" ? "bg-sky-300/80" : metricKey === "hydration" ? "bg-sky-300/90" : "bg-emerald-300/85";

  return (
    <div className="grid gap-3 rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-4 md:grid-cols-[140px_1fr_1fr] md:items-center">
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
        <p className="mt-2 text-xs text-slate-400">{helper}</p>
      </div>

      <ComparisonSide
        title="Classique"
        value={classic.label}
        helper={classic.helper}
        width={classicWidth}
        toneClass={classicTone}
      />

      <ComparisonSide
        title="Routine Lor'Squad"
        value={structured.label}
        helper={structured.helper}
        width={structuredWidth}
        toneClass={structuredTone}
        emphasized
      />
    </div>
  );
}

function ComparisonSide({
  title,
  value,
  helper,
  width,
  toneClass,
  emphasized = false
}: {
  title: string;
  value: string;
  helper: string;
  width: string;
  toneClass: string;
  emphasized?: boolean;
}) {
  return (
    <div className="rounded-[18px] bg-slate-950/24 px-3.5 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-medium text-slate-500">{title}</p>
        <p className={`text-sm font-semibold ${emphasized ? "text-white" : "text-slate-200"}`}>
          {value}
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div className={`h-full rounded-full ${toneClass}`} style={{ width }} />
      </div>
      <p className="mt-2 text-xs text-slate-400">{helper}</p>
    </div>
  );
}

function getMetricMidpoint(range: BreakfastMetricRange) {
  return (range.min + range.max) / 2;
}
