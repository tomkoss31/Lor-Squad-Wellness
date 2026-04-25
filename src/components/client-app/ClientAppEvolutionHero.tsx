// Chantier MEGA app client v2 (2026-04-25).
// Hero Évolution — spec figée Thomas. Code chirurgical, copie mockup.

import type { Assessment, Measurement } from "../../lib/clientAppData";
import {
  getStartingAssessment,
  getCurrentAssessment,
  calculateWeightLost,
  calculateTotalCmLost,
  formatLongDate,
} from "../../lib/clientAppData";

interface Props {
  assessments: Assessment[];
  measurements: Measurement[];
}

export function ClientAppEvolutionHero({ assessments, measurements }: Props) {
  const start = getStartingAssessment(assessments);
  const current = getCurrentAssessment(assessments);
  const kgLost = calculateWeightLost(assessments);
  const cmLost = calculateTotalCmLost(measurements);

  if (!start || !current) {
    return null;
  }

  const startWeight = start.bodyScan?.weight ?? 0;
  const currentWeight = current.bodyScan?.weight ?? 0;
  const isSamePoint = assessments.length < 2;

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: "12px",
        padding: "1.5rem 1.25rem",
        marginBottom: "12px",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          color: "#B8922A",
          letterSpacing: "1.5px",
          fontWeight: 500,
          marginBottom: "16px",
        }}
      >
        📊 MA TRANSFORMATION
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          gap: "16px",
          alignItems: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "9px",
              color: "#888",
              letterSpacing: "1px",
              fontWeight: 500,
              marginBottom: "6px",
            }}
          >
            DÉPART
          </div>
          <div
            style={{
              fontSize: "30px",
              color: "#888",
              fontWeight: 500,
              fontFamily: "var(--font-serif)",
              lineHeight: 1,
            }}
          >
            {startWeight.toFixed(1)}
          </div>
          <div style={{ fontSize: "10px", color: "#888", marginTop: "4px" }}>
            {formatLongDate(start.date)}
          </div>
        </div>

        <div style={{ fontSize: "22px", color: "#B8922A" }}>→</div>

        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "9px",
              color: "#B8922A",
              letterSpacing: "1px",
              fontWeight: 500,
              marginBottom: "6px",
            }}
          >
            AUJOURD'HUI
          </div>
          <div
            style={{
              fontSize: "38px",
              color: isSamePoint ? "#888" : "#1D9E75",
              fontWeight: 500,
              fontFamily: "var(--font-serif)",
              lineHeight: 1,
            }}
          >
            {currentWeight.toFixed(1)}
          </div>
          <div style={{ fontSize: "10px", color: "#888", marginTop: "4px" }}>
            {formatLongDate(current.date)}
          </div>
        </div>
      </div>

      {kgLost !== 0 || cmLost > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
            marginTop: "16px",
            paddingTop: "14px",
            borderTop: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              background: "#1D9E75",
              color: "white",
              padding: "10px 12px",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "18px",
                fontWeight: 500,
                fontFamily: "var(--font-serif)",
              }}
            >
              {kgLost > 0
                ? `- ${kgLost.toFixed(1)} kg`
                : `${kgLost.toFixed(1)} kg`}
            </div>
            <div style={{ fontSize: "10px", opacity: 0.9, marginTop: "2px" }}>
              {kgLost > 0 ? "poids perdu" : "évolution"}
            </div>
          </div>
          <div
            style={{
              background: "#B8922A",
              color: "white",
              padding: "10px 12px",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "18px",
                fontWeight: 500,
                fontFamily: "var(--font-serif)",
              }}
            >
              - {cmLost} cm
            </div>
            <div style={{ fontSize: "10px", opacity: 0.9, marginTop: "2px" }}>
              centimètres en moins
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
