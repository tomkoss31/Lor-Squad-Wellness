import { estimateHydrationKg } from "../../lib/calculations";
import { PedagogicalMetricCard, PedagogicalPoint, PedagogicalSection } from "../education/PedagogicalSection";
import type { BiologicalSex } from "../../types/domain";

interface HydrationVisceralInsightCardProps {
  weight: number;
  hydrationPercent: number;
  visceralFat: number;
  sex?: BiologicalSex;
}

export function HydrationVisceralInsightCard({
  weight,
  hydrationPercent,
  visceralFat,
  sex
}: HydrationVisceralInsightCardProps) {
  const hydrationKg = estimateHydrationKg(weight, hydrationPercent);
  const hydrationReference = getHydrationReference(sex);
  const hydrationStatus = getHydrationStatus(hydrationPercent, hydrationReference);
  const visceralStatus = getVisceralFatStatus(visceralFat);

  return (
    <PedagogicalSection
      eyebrow="Lecture body scan"
      title="Hydratation & graisse viscerale"
      subtitle="Lecture directe de l'hydratation corporelle et du niveau de vigilance viscerale."
      statusLabel={`${hydrationPercent} %`}
      statusTone={hydrationStatus.tone}
      metrics={
        <>
          <PedagogicalMetricCard
            label="Hydratation"
            value={`${formatRawNumber(hydrationPercent)} %`}
            note={`${formatRawNumber(hydrationKg)} kg estimes`}
            accent="blue"
          />
          <PedagogicalMetricCard
            label="Graisse viscerale"
            value={formatRawNumber(visceralFat)}
            note={visceralStatus.label}
            accent="red"
          />
          <div className="md:col-span-2 xl:col-span-3 rounded-[24px] bg-white/[0.04] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium text-slate-500">Repere hydratation</p>
                <p className="mt-2 text-sm text-slate-400">
                  Zone moyenne {hydrationReference.min}-{hydrationReference.max} %
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-sm font-semibold text-white">
                {hydrationStatus.label}
              </span>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
              <div className="flex items-center justify-center rounded-[22px] bg-slate-950/28 p-5">
                <div className="relative flex h-[210px] w-[170px] items-center justify-center">
                  <div
                    className="absolute inset-x-3 bottom-0 rounded-b-[88px] rounded-t-[110px] border border-white/10 bg-[linear-gradient(180deg,rgba(56,189,248,0.2),rgba(14,165,233,0.05))]"
                    style={{ height: "100%" }}
                  />
                  <div
                    className="absolute inset-x-6 bottom-4 overflow-hidden rounded-b-[76px] rounded-t-[96px] bg-[rgba(56,189,248,0.08)]"
                    style={{ height: "84%" }}
                  >
                    <div
                      className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,rgba(103,232,249,0.88),rgba(56,189,248,0.92))]"
                      style={{ height: `${Math.max(Math.min((hydrationPercent / 70) * 100, 100), 8)}%` }}
                    />
                  </div>
                  <div className="relative z-10 text-center">
                    <p className="text-[11px] font-medium text-slate-500">Taux du jour</p>
                    <p className="mt-3 text-[2.1rem] font-semibold leading-none text-white">
                      {formatRawNumber(hydrationPercent)} %
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <PedagogicalPoint text={hydrationStatus.description} />
                <div className="grid gap-2 md:grid-cols-3">
                  <HydrationRangeChip
                    label="Sous la moyenne"
                    detail={`< ${hydrationReference.min} %`}
                    active={hydrationPercent < hydrationReference.min}
                  />
                  <HydrationRangeChip
                    label="Zone moyenne"
                    detail={`${hydrationReference.min}-${hydrationReference.max} %`}
                    active={
                      hydrationPercent >= hydrationReference.min &&
                      hydrationPercent <= hydrationReference.max
                    }
                  />
                  <HydrationRangeChip
                    label="Au-dessus"
                    detail={`> ${hydrationReference.max} %`}
                    active={hydrationPercent > hydrationReference.max}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 xl:col-span-3 rounded-[24px] border border-white/10 bg-slate-950/35 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium text-slate-500">Repere visceral</p>
                <p className="mt-2 text-sm text-slate-400">
                  La graisse viscerale merite un repere de vigilance tres simple.
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-sm font-semibold text-white">
                {visceralStatus.label}
              </span>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-3">
              <VisceralRangeChip
                label="0 - 6"
                detail="Repere sain"
                active={visceralStatus.band === "healthy"}
              />
              <VisceralRangeChip
                label="7 - 12"
                detail="Exces modere"
                active={visceralStatus.band === "elevated"}
              />
              <VisceralRangeChip
                label="13+"
                detail="Vigilance renforcee"
                active={visceralStatus.band === "high"}
              />
            </div>
          </div>
        </>
      }
    />
  );
}

function HydrationRangeChip({
  label,
  detail,
  active
}: {
  label: string;
  detail: string;
  active: boolean;
}) {
  return (
    <div className={`rounded-[18px] px-3 py-3 ${active ? "bg-sky-400/10" : "bg-slate-950/24"}`}>
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{detail}</p>
    </div>
  );
}

function VisceralRangeChip({
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
      className={`flex items-center justify-between gap-3 rounded-[18px] px-3 py-3 ${
        active ? "bg-amber-300/10" : "bg-white/[0.03]"
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
      description: "Hydratation a renforcer pour poser une base plus stable.",
      tone: "amber" as const
    };
  }

  if (hydrationPercent > reference.max) {
    return {
      label: "Au-dessus du repere",
      description: "Lecture a relier au contexte global du rendez-vous.",
      tone: "blue" as const
    };
  }

  return {
    label: "Dans la moyenne",
    description: "Lecture situee dans la zone moyenne attendue pour ce profil.",
    tone: "green" as const
  };
}

function getVisceralFatStatus(visceralFat: number) {
  if (visceralFat <= 6) {
    return { label: "Repere sain", band: "healthy" as const };
  }

  if (visceralFat <= 12) {
    return { label: "Exces modere", band: "elevated" as const };
  }

  return { label: "Vigilance renforcee", band: "high" as const };
}

function formatRawNumber(value: number) {
  const rounded = Number(value.toFixed(1));
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
