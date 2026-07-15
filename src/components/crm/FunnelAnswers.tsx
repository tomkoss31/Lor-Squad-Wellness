// =============================================================================
// FunnelAnswers — bloc repliable "Ses réponses" (questionnaire funnel
// Opportunité, prospect_leads.metadata.answers) + température/score.
//
// Extrait de CrmPage.tsx (chantier refonte CRM Liste/Pipeline/Fiche détail,
// Phase 2, 2026-07) pour être réutilisé à la fois par le Pipeline (LeadCard)
// et par la nouvelle fiche détail plein écran CrmLeadDetailPage. Comportement
// identique — pur refactor mécanique, aucune règle métier changée.
// =============================================================================

import { useState } from "react";
import { buildFunnelSummary } from "../../lib/opportunityFunnelLabels";

export const TEMP_META: Record<string, { emoji: string; label: string; color: string }> = {
  hot: { emoji: "🔥", label: "Chaud", color: "var(--ls-coral)" },
  warm: { emoji: "🌤️", label: "Tiède", color: "var(--ls-gold)" },
  cold: { emoji: "❄️", label: "Froid", color: "var(--ls-text-muted)" },
};

export function FunnelAnswers({
  answers,
  temperature,
  score,
}: {
  answers: Record<string, string>;
  temperature?: string | null;
  score?: number | null;
}) {
  const [open, setOpen] = useState(false);
  const rows = buildFunnelSummary(answers);
  if (rows.length === 0) return null;
  const temp = temperature ? TEMP_META[temperature] : null;
  return (
    <div style={{ marginTop: 4 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          width: "100%",
          padding: "7px 10px",
          borderRadius: 9,
          border: "1px solid var(--ls-border)",
          background: "var(--ls-surface2)",
          color: "var(--ls-text)",
          fontSize: 12.5,
          fontWeight: 600,
          fontFamily: "DM Sans, sans-serif",
          cursor: "pointer",
        }}
      >
        <span>💬 Ses réponses ({rows.length})</span>
        {temp ? (
          <span style={{ color: temp.color, fontWeight: 700 }}>
            {temp.emoji} {temp.label}
          </span>
        ) : null}
        {typeof score === "number" ? (
          <span style={{ color: "var(--ls-text-hint)", fontWeight: 500 }}>· score {score}</span>
        ) : null}
        <span aria-hidden="true" style={{ marginLeft: "auto", color: "var(--ls-text-hint)", fontSize: 11 }}>
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6, padding: "2px 2px" }}>
          {rows.map((r) => (
            <div key={r.id} style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 12, lineHeight: 1.4 }}>
              <span aria-hidden="true" style={{ flex: "0 0 auto" }}>{r.emoji}</span>
              <span style={{ flex: "0 0 auto", color: "var(--ls-text-hint)", minWidth: 118 }}>{r.question}</span>
              <span style={{ color: "var(--ls-text)", fontWeight: 600 }}>{r.answer}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
