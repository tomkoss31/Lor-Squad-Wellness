import { estimateHydrationKg } from "../../lib/calculations";
import { PedagogicalMetricCard, PedagogicalPoint, PedagogicalSection } from "../education/PedagogicalSection";
import { MetricTrendPanel } from "./MetricTrendPanel";
import type { BiologicalSex } from "../../types/domain";

interface HydrationVisceralInsightCardProps {
  weight: number;
  hydrationPercent: number;
  visceralFat: number;
  sex?: BiologicalSex;
  history?: Array<{
    date: string;
    weight: number;
    hydrationPercent: number;
    visceralFat: number;
    label?: string;
  }>;
}

export function HydrationVisceralInsightCard({
  weight,
  hydrationPercent,
  visceralFat,
  sex,
  history = []
}: HydrationVisceralInsightCardProps) {
  const hydrationKg = estimateHydrationKg(weight, hydrationPercent);
  const hydrationReference = getHydrationReference(sex);
  const hydrationStatus = getHydrationStatus(hydrationPercent, hydrationReference);
  const visceralStatus = getVisceralFatStatus(visceralFat);
  const hydrationTrendPoints = history.map((entry) => ({
    date: entry.date,
    label: entry.label,
    value: Number(entry.hydrationPercent.toFixed(1)),
    secondary: `${formatRawNumber(estimateHydrationKg(entry.weight, entry.hydrationPercent))} kg estimes`
  }));
  const visceralTrendPoints = history.map((entry) => ({
    date: entry.date,
    label: entry.label,
    value: Number(entry.visceralFat.toFixed(1)),
    secondary: `Score visceral ${formatRawNumber(entry.visceralFat)}`
  }));

  return (
    <PedagogicalSection
      eyebrow="Lecture body scan"
      title="Hydratation & graisse viscérale"
      subtitle="Lecture directe de l'hydratation corporelle et du niveau de vigilance viscérale."
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
            label="Graisse viscérale"
            value={formatRawNumber(visceralFat)}
            note={visceralStatus.label}
            accent="red"
          />
          <div className="md:col-span-2 xl:col-span-3 rounded-[24px] bg-white/[0.04] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium text-[#4A5068]">Repère hydratation</p>
                <p className="mt-2 text-sm text-[#7A8099]">
                  Zone moyenne {hydrationReference.min}-{hydrationReference.max} %
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-sm font-semibold text-white">
                {hydrationStatus.label}
              </span>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
              <div className="flex items-center justify-center rounded-[22px] bg-[#1A1E27] p-5">
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
                    <p className="text-[11px] font-medium text-[#4A5068]">Taux du jour</p>
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

          <div className="md:col-span-2 xl:col-span-3 rounded-[24px] border border-white/10 bg-[#0B0D11]/80 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium text-[#4A5068]">Repère viscéral</p>
                <p className="mt-2 text-sm text-[#7A8099]">
                  La graisse viscérale mérite un repère de vigilance très simple.
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-sm font-semibold text-white">
                {visceralStatus.label}
              </span>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-3">
              <VisceralRangeChip
                label="0 - 6"
                detail="Repère sain"
                tone="green"
                active={visceralStatus.band === "healthy"}
              />
              <VisceralRangeChip
                label="7 - 12"
                detail="Excès modéré"
                tone="amber"
                active={visceralStatus.band === "elevated"}
              />
              <VisceralRangeChip
                label="13+"
                detail="Vigilance renforcee"
                tone="red"
                active={visceralStatus.band === "high"}
              />
            </div>
          </div>

          {hydrationTrendPoints.length ? (
            <MetricTrendPanel
              title="Historique balance"
              subtitle="Toute l'evolution de l'hydratation reste visible, avec les 3 derniers points en repere."
              unitLabel="Hydratation en %"
              points={hydrationTrendPoints}
              gradientId="hydration-balance-line"
              gradientFrom="#38bdf8"
              gradientTo="#67e8f9"
              accentClass="border-[rgba(201,168,76,0.18)] bg-[rgba(201,168,76,0.08)]"
              valueSuffix="%"
            />
          ) : null}

          {visceralTrendPoints.length ? (
            <MetricTrendPanel
              title="Historique graisse viscerale"
              subtitle="Tous les points balance restent visibles pour suivre la vigilance dans le temps."
              unitLabel="Graisse viscerale"
              points={visceralTrendPoints}
              gradientId="visceral-balance-line"
              gradientFrom="#fb7185"
              gradientTo="#fdba74"
              accentClass="border-rose-300/18 bg-rose-400/[0.08]"
            />
          ) : null}
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
    <div className={`rounded-[18px] px-3 py-3 ${active ? "bg-[rgba(45,212,191,0.1)]" : "bg-[#0B0D11]/60"}`}>
      <p className="text-[11px] font-medium text-[#4A5068]">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{detail}</p>
    </div>
  );
}

function VisceralRangeChip({
  label,
  detail,
  tone,
  active
}: {
  label: string;
  detail: string;
  tone: "green" | "amber" | "red";
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
      className={`flex items-center justify-between gap-3 rounded-[18px] px-3 py-3 ${
        active ? palette.active : palette.base
      }`}
    >
      <span className="text-sm font-medium text-white">{label}</span>
      <span className={`text-sm ${active ? palette.label : "text-[#7A8099]"}`}>{detail}</span>
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
      label: "Au-dessus du repère",
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
    return { label: "Repère sain", band: "healthy" as const };
  }

  if (visceralFat <= 12) {
    return { label: "Excès modéré", band: "elevated" as const };
  }

  return { label: "Vigilance renforcee", band: "high" as const };
}

function formatRawNumber(value: number) {
  const rounded = Number(value.toFixed(1));
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
