// Chantier Polish Vue complète + refonte bilan (2026-04-24).
// Card résumé perte totale / graisse perdue / muscle repris.
// Gros chiffres 36px teal si progression, gold si stable/régression.
// Fallback "—" si un seul bilan (rien à comparer).

import type { Client } from "../../types/domain";

interface WeightSummaryBlockProps {
  client: Client;
  firstWeight: number | null;
  latestWeight: number | null;
  firstBodyFatPct: number | null;
  latestBodyFatPct: number | null;
  firstMuscleMass: number | null;
  latestMuscleMass: number | null;
  targetWeight: number | null;
}

const TEAL = "#0F6E56";
const GOLD = "#BA7517";

function column({
  label,
  value,
  hint,
  positive,
  hasData,
}: {
  label: string;
  value: string;
  hint: string;
  positive: boolean;
  hasData: boolean;
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 140,
        padding: "4px 8px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ls-text-muted)",
          fontWeight: 700,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 36,
          lineHeight: 1,
          fontWeight: 500,
          fontFamily: "Syne, sans-serif",
          color: hasData ? (positive ? TEAL : GOLD) : "var(--ls-text-muted)",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 12,
          color: "var(--ls-text-muted)",
          lineHeight: 1.35,
        }}
      >
        {hint}
      </div>
    </div>
  );
}

export function WeightSummaryBlock({
  client,
  firstWeight,
  latestWeight,
  firstBodyFatPct,
  latestBodyFatPct,
  firstMuscleMass,
  latestMuscleMass,
  targetWeight,
}: WeightSummaryBlockProps) {
  const hasEvolution =
    firstWeight != null && latestWeight != null && firstWeight !== latestWeight;

  // Perte poids = firstWeight - latestWeight (positif = perdu)
  const weightLoss = hasEvolution ? (firstWeight! - latestWeight!) : null;
  const weightToLose =
    targetWeight != null && firstWeight != null ? firstWeight - targetWeight : null;

  // Graisse perdue en kg : convert % initial → kg, puis % actuel → kg, diff
  const fatKgInitial =
    firstBodyFatPct != null && firstWeight != null
      ? (firstBodyFatPct / 100) * firstWeight
      : null;
  const fatKgLatest =
    latestBodyFatPct != null && latestWeight != null
      ? (latestBodyFatPct / 100) * latestWeight
      : null;
  const fatLossKg = fatKgInitial != null && fatKgLatest != null ? fatKgInitial - fatKgLatest : null;
  const fatPointsLost =
    firstBodyFatPct != null && latestBodyFatPct != null
      ? firstBodyFatPct - latestBodyFatPct
      : null;

  const muscleGainKg =
    firstMuscleMass != null && latestMuscleMass != null
      ? latestMuscleMass - firstMuscleMass
      : null;

  const firstAssessmentCount = client.assessments?.length ?? 0;
  const noComparison = firstAssessmentCount < 2;

  // --- Column 1: Perte totale
  let col1Value = "—";
  let col1Hint = noComparison ? "Premier bilan, en attente d'un second" : "En attente de données";
  let col1Positive = true;
  let col1HasData = false;
  if (weightLoss != null) {
    col1HasData = true;
    if (weightLoss > 0.05) {
      col1Value = `-${weightLoss.toFixed(1)} kg`;
      col1Positive = true;
      col1Hint = weightToLose != null && weightToLose > 0
        ? `sur ${weightToLose.toFixed(1)} kg à perdre`
        : "Depuis le bilan initial";
    } else if (weightLoss < -0.05) {
      col1Value = `+${Math.abs(weightLoss).toFixed(1)} kg`;
      col1Positive = false;
      col1Hint = "À relancer";
    } else {
      col1Value = "Stable";
      col1Positive = false;
      col1Hint = "Pas de mouvement";
    }
  }

  // --- Column 2: Graisse perdue
  let col2Value = "—";
  let col2Hint = noComparison ? "En attente d'un second scan" : "Pas assez de données";
  let col2Positive = true;
  let col2HasData = false;
  if (fatLossKg != null) {
    col2HasData = true;
    if (fatLossKg > 0.05) {
      col2Value = `-${fatLossKg.toFixed(1)} kg`;
      col2Positive = true;
      col2Hint =
        fatPointsLost != null && fatPointsLost > 0
          ? `-${fatPointsLost.toFixed(1)} points depuis le départ`
          : "Depuis le départ";
    } else if (fatLossKg < -0.05) {
      col2Value = `+${Math.abs(fatLossKg).toFixed(1)} kg`;
      col2Positive = false;
      col2Hint = "À relancer";
    } else {
      col2Value = "Stable";
      col2Positive = false;
      col2Hint = "Pas de mouvement";
    }
  }

  // --- Column 3: Muscle repris
  let col3Value = "—";
  let col3Hint = noComparison ? "En attente d'un second scan" : "Pas assez de données";
  let col3Positive = true;
  let col3HasData = false;
  if (muscleGainKg != null) {
    col3HasData = true;
    if (muscleGainKg > 0.05) {
      col3Value = `+${muscleGainKg.toFixed(1)} kg`;
      col3Positive = true;
      col3Hint = "Masse maigre préservée";
    } else if (muscleGainKg < -0.05) {
      col3Value = `-${Math.abs(muscleGainKg).toFixed(1)} kg`;
      col3Positive = false;
      col3Hint = "Attention à la masse maigre";
    } else {
      col3Value = "Stable";
      col3Positive = true;
      col3Hint = "Masse maigre préservée";
    }
  }

  return (
    <div
      style={{
        background: "var(--ls-surface)",
        border: "1px solid var(--ls-border)",
        borderRadius: 18,
        padding: "20px 8px",
        display: "flex",
        alignItems: "stretch",
        gap: 0,
        flexWrap: "wrap",
      }}
    >
      {column({
        label: "Perte totale",
        value: col1Value,
        hint: col1Hint,
        positive: col1Positive,
        hasData: col1HasData,
      })}
      <div
        aria-hidden="true"
        style={{
          width: 1,
          background: "var(--ls-border)",
          margin: "4px 0",
          alignSelf: "stretch",
        }}
      />
      {column({
        label: "Graisse perdue",
        value: col2Value,
        hint: col2Hint,
        positive: col2Positive,
        hasData: col2HasData,
      })}
      <div
        aria-hidden="true"
        style={{
          width: 1,
          background: "var(--ls-border)",
          margin: "4px 0",
          alignSelf: "stretch",
        }}
      />
      {column({
        label: "Muscle repris",
        value: col3Value,
        hint: col3Hint,
        positive: col3Positive,
        hasData: col3HasData,
      })}
    </div>
  );
}
