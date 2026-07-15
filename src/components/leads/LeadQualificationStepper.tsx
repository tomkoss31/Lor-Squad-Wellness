// =============================================================================
// LeadQualificationStepper — progression visuelle Nouveau·Contacté·
// Qualifié/RDV·Converti d'un lead CRM.
//
// Chantier refonte CRM Liste/Pipeline/Fiche détail, Phase 2 (2026-07).
// « Perdu » n'est pas une étape du parcours (on ne "progresse" pas vers
// perdu) — affiché comme un badge à part qui remplace le stepper.
// =============================================================================

import { CRM_STATUS_META, type CrmStatus } from "../../hooks/useCrmLeads";

const STEPS: CrmStatus[] = ["new", "contacted", "qualified", "converted"];
const STEP_LABELS: Record<CrmStatus, string> = {
  new: "Nouveau",
  contacted: "Contacté",
  qualified: "Qualifié / RDV",
  converted: "Converti",
  lost: "Perdu",
};

export function LeadQualificationStepper({ status }: { status: CrmStatus }) {
  if (status === "lost") {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 14px",
          borderRadius: 10,
          background: "color-mix(in srgb, var(--ls-text-muted) 10%, var(--ls-surface2))",
          color: "var(--ls-text-muted)",
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        {CRM_STATUS_META.lost.emoji} Perdu — hors pipeline actif
      </div>
    );
  }

  const currentIndex = Math.max(0, STEPS.indexOf(status));

  return (
    <div style={{ display: "flex", alignItems: "flex-start", width: "100%" }}>
      {STEPS.map((s, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        const color = CRM_STATUS_META[s].color;
        const isLast = i === STEPS.length - 1;
        return (
          <div key={s} style={{ display: "flex", alignItems: "flex-start", flex: isLast ? "0 0 auto" : 1 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 0 }}>
              <div
                aria-current={active ? "step" : undefined}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                  color: done || active ? "#fff" : "var(--ls-text-muted)",
                  background: done
                    ? color
                    : active
                      ? color
                      : "var(--ls-surface2)",
                  border: `2px solid ${done || active ? color : "var(--ls-border)"}`,
                  boxShadow: active ? `0 0 0 3px color-mix(in srgb, ${color} 25%, transparent)` : "none",
                  transition: "background 0.15s ease, box-shadow 0.15s ease",
                }}
              >
                {done ? "✓" : i + 1}
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: active ? 700 : 500,
                  color: active ? color : "var(--ls-text-muted)",
                  fontFamily: "DM Sans, sans-serif",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                }}
              >
                {STEP_LABELS[s]}
              </span>
            </div>
            {!isLast ? (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  marginTop: 12,
                  marginLeft: -2,
                  marginRight: -2,
                  background: done ? color : "var(--ls-border)",
                  transition: "background 0.15s ease",
                }}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
