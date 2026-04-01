import { Card } from "../ui/Card";
import { calculateWaterNeed, estimateHydrationKg } from "../../lib/calculations";
import type { BiologicalSex } from "../../types/domain";

interface HydrationInsightCardProps {
  weight: number;
  hydrationPercent: number;
  waterIntake: number;
  sex?: BiologicalSex;
  visceralFat?: number;
}

export function HydrationInsightCard({
  weight,
  hydrationPercent,
  waterIntake,
  sex,
  visceralFat
}: HydrationInsightCardProps) {
  const targetWater = calculateWaterNeed(weight);
  const hydrationKg = estimateHydrationKg(weight, hydrationPercent);
  const gap = Math.max(Number((targetWater - waterIntake).toFixed(1)), 0);
  const isTargetReached = gap <= 0;
  const progressPercent = Math.min((waterIntake / targetWater) * 100, 100);
  const hydrationReference = getHydrationReference(sex);
  const hydrationStatus = getHydrationStatus(hydrationPercent, hydrationReference);
  const visceralStatus = getVisceralFatStatus(visceralFat);

  return (
    <Card className="space-y-6 bg-[linear-gradient(180deg,rgba(15,23,42,0.28),rgba(15,23,42,0.5))]">
      <div className="max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Repere quotidien</p>
        <h3 className="mt-2 text-[1.9rem] leading-none text-white md:text-[2.1rem]">
          Hydratation
        </h3>
        <p className="mt-3 text-[14px] leading-7 text-slate-300">
          Le corps fonctionne mieux quand l&apos;hydratation est reguliere et adaptee au poids.
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Une bonne hydratation aide souvent a ameliorer l&apos;energie, le confort et la regularite.
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
            <HydrationValueCard label="Hydratation actuelle" value={`${hydrationPercent} %`} />
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

          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 md:p-5">
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
              <HydrationMeta label="Poids actuel" value={`${weight} kg`} />
              <HydrationMeta label="Masse hydrique estimee" value={`${hydrationKg} kg`} />
              <HydrationMeta label="Eau actuelle" value={`${waterIntake} L / jour`} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Repere hydratation
            </p>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-white">
              {hydrationStatus.label}
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <HydrationPill title="Femme" detail="45 a 60 %" highlighted={sex === "female"} />
            <HydrationPill title="Homme" detail="50 a 65 %" highlighted={sex === "male"} />
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-400">{hydrationStatus.description}</p>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Graisse viscerale
            </p>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-white">
              {visceralStatus.label}
            </span>
          </div>
          <div className="mt-4 grid gap-2">
            <VisceralRange label="0 - 6" detail="Repere sain" active={visceralStatus.band === "healthy"} />
            <VisceralRange label="7 - 12" detail="Exces modere" active={visceralStatus.band === "elevated"} />
            <VisceralRange label="13 - 59" detail="Exces marque" active={visceralStatus.band === "high"} />
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-400">
            Plus ce score monte, plus le risque cardiometabolique merite d&apos;etre surveille.
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
    <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] p-4 md:p-5">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-4 text-[1.45rem] font-semibold leading-none text-white md:text-[1.6rem]">
        {value}
      </p>
      <div
        className={`mt-4 h-px w-14 ${
          accent === "green" ? "bg-emerald-300/40" : "bg-sky-300/40"
        }`}
      />
    </div>
  );
}

function HydrationMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-white/8 bg-slate-950/35 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
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
    <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.12),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.18),rgba(15,23,42,0.58))] p-5 md:p-6">
      <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:14px_14px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(125,211,252,0.08),transparent_42%)]" />

      <div className="relative space-y-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Rythme hydratation</p>
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
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Eau actuelle</p>
              <p className="mt-3 text-[2.5rem] font-semibold leading-none text-white md:text-[2.9rem]">
                {waterIntake.toFixed(1).replace(".", ",")}
              </p>
              <p className="mt-1 text-sm text-slate-400">L / jour</p>
              <div className="mx-auto mt-5 h-px w-16 bg-sky-300/25" />
              <p className="mt-4 text-[10px] uppercase tracking-[0.18em] text-slate-500">Objectif</p>
              <p className="mt-2 text-lg font-medium text-sky-100">
                {targetWater.toFixed(1).replace(".", ",")} L
              </p>
              <p className="mt-4 text-xs text-slate-500">Hydratation balance {hydrationPercent} %</p>
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
      className={`rounded-[20px] border px-4 py-3.5 ${
        highlighted
          ? "border-sky-300/20 bg-sky-400/10"
          : "border-white/10 bg-white/[0.04]"
      }`}
    >
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="mt-1 text-[13px] text-slate-400">{detail}</p>
    </div>
  );
}

function VisceralRange({
  label,
  detail,
  active
}: {
  label: string;
  detail: string;
  active: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-[18px] border px-3 py-3 ${
        active
          ? "border-amber-300/20 bg-amber-300/10"
          : "border-white/10 bg-slate-950/35"
      }`}
    >
      <span className="text-sm font-medium text-white">{label}</span>
      <span className="text-sm text-slate-400">{detail}</span>
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
        "Au-dessus du repere moyen, la lecture reste simplement a surveiller avec l'ensemble du contexte."
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
