// Chantier MEGA app client v2 (2026-04-25).
// Grid 2x2 — 4 indicateurs clés (poids/MG/muscle/eau). Spec figée.

import { useState } from "react";
import type { Assessment } from "../../lib/clientAppData";
import {
  getStartingAssessment,
  getCurrentAssessment,
} from "../../lib/clientAppData";
import { ClientMetricChartModal, type MetricDef } from "./ClientMetricChartModal";

interface Props {
  assessments: Assessment[];
}

interface MetricCardProps {
  label: string;
  value: number | undefined;
  unit: string;
  delta: number | null;
  deltaLabel: string;
  color: string;
  onClick?: () => void;
}

function MetricCard({
  label,
  value,
  unit,
  delta,
  deltaLabel,
  color,
  onClick,
}: MetricCardProps) {
  const deltaColor =
    delta === null
      ? "#64748B"
      : delta > 0
        ? "#10B981"
        : delta < 0
          ? "#D85A30"
          : "#64748B";
  const arrow = delta === null ? "" : delta > 0 ? "↑" : delta < 0 ? "↓" : "→";

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      style={{
        background: "#FFFFFF",
        borderRadius: "12px",
        padding: "14px",
        borderTop: `3px solid ${color}`,
        cursor: onClick ? "pointer" : "default",
        position: "relative",
      }}
    >
      {onClick ? (
        <span
          aria-hidden
          style={{ position: "absolute", top: 10, right: 11, fontSize: 13, opacity: 0.5 }}
        >
          📈
        </span>
      ) : null}
      <div
        style={{
          fontSize: "10px",
          color: "#64748B",
          letterSpacing: "1px",
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "26px",
          color,
          fontWeight: 500,
          fontFamily: "'Sora', system-ui, sans-serif",
          margin: "4px 0 2px",
        }}
      >
        {value !== undefined ? value.toFixed(1) : "—"}
        <span style={{ fontSize: "13px", color: "#64748B", fontWeight: 400 }}>
          {" "}
          {unit}
        </span>
      </div>
      <div style={{ fontSize: "12px", color: deltaColor, fontWeight: 500 }}>
        {delta !== null && Math.abs(delta) > 0.01
          ? `${arrow} ${Math.abs(delta).toFixed(1)} ${unit} `
          : `— `}
        <span style={{ color: "#64748B", fontWeight: 400 }}>{deltaLabel}</span>
      </div>
    </div>
  );
}

const METRIC_DEFS: Record<"weight" | "bodyFat" | "muscleMass" | "hydration", MetricDef> = {
  weight: { key: "weight", label: "Poids", unit: "kg", color: "#10B981", decimals: 1 },
  bodyFat: { key: "bodyFat", label: "Masse grasse", unit: "%", color: "#D85A30", decimals: 1 },
  muscleMass: { key: "muscleMass", label: "Muscle", unit: "kg", color: "#10B981", decimals: 1 },
  hydration: { key: "hydration", label: "Eau", unit: "%", color: "#7F77DD", decimals: 1 },
};

export function ClientAppKeyMetricsGrid({ assessments }: Props) {
  const start = getStartingAssessment(assessments);
  const current = getCurrentAssessment(assessments);
  const [selected, setSelected] = useState<MetricDef | null>(null);
  // Au moins 2 bilans → la courbe a du sens, on rend les cartes cliquables.
  const canChart = assessments.length >= 2;

  // Pour poids et masse grasse : delta favorable = perte → start - current.
  const calcLossDelta = (curr?: number, st?: number) => {
    if (curr === undefined || st === undefined) return null;
    return Math.round((st - curr) * 10) / 10;
  };

  const weight = current?.bodyScan?.weight;
  const bodyFat = current?.bodyScan?.bodyFat;
  const muscle = current?.bodyScan?.muscleMass;
  const hydration = current?.bodyScan?.hydration;

  const deltaWeight = calcLossDelta(weight, start?.bodyScan?.weight);
  const deltaBodyFat = calcLossDelta(bodyFat, start?.bodyScan?.bodyFat);
  // Pour muscle et eau : favorable = gain → current - start.
  const deltaMuscle =
    current?.bodyScan?.muscleMass !== undefined &&
    start?.bodyScan?.muscleMass !== undefined
      ? Math.round(
          (current.bodyScan.muscleMass - start.bodyScan.muscleMass) * 10,
        ) / 10
      : null;
  const deltaHydration =
    current?.bodyScan?.hydration !== undefined &&
    start?.bodyScan?.hydration !== undefined
      ? Math.round(
          (current.bodyScan.hydration - start.bodyScan.hydration) * 10,
        ) / 10
      : null;

  return (
    <>
      <div
        style={{
          fontSize: "11px",
          color: "#6B6B6B",
          letterSpacing: "1.5px",
          fontWeight: 500,
          margin: "16px 4px 8px",
        }}
      >
        TES 4 INDICATEURS CLÉS{canChart ? " · touche pour voir la courbe" : ""}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          marginBottom: "8px",
        }}
      >
        <MetricCard
          label="POIDS"
          value={weight}
          unit="kg"
          delta={deltaWeight}
          deltaLabel="depuis le départ"
          color="#10B981"
          onClick={canChart ? () => setSelected(METRIC_DEFS.weight) : undefined}
        />
        <MetricCard
          label="MASSE GRASSE"
          value={bodyFat}
          unit="%"
          delta={deltaBodyFat}
          deltaLabel="depuis le départ"
          color="#D85A30"
          onClick={canChart ? () => setSelected(METRIC_DEFS.bodyFat) : undefined}
        />
        <MetricCard
          label="MUSCLE"
          value={muscle}
          unit="kg"
          delta={deltaMuscle}
          deltaLabel={
            deltaMuscle && deltaMuscle > 0 ? "gagné" : "depuis le départ"
          }
          color="#10B981"
          onClick={canChart ? () => setSelected(METRIC_DEFS.muscleMass) : undefined}
        />
        <MetricCard
          label="EAU"
          value={hydration}
          unit="%"
          delta={deltaHydration}
          deltaLabel={
            deltaHydration && deltaHydration > 0
              ? "en mieux"
              : "depuis le départ"
          }
          color="#7F77DD"
          onClick={canChart ? () => setSelected(METRIC_DEFS.hydration) : undefined}
        />
      </div>

      {selected ? (
        <ClientMetricChartModal
          metric={selected}
          assessments={assessments}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </>
  );
}
