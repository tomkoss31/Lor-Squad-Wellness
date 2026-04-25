// Chantier MEGA app client v2 (2026-04-25).
// Hero Accueil — spec figée validée Thomas. Code chirurgical, pas
// d'interprétation ni d'amélioration. Si besoin d'évolution : nouvelle
// itération explicite.

import type { Assessment, Measurement } from "../../lib/clientAppData";
import {
  calculateWeightLost,
  calculateTotalCmLost,
  formatLongDate,
} from "../../lib/clientAppData";

interface Props {
  assessments: Assessment[];
  measurements: Measurement[];
  programLabel: string;
  startDate: string;
  onSeeEvolution: () => void;
}

export function ClientAppHomeHero({
  assessments,
  measurements,
  programLabel,
  startDate,
  onSeeEvolution,
}: Props) {
  const hasMultipleBilans = assessments.length >= 2;

  if (!hasMultipleBilans) {
    return (
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "12px",
          padding: "1.25rem",
          marginBottom: "12px",
          borderLeft: "4px solid #B8922A",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            color: "#B8922A",
            letterSpacing: "1.5px",
            fontWeight: 500,
            marginBottom: "10px",
          }}
        >
          ✨ BIENVENUE DANS L'AVENTURE
        </div>
        <div
          style={{
            fontSize: "20px",
            color: "#2C2C2A",
            fontFamily: "var(--font-serif)",
            fontWeight: 500,
            marginBottom: "8px",
          }}
        >
          Bienvenue dans l'aventure 💫
        </div>
        <div style={{ fontSize: "13px", color: "#888", marginBottom: "16px" }}>
          Premier bilan le {formatLongDate(startDate)}
        </div>
        <div
          style={{
            background: "#B8922A",
            color: "white",
            padding: "12px",
            borderRadius: "8px",
            textAlign: "center",
            fontWeight: 500,
            fontSize: "14px",
            marginBottom: "12px",
          }}
        >
          {programLabel} activé
        </div>
        <button
          type="button"
          onClick={onSeeEvolution}
          style={{
            display: "block",
            width: "100%",
            textAlign: "center",
            background: "transparent",
            border: "none",
            color: "#B8922A",
            fontSize: "13px",
            fontWeight: 500,
            padding: "8px",
            cursor: "pointer",
          }}
        >
          Voir mon point de départ →
        </button>
      </div>
    );
  }

  const kgLost = calculateWeightLost(assessments);
  const cmLost = calculateTotalCmLost(measurements);
  const showCmBadge = cmLost > 0;

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: "12px",
        padding: "1.25rem",
        marginBottom: "12px",
        borderLeft: "4px solid #B8922A",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          color: "#B8922A",
          letterSpacing: "1.5px",
          fontWeight: 500,
          marginBottom: "12px",
        }}
      >
        🎯 TA TRANSFORMATION
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: showCmBadge ? "1fr 1fr" : "1fr",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        <div
          style={{
            background: "#1D9E75",
            color: "white",
            padding: "14px 12px",
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "26px",
              fontWeight: 500,
              fontFamily: "var(--font-serif)",
              lineHeight: 1,
            }}
          >
            {kgLost > 0
              ? `- ${kgLost.toFixed(1)}`
              : `+ ${Math.abs(kgLost).toFixed(1)}`}
          </div>
          <div style={{ fontSize: "10px", opacity: 0.9, marginTop: "4px" }}>
            kg {kgLost > 0 ? "perdus" : "pris"}
          </div>
        </div>
        {showCmBadge ? (
          <div
            style={{
              background: "#B8922A",
              color: "white",
              padding: "14px 12px",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "26px",
                fontWeight: 500,
                fontFamily: "var(--font-serif)",
                lineHeight: 1,
              }}
            >
              - {cmLost}
            </div>
            <div style={{ fontSize: "10px", opacity: 0.9, marginTop: "4px" }}>
              cm en moins
            </div>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onSeeEvolution}
        style={{
          display: "block",
          width: "100%",
          textAlign: "center",
          background: "transparent",
          border: "none",
          color: "#B8922A",
          fontSize: "12px",
          fontWeight: 500,
          padding: "8px",
          cursor: "pointer",
        }}
      >
        Voir toute mon évolution →
      </button>
    </div>
  );
}
