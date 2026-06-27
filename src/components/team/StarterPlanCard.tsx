// =============================================================================
// StarterPlanCard — nudge Co-pilote « Mon démarrage 30 jours » (PR3, priorité 4).
// Visible UNIQUEMENT tant que la recrue n'est pas activée (activated_at NULL).
// =============================================================================

import { useNavigate } from "react-router-dom";
import { useStarterPlan } from "../../hooks/useStarterPlan";

export function StarterPlanCard() {
  const navigate = useNavigate();
  const { doneCount, total, gateDone, gateTotal, activatedAt, loading } = useStarterPlan();

  // Masqué si : en cours de chargement, déjà activé, ou aucune donnée.
  if (loading || activatedAt) return null;

  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <button type="button" onClick={() => navigate("/demarrage")} style={cardStyle}>
      <span style={{ fontSize: 30, flexShrink: 0 }} aria-hidden="true">🚀</span>
      <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
        <div style={titleStyle}>Mon démarrage 30 jours</div>
        <div style={subStyle}>
          {gateDone}/{gateTotal} actions-clés pour devenir « activé » · {doneCount}/{total} au total
        </div>
        <div style={barTrack}>
          <div style={{ ...barFill, width: `${Math.max(3, pct)}%` }} />
        </div>
      </div>
      <span style={ctaStyle}>Continuer →</span>
    </button>
  );
}

const cardStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  width: "100%",
  padding: "14px 16px",
  background:
    "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 14%, var(--ls-surface)), color-mix(in srgb, var(--ls-teal) 10%, var(--ls-surface)))",
  border: "0.5px solid color-mix(in srgb, var(--ls-gold) 40%, var(--ls-border))",
  borderRadius: 14,
  cursor: "pointer",
  fontFamily: "DM Sans, sans-serif",
};

const titleStyle: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontSize: 15,
  fontWeight: 800,
  color: "var(--ls-text)",
  marginBottom: 3,
};

const subStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--ls-text-muted)",
  marginBottom: 8,
};

const barTrack: React.CSSProperties = {
  width: "100%",
  height: 6,
  background: "color-mix(in srgb, var(--ls-text) 10%, transparent)",
  borderRadius: 100,
  overflow: "hidden",
};

const barFill: React.CSSProperties = {
  height: "100%",
  background: "linear-gradient(90deg, var(--ls-teal), var(--ls-gold))",
  borderRadius: 100,
};

const ctaStyle: React.CSSProperties = {
  flexShrink: 0,
  fontSize: 11.5,
  fontWeight: 700,
  letterSpacing: 0.4,
  textTransform: "uppercase",
  color: "var(--ls-gold)",
  whiteSpace: "nowrap",
};
