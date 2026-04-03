import {
  getWeightLossPaceInsight,
  getWeightLossPlan
} from "../../lib/calculations";
import {
  PedagogicalMetricCard,
  PedagogicalSection
} from "./PedagogicalSection";

interface WeightGoalInsightCardProps {
  currentWeight: number;
  targetWeight?: number | null;
  timeline: string;
}

export function WeightGoalInsightCard({
  currentWeight,
  targetWeight,
  timeline
}: WeightGoalInsightCardProps) {
  const plan = getWeightLossPlan(currentWeight, targetWeight, timeline);
  const pace = getWeightLossPaceInsight(plan);

  return (
    <PedagogicalSection
      eyebrow="Cap client"
      title="Objectif perte de poids"
      subtitle="L'objectif devient plus concret quand on le ramene a un cap simple, un delai clair et une progression quotidienne."
      metrics={
        <>
          <PedagogicalMetricCard
            label="Poids actuel"
            value={`${currentWeight} kg`}
          />
          <PedagogicalMetricCard
            label="Poids cible"
            value={plan.targetWeight == null ? "À définir" : `${plan.targetWeight} kg`}
            accent="green"
          />
          <PedagogicalMetricCard
            label="Kilos restants"
            value={
              plan.targetWeight == null
                ? "-"
                : plan.isAchieved
                ? "Objectif atteint"
                  : `${plan.remainingKg} kg`
            }
            accent="red"
          />
          <PedagogicalMetricCard
            label="Delai choisi"
            value={timeline}
            note={`${plan.days} jours`}
          />
          <PedagogicalMetricCard
            label="Rythme moyen"
            value={plan.isAchieved ? "0 g / jour" : `${plan.dailyGrams} g / jour`}
            accent={pace.tone === "red" ? "red" : pace.tone === "green" ? "green" : "blue"}
          />
        </>
      }
    />
  );
}
