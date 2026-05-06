// Chantier MEGA app client v2 (2026-04-25) — Rebrand La Base 360 G3 (2026-05-06).
// Hero Accueil refondu avec identite Vital Fusion (emerald/cyan/violet) +
// Sora/Inter au lieu de l'ancien gold #B8922A + serif.

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
          borderRadius: 16,
          padding: "1.25rem",
          marginBottom: 12,
          border: "1px solid #E2E8F0",
          boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Accent bar gauche G3 */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: 4,
            background: "linear-gradient(180deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%)",
          }}
        />
        <div
          style={{
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 10,
            color: "#10B981",
            letterSpacing: "0.18em",
            fontWeight: 700,
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          ✨ Bienvenue dans l'aventure
        </div>
        <div
          style={{
            fontSize: 22,
            color: "#0F172A",
            fontFamily: "Sora, system-ui, sans-serif",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            marginBottom: 6,
            lineHeight: 1.2,
          }}
        >
          Bienvenue 💫
        </div>
        <div
          style={{
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 13,
            color: "#64748B",
            marginBottom: 16,
          }}
        >
          Premier bilan le {formatLongDate(startDate)}
        </div>
        <div
          style={{
            background: "linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%)",
            color: "white",
            padding: "12px 14px",
            borderRadius: 12,
            textAlign: "center",
            fontFamily: "Sora, system-ui, sans-serif",
            fontWeight: 600,
            fontSize: 14,
            marginBottom: 12,
            boxShadow: "0 4px 14px rgba(16,185,129,0.25)",
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
            color: "#10B981",
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 13,
            fontWeight: 600,
            padding: 8,
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
        borderRadius: 16,
        padding: "1.25rem",
        marginBottom: 12,
        border: "1px solid #E2E8F0",
        boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Accent bar gauche G3 */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          bottom: 0,
          width: 4,
          background: "linear-gradient(180deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%)",
        }}
      />
      <div
        style={{
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 10,
          color: "#10B981",
          letterSpacing: "0.18em",
          fontWeight: 700,
          textTransform: "uppercase",
          marginBottom: 12,
        }}
      >
        🎯 Ta transformation
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: showCmBadge ? "1fr 1fr" : "1fr",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #10B981 0%, #06B6D4 100%)",
            color: "white",
            padding: "16px 12px",
            borderRadius: 12,
            textAlign: "center",
            boxShadow: "0 4px 14px rgba(16,185,129,0.20)",
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              fontFamily: "Sora, system-ui, sans-serif",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            {kgLost > 0
              ? `- ${kgLost.toFixed(1)}`
              : `+ ${Math.abs(kgLost).toFixed(1)}`}
          </div>
          <div
            style={{
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 10,
              opacity: 0.92,
              marginTop: 4,
              fontWeight: 500,
              letterSpacing: "0.04em",
            }}
          >
            kg {kgLost > 0 ? "perdus" : "pris"}
          </div>
        </div>
        {showCmBadge ? (
          <div
            style={{
              background: "linear-gradient(135deg, #06B6D4 0%, #8B5CF6 100%)",
              color: "white",
              padding: "16px 12px",
              borderRadius: 12,
              textAlign: "center",
              boxShadow: "0 4px 14px rgba(6,182,212,0.20)",
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                fontFamily: "Sora, system-ui, sans-serif",
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
            >
              - {cmLost}
            </div>
            <div
              style={{
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: 10,
                opacity: 0.92,
                marginTop: 4,
                fontWeight: 500,
                letterSpacing: "0.04em",
              }}
            >
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
          color: "#10B981",
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 12.5,
          fontWeight: 600,
          padding: 8,
          cursor: "pointer",
        }}
      >
        Voir toute mon évolution →
      </button>
    </div>
  );
}
