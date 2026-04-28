// =============================================================================
// PvActionPlanAlert — bandeau conditionnel sur Co-pilote (2026-04-29)
// =============================================================================
//
// Remplace le PvActionPlanCard complet sur le dashboard. Affiche UNIQUEMENT
// quand le user est "delayed" (sous prorata jour). Sinon, rien — le coach
// va voir le plan complet sur /pv si besoin.
//
// Logique :
//   - status === "delayed" : bandeau coral cliquable -> /pv
//   - status === "on_track" / "ahead" : retourne null (pas d'encombrement)
//   - error / loading : retourne null silencieusement
// =============================================================================

import { Link } from "react-router-dom";
import { usePvActionPlan } from "../../hooks/usePvActionPlan";

interface Props {
  userId: string | null | undefined;
}

export function PvActionPlanAlert({ userId }: Props) {
  const { data, loading, error } = usePvActionPlan(userId);

  if (loading || error || !data) return null;
  if (data.status !== "delayed") return null;

  const totalSuggestions =
    (data.top_dormant?.length ?? 0)
    + (data.restock_due?.length ?? 0)
    + (data.silent_active?.length ?? 0);

  return (
    <Link
      to="/pv"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 16px",
        marginBottom: 16,
        background: "color-mix(in srgb, var(--ls-coral) 8%, var(--ls-surface))",
        border: "0.5px solid color-mix(in srgb, var(--ls-coral) 35%, transparent)",
        borderLeft: "3px solid var(--ls-coral)",
        borderRadius: 12,
        textDecoration: "none",
        color: "var(--ls-text)",
        fontFamily: "DM Sans, sans-serif",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = "0 4px 12px color-mix(in srgb, var(--ls-coral) 18%, transparent)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>🔴</span>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "Syne, serif",
              fontSize: 14,
              fontWeight: 700,
              color: "var(--ls-coral)",
              marginBottom: 2,
            }}
          >
            Tu es en retard PV — {data.current_pv} / {data.prorata_pv} (prorata jour)
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--ls-text-muted)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {totalSuggestions} levier{totalSuggestions > 1 ? "s" : ""} pour rattraper · gain attendu +{data.expected_gain} PV
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          fontWeight: 700,
          color: "var(--ls-coral)",
          flexShrink: 0,
        }}
      >
        Voir plan
        <span style={{ fontSize: 14 }}>→</span>
      </div>
    </Link>
  );
}
