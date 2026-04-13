import { Card } from "../ui/Card";
import { MetricTrendPanel } from "../body-scan/MetricTrendPanel";
import { calculateWaterNeed, estimateHydrationKg } from "../../lib/calculations";
import type { BiologicalSex } from "../../types/domain";

interface HydrationInsightCardProps {
  weight: number;
  hydrationPercent: number;
  waterIntake: number;
  sex?: BiologicalSex;
  visceralFat?: number;
  history?: Array<{ date: string; weight: number; hydrationPercent: number; label?: string }>;
}

export function HydrationInsightCard({
  weight,
  hydrationPercent,
  waterIntake,
  sex,
  visceralFat,
  history = []
}: HydrationInsightCardProps) {
  const targetWater = calculateWaterNeed(weight);
  const hydrationKg = estimateHydrationKg(weight, hydrationPercent);
  const gap = Math.max(Number((targetWater - waterIntake).toFixed(1)), 0);
  const isTargetReached = gap <= 0;
  const progressPercent = Math.min((waterIntake / targetWater) * 100, 100);
  const hydrationReference = getHydrationReference(sex);
  const hydrationStatus = getHydrationStatus(hydrationPercent, hydrationReference);
  const visceralStatus = getVisceralFatStatus(visceralFat);
  const trendPoints = history.slice(-3).map((entry) => ({
    date: entry.date,
    label: entry.label,
    value: entry.hydrationPercent,
    secondary: `${estimateHydrationKg(entry.weight, entry.hydrationPercent)} kg estimes`
  }));

  return (
    <Card className="space-y-6 bg-[linear-gradient(180deg,rgba(15,23,42,0.28),rgba(15,23,42,0.5))]">
      <div className="max-w-3xl">
        <p className="eyebrow-label">Repere quotidien</p>
        <h3 className="mt-2 text-[1.9rem] leading-none text-white md:text-[2.1rem]">
          Hydratation
        </h3>
        <p className="mt-3 text-[14px] leading-7 text-[#B0B4C4]">
          Une lecture simple pour voir si le corps tient mieux, plus regulierement, dans la vraie vie.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.02fr_0.98fr] xl:items-start">
        <HydrationGaugeScene
          waterIntake={waterIntake}
          targetWater={targetWater}
          progressPercent={progressPercent}
          hydrationPercent={hydrationPercent}
        />

        <div className="space-y-4">
          <div className="grid gap-3">
            <HydrationValueCard
              label="Hydratation actuelle"
              value={`${hydrationPercent} %`}
              accent={hydrationStatus.label === "Dans la moyenne" ? "green" : "blue"}
            />
            <HydrationValueCard
              label="Objectif eau"
              value={`${targetWater} L / jour`}
              accent="green"
            />
            <HydrationValueCard
              label="Ecart a combler"
              value={isTargetReached ? "Objectif atteint" : `${gap} L / jour`}
              accent="green"
            />
          </div>

          {trendPoints.length ? (
            <MetricTrendPanel
              title="3 derniers releves"
              subtitle="Hydratation recente et lecture plus facile a partager."
              unitLabel="Hydratation en %"
              points={trendPoints}
              gradientId="hydration-line"
              gradientFrom="#38bdf8"
              gradientTo="#67e8f9"
              accentClass="border-[rgba(201,168,76,0.18)] bg-[rgba(201,168,76,0.08)]"
              valueSuffix="%"
            />
          ) : (
            <div className="rounded-[24px] bg-white/[0.04] p-4 md:p-5">
              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
                <HydrationMeta label="Poids actuel" value={`${weight} kg`} />
                <HydrationMeta label="Masse hydrique estimee" value={`${hydrationKg} kg`} />
                <HydrationMeta label="Eau actuelle" value={`${waterIntake} L / jour`} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[24px] bg-white/[0.04] p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-medium text-[#4A5068]">Repere hydratation</p>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-white">
              {hydrationStatus.label}
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <HydrationPill title="Femme" detail="45 a 60 %" highlighted={sex === "female"} />
            <HydrationPill title="Homme" detail="50 a 65 %" highlighted={sex === "male"} />
          </div>
          <p className="mt-4 text-sm leading-6 text-[#7A8099]">{hydrationStatus.description}</p>
        </div>

        <div className="rounded-[24px] bg-white/[0.04] p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-medium text-[#4A5068]">Graisse viscerale</p>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-white">
              {visceralStatus.label}
            </span>
          </div>
          <div className="mt-4 grid gap-2">
            <VisceralRange label="0 - 6" detail="Repere sain" active={visceralStatus.band === "healthy"} tone="green" />
            <VisceralRange label="7 - 12" detail="Excès modere" active={visceralStatus.band === "elevated"} tone="amber" />
            <VisceralRange label="13 - 59" detail="Excès marque" active={visceralStatus.band === "high"} tone="red" />
          </div>
          <p className="mt-4 text-sm leading-6 text-[#7A8099]">
            Plus ce score monte, plus la vigilance metabolique merite un vrai repere simple.
          </p>
        </div>
      </div>
    </Card>
  );
}

function HydrationValueCard({
  label,
  value,
  accent = "blue"
}: {
  label: string;
  value: string;
  accent?: "blue" | "green";
}) {
  return (
    <div className="rounded-[24px] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] p-4 md:p-5">
      <p className="text-[11px] font-medium text-[#4A5068]">{label}</p>
      <p className="mt-4 text-[1.45rem] font-semibold leading-none text-white md:text-[1.6rem]">
        {value}
      </p>
      <div
        className={`mt-4 h-px w-14 ${
          accent === "green" ? "bg-[#2DD4BF]/50" : "bg-[#C9A84C]/50"
        }`}
      />
    </div>
  );
}

function HydrationMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-[#0B0D11]/60 px-4 py-3">
      <p className="text-[11px] font-medium text-[#4A5068]">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-100">{value}</p>
    </div>
  );
}

function HydrationGaugeScene({
  waterIntake,
  targetWater,
  progressPercent,
  hydrationPercent
}: {
  waterIntake: number;
  targetWater: number;
  progressPercent: number;
  hydrationPercent: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-[30px] bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.12),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.18),rgba(15,23,42,0.58))] p-5 md:p-6">
      <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:14px_14px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(125,211,252,0.08),transparent_42%)]" />

      <div className="relative space-y-6">
        <div>
          <p className="text-[11px] font-medium text-[#4A5068]">Rythme hydratation</p>
          <h4 className="mt-2 text-[1.45rem] leading-none text-white md:text-[1.65rem]">
            Jauge de progression
          </h4>
        </div>

        <div className="flex items-center justify-center">
          <div
            className="relative flex h-[230px] w-[230px] items-center justify-center rounded-full border border-white/10 shadow-[0_0_45px_rgba(56,189,248,0.12)] md:h-[270px] md:w-[270px]"
            style={{
              background: `conic-gradient(from 205deg, rgba(56,189,248,0.96) 0deg, rgba(103,232,249,0.9) ${
                progressPercent * 1.8
              }deg, rgba(255,255,255,0.08) ${progressPercent * 1.8}deg, rgba(255,255,255,0.04) 360deg)`
            }}
          >
            <div className="absolute inset-[16px] rounded-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.07),transparent_38%),linear-gradient(180deg,rgba(2,6,23,0.95),rgba(15,23,42,0.92))]" />
            <div className="relative z-10 text-center">
              <p className="text-[11px] font-medium text-[#4A5068]">Eau actuelle</p>
              <p className="mt-3 text-[2.5rem] font-semibold leading-none text-white md:text-[2.9rem]">
                {waterIntake.toFixed(1).replace(".", ",")}
              </p>
              <p className="mt-1 text-sm text-[#7A8099]">L / jour</p>
              <div className="mx-auto mt-5 h-px w-16 bg-[#C9A84C]/25" />
              <p className="mt-4 text-[11px] font-medium text-[#4A5068]">Objectif</p>
              <p className="mt-2 text-lg font-medium text-[#2DD4BF]">
                {targetWater.toFixed(1).replace(".", ",")} L
              </p>
              <p className="mt-4 text-xs text-[#4A5068]">Hydratation balance {hydrationPercent} %</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HydrationPill({
  title,
  detail,
  highlighted = false
}: {
  title: string;
  detail: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-[20px] px-4 py-3.5 ${
        highlighted ? "bg-[rgba(45,212,191,0.1)] ring-1 ring-[rgba(201,168,76,0.2)]" : "bg-white/[0.04]"
      }`}
    >
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="mt-1 text-[13px] text-[#7A8099]">{detail}</p>
    </div>
  );
}

function VisceralRange({
  label,
  detail,
  active,
  tone
}: {
  label: string;
  detail: string;
  active: boolean;
  tone: "green" | "amber" | "red";
}) {
  const activeClass =
    tone === "green"
      ? "bg-[rgba(45,212,191,0.12)] ring-1 ring-[rgba(45,212,191,0.18)]"
      : tone === "amber"
        ? "bg-amber-300/12 ring-1 ring-amber-200/18"
        : "bg-rose-400/12 ring-1 ring-rose-300/18";

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-[18px] px-3 py-3 ${
        active ? activeClass : "bg-[#0B0D11]/60"
      }`}
    >
      <span className="text-sm font-medium text-white">{label}</span>
      <span className="text-sm text-[#7A8099]">{detail}</span>
    </div>
  );
}

