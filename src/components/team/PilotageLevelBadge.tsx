// =============================================================================
// PilotageLevelBadge — chip du niveau de pilotage d'un distributeur (PR3).
// Lecture pour tous (self+downline+admin via RPC). Si `editable` (admin),
// un petit sélecteur d'override apparaît au clic.
// =============================================================================

import { useState } from "react";
import {
  usePilotageLevel,
  PILOTAGE_LEVELS,
  PILOTAGE_META,
  type PilotageLevel,
} from "../../hooks/usePilotageLevel";

export function PilotageLevelBadge({
  userId,
  editable = false,
}: {
  userId: string | null | undefined;
  editable?: boolean;
}) {
  const { level, loading, setOverride } = usePilotageLevel(userId);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  if (loading || !level) return null;

  const meta = PILOTAGE_META[level];

  async function choose(lvl: PilotageLevel | null) {
    setSaving(true);
    await setOverride(lvl);
    setSaving(false);
    setEditing(false);
  }

  // Non-éditable → <span> (sûr à nicher dans un bouton/lien). Éditable → bouton.
  if (!editable) {
    return (
      <span style={chipStyle(meta.color)} aria-label={`Niveau de pilotage : ${meta.label}`}>
        <span aria-hidden="true">{meta.emoji}</span>
        {meta.label}
      </span>
    );
  }

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 6 }}>
      <button
        type="button"
        onClick={() => setEditing((v) => !v)}
        style={{ ...chipStyle(meta.color), cursor: "pointer" }}
        title="Modifier le niveau (override admin)"
        aria-label={`Niveau de pilotage : ${meta.label}`}
      >
        <span aria-hidden="true">{meta.emoji}</span>
        {meta.label}
        <span style={{ opacity: 0.6, fontSize: 10 }}>▾</span>
      </button>

      {editable && editing ? (
        <div style={editPanel}>
          {PILOTAGE_LEVELS.map((lvl) => (
            <button
              key={lvl}
              type="button"
              disabled={saving}
              onClick={() => void choose(lvl)}
              style={editChoice(PILOTAGE_META[lvl].color, lvl === level)}
            >
              {PILOTAGE_META[lvl].emoji} {PILOTAGE_META[lvl].label}
            </button>
          ))}
          <button
            type="button"
            disabled={saving}
            onClick={() => void choose(null)}
            style={editAuto}
          >
            ↺ Calcul auto
          </button>
        </div>
      ) : null}
    </span>
  );
}

const chipStyle = (color: string): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  fontFamily: "DM Sans, sans-serif",
  color,
  background: `color-mix(in srgb, ${color} 12%, transparent)`,
  border: `0.5px solid color-mix(in srgb, ${color} 45%, transparent)`,
});

const editPanel: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  padding: 8,
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 10,
  maxWidth: 280,
};

const editChoice = (color: string, active: boolean): React.CSSProperties => ({
  padding: "5px 9px",
  borderRadius: 8,
  fontSize: 11.5,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "DM Sans, sans-serif",
  color,
  background: active ? `color-mix(in srgb, ${color} 18%, transparent)` : "var(--ls-surface2)",
  border: `0.5px solid color-mix(in srgb, ${color} ${active ? 60 : 25}%, var(--ls-border))`,
});

const editAuto: React.CSSProperties = {
  padding: "5px 9px",
  borderRadius: 8,
  fontSize: 11.5,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "DM Sans, sans-serif",
  color: "var(--ls-text-muted)",
  background: "var(--ls-surface2)",
  border: "0.5px solid var(--ls-border)",
};
