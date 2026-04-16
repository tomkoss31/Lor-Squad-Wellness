import {
  getWeightLossPaceInsight,
  getWeightLossPlan
} from "../../lib/calculations";
import { MetricTrendPanel, type MetricTrendPoint } from "../body-scan/MetricTrendPanel";
import {
  PedagogicalMetricCard,
  PedagogicalSection
} from "./PedagogicalSection";

interface WeightGoalInsightCardProps {
  currentWeight: number;
  targetWeight?: number | null;
  timeline: string;
  history?: Array<{ date: string; weight: number; label?: string }>;
}

export function WeightGoalInsightCard({
  currentWeight,
  targetWeight,
  timeline,
  history = []
}: WeightGoalInsightCardProps) {
  const plan = getWeightLossPlan(currentWeight, targetWeight, timeline);
  const pace = getWeightLossPaceInsight(plan);
  const capValue =
    plan.targetWeight == null
      ? "Cible a poser"
      : plan.isAchieved
        ? "Objectif atteint"
        : `${plan.remainingKg} kg a ajuster`;
  const trendPoints: MetricTrendPoint[] = history.map((entry) => ({
    date: entry.date,
    label: entry.label,
    value: entry.weight,
    secondary:
      plan.targetWeight == null
        ? "Repère poids"
        : `${Math.max(Number((entry.weight - plan.targetWeight).toFixed(1)), 0)} kg au-dessus de la cible`
  }));

  return (
    <PedagogicalSection
      eyebrow="Cap client"
      title="Objectif perte de poids"
      subtitle="Un cap simple, une cible claire et une evolution visible dans le temps."
      metrics={
        <>
          <PedagogicalMetricCard label="Poids du jour" value={`${currentWeight} kg`} />
          <PedagogicalMetricCard
            label="Poids cible"
            value={plan.targetWeight == null ? "A definir" : `${plan.targetWeight} kg`}
            accent="green"
          />
          <PedagogicalMetricCard
            label="Cap du moment"
            value={capValue}
            note={pace.label}
            accent={plan.isAchieved ? "green" : "red"}
          />
          {trendPoints.length ? (
            <MetricTrendPanel
              title="Historique balance"
              subtitle="Toute l'evolution du poids reste visible, avec les 3 derniers points en repère."
              unitLabel="Poids en kg"
              points={trendPoints}
              gradientId="weight-line"
              gradientFrom="#38bdf8"
              gradientTo="#22d3ee"
              accentClass="border-[rgba(201,168,76,0.18)] bg-[rgba(201,168,76,0.08)]"
              valueSuffix=" kg"
            />
          ) : null}
          {!trendPoints.length ? (
            <PedagogicalMetricCard
              label="Delai choisi"
              value={timeline}
              note={`${plan.days} jours`}
              accent="blue"
            />
          ) : null}
        </>
      }
    />
  );
}
