// =============================================================================
// MetabolicAgeInsightCard — courbe d'évolution de l'âge métabolique
// (chantier 2026-06-04). Calquée sur WeightGoalInsightCard : réutilise
// MetricTrendPanel pour la courbe + les 3 derniers points en repère.
//
// L'âge métabolique reflète la "jeunesse" du métabolisme : l'objectif coach
// est de le faire passer SOUS l'âge réel. On colore en vert quand il est
// inférieur ou égal à l'âge réel, en rouge sinon.
// =============================================================================

import { MetricTrendPanel, type MetricTrendPoint } from "./MetricTrendPanel";
import {
  PedagogicalMetricCard,
  PedagogicalSection,
} from "../education/PedagogicalSection";

export interface MetabolicAgeHistoryPoint {
  date: string;
  metabolicAge: number;
  label?: string;
}

interface MetabolicAgeInsightCardProps {
  /** Âge métabolique du dernier scan (années). */
  current: number;
  /** Âge réel de la personne (années). */
  realAge?: number | null;
  history?: MetabolicAgeHistoryPoint[];
}

export function MetabolicAgeInsightCard({
  current,
  realAge = null,
  history: historyRaw = [],
}: MetabolicAgeInsightCardProps) {
  // Tri chrono + on ne garde que les points renseignés (>0).
  const history = [...historyRaw]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .filter((entry) => entry.metabolicAge > 0);

  const gap = realAge != null ? current - realAge : null; // < 0 = plus jeune (bien)
  const tone: "green" | "red" | "blue" =
    gap == null ? "blue" : gap <= 0 ? "green" : "red";

  const trendPoints: MetricTrendPoint[] = history.map((entry) => ({
    date: entry.date,
    label: entry.label,
    value: entry.metabolicAge,
    secondary:
      realAge == null
        ? "Âge métabolique"
        : entry.metabolicAge <= realAge
          ? `${realAge - entry.metabolicAge} an(s) sous l'âge réel`
          : `${entry.metabolicAge - realAge} an(s) au-dessus`,
  }));

  return (
    <PedagogicalSection
      eyebrow="Lecture body scan"
      title="Âge métabolique"
      subtitle="L'âge que reflète le métabolisme. L'objectif : le faire descendre sous l'âge réel au fil des bilans."
      statusLabel={`${current} ans`}
      statusTone={tone}
      metrics={
        <>
          <PedagogicalMetricCard
            label="Âge métabolique"
            value={`${current} ans`}
            accent={tone}
          />
          {realAge != null ? (
            <PedagogicalMetricCard
              label="Âge réel"
              value={`${realAge} ans`}
              accent="blue"
            />
          ) : null}
          {gap != null ? (
            <PedagogicalMetricCard
              label="Écart"
              value={
                gap === 0
                  ? "Pile à l'âge réel"
                  : gap < 0
                    ? `${Math.abs(gap)} an(s) plus jeune`
                    : `${gap} an(s) de plus`
              }
              note={gap <= 0 ? "Bon signe 💪" : "À travailler"}
              accent={tone}
            />
          ) : null}
          {trendPoints.length >= 2 ? (
            <MetricTrendPanel
              title="Historique âge métabolique"
              subtitle="Toute l'évolution reste visible, avec les 3 derniers points en repère."
              unitLabel="Âge en années"
              points={trendPoints}
              gradientId="metabolic-age-line"
              gradientFrom="#34d399"
              gradientTo="#22d3ee"
              accentClass="border-[rgba(45,212,191,0.18)] bg-[rgba(45,212,191,0.08)]"
              valueSuffix=" ans"
            />
          ) : null}
        </>
      }
    />
  );
}