function getHydrationReference(sex?: BiologicalSex) {
  if (sex === "male") {
    return { min: 50, max: 65 };
  }

  if (sex === "female") {
    return { min: 45, max: 60 };
  }

  return { min: 45, max: 65 };
}

function getHydrationStatus(
  hydrationPercent: number,
  reference: { min: number; max: number }
) {
  if (hydrationPercent < reference.min) {
    return {
      label: "Sous la moyenne",
      description:
        "En dessous du repere moyen, la fatigue et le manque de confort peuvent vite se faire sentir."
    };
  }

  if (hydrationPercent > reference.max) {
    return {
      label: "Au-dessus du repere",
      description:
        "Au-dessus du repere moyen, la lecture reste simplement a relier au contexte global."
    };
  }

  return {
    label: "Dans la moyenne",
    description: "La lecture se situe dans la zone moyenne attendue pour ce profil."
  };
}

function getVisceralFatStatus(visceralFat?: number) {
  if (visceralFat == null) {
    return { label: "A lire", band: "healthy" as const };
  }

  if (visceralFat <= 6) {
    return { label: "Repere sain", band: "healthy" as const };
  }

  if (visceralFat <= 12) {
    return { label: "Exces modere", band: "elevated" as const };
  }

  return { label: "Exces marque", band: "high" as const };
}
