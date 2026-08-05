// =============================================================================
// FormationCalculatorPage — page historique du Strategy Plan (/formation/calculateur).
//
// Le calculateur lui-même a été extrait dans <StrategyPlanCalculator /> (2026-08-04)
// pour être aussi affiché dans l'onglet « Projection 12 mois » du Plan Marketing.
// Cette page reste un point d'entrée (back + titre + le calculateur).
// =============================================================================

import { useNavigate } from "react-router-dom";
import { StrategyPlanCalculator } from "../components/marketing/StrategyPlanCalculator";

export function FormationCalculatorPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100vh", padding: "24px 16px 60px", fontFamily: "DM Sans, sans-serif", background: "var(--ls-bg)", color: "var(--ls-text)" }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <button
          type="button"
          onClick={() => navigate("/plan-marketing")}
          style={{ background: "transparent", border: "0.5px solid var(--ls-border)", color: "var(--ls-text-muted)", padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 500, cursor: "pointer", marginBottom: 24 }}
        >
          ← Plan Marketing
        </button>

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <p style={{ fontSize: 11, color: "var(--ls-teal)", margin: 0, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700 }}>
            ✦ Formule 5-3-1 · La Base 360 · Calibré France
          </p>
          <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(22px, 4vw, 32px)", letterSpacing: "-0.02em", color: "var(--ls-text)", margin: "10px 0 6px 0" }}>
            Strategy Plan —{" "}
            <span style={{ background: "linear-gradient(90deg, var(--ls-teal) 0%, var(--ls-lime) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Projection 12 mois
            </span>
          </h1>
          <p style={{ fontSize: 13, color: "var(--ls-text-muted)", margin: 0 }}>
            Visualise ton plan d&apos;action chiffré sur 12 mois selon ta cadence d&apos;activité.
          </p>
        </div>

        <StrategyPlanCalculator />

        <p style={{ textAlign: "center", marginTop: 28, fontSize: 10, color: "var(--ls-text-hint)", letterSpacing: "0.05em", fontFamily: "DM Sans, sans-serif" }}>
          LA BASE 360 · STRATEGY PLAN CALCULATOR
        </p>
      </div>
    </div>
  );
}
