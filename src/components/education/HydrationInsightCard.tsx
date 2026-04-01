import { Card } from "../ui/Card";
import { calculateWaterNeed, estimateHydrationKg } from "../../lib/calculations";

interface HydrationInsightCardProps {
  weight: number;
  hydrationPercent: number;
  waterIntake: number;
}

export function HydrationInsightCard({
  weight,
  hydrationPercent,
  waterIntake
}: HydrationInsightCardProps) {
  const targetWater = calculateWaterNeed(weight);
  const hydrationKg = estimateHydrationKg(weight, hydrationPercent);
  const gap = Math.max(Number((targetWater - waterIntake).toFixed(1)), 0);
  const isTargetReached = gap <= 0;
  const progressPercent = Math.min((waterIntake / targetWater) * 100, 100);

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
        />

        <div className="space-y-4">
          <div className="grid gap-3">
            <HydrationValueCard label="Hydratation actuelle" value={`${hydrationPercent} %`} />
            <HydrationValueCard label="Objectif eau" value={`${targetWater} L / jour`} accent="green" />
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

      <div className="grid gap-3 md:grid-cols-3">
        <HydrationPill title="1 L / 30 kg" detail="Un repere simple pour situer le besoin." />
        <HydrationPill title="Sur la journee" detail="Le plus utile reste la regularite, pas la perfection." />
        <HydrationPill
          title="Progression simple"
          detail={
            isTargetReached
              ? "La base est deja bien installee."
              : "Ajouter un peu d'eau a la fois suffit pour avancer."
          }
        />
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

function HydrationPill({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3.5">
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="mt-1 text-[13px] text-slate-400">{detail}</p>
    </div>
  );
}

function HydrationGaugeScene({
  waterIntake,
  targetWater,
  progressPercent
}: {
  waterIntake: number;
  targetWater: number;
  progressPercent: number;
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
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
