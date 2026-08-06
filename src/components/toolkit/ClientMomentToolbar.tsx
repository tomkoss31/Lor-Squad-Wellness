// =============================================================================
// ClientMomentToolbar — la barre 🧰 « au bon moment » sur la fiche client
// (chantier Boîte à outils, 2026-08-06).
//
// Le bon script, là où le besoin tombe : 1 tap depuis la fiche ouvre l'outil du
// moment avec le contexte client (?client=id → Noaly hérite du contact). L'outil
// pertinent est mis EN AVANT selon le statut lifecycle (pause → Réveiller,
// actif → Suivre, prospect → Inviter). Les autres restent accessibles à droite.
// =============================================================================

import { Link } from "react-router-dom";
import { MOMENT_TOOLS, MOMENT_TOOL_ORDER, pickMomentForLifecycle } from "../../data/momentTools";

export function ClientMomentToolbar({
  clientId,
  lifecycleStatus,
}: {
  clientId: string;
  lifecycleStatus?: string | null;
}) {
  const primaryKey = pickMomentForLifecycle(lifecycleStatus);
  const order = [primaryKey, ...MOMENT_TOOL_ORDER.filter((k) => k !== primaryKey)];

  return (
    <div style={wrap}>
      <div style={label}>🧰 Boîte à outils · au moment de besoin</div>
      <div style={row}>
        {order.map((key) => {
          const def = MOMENT_TOOLS[key];
          if (!def) return null;
          const hot = key === primaryKey;
          return (
            <Link
              key={key}
              to={`${def.path}?client=${clientId}`}
              style={{ ...pill, ...(hot ? pillHot : null) }}
              title={def.blurb}
            >
              <span style={pillIcon} aria-hidden="true">
                {def.icon}
              </span>
              <span style={pillLabel}>{def.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

const wrap: React.CSSProperties = { marginTop: 14 };
const label: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fontSize: 9.5,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  color: "var(--ls-text-hint)",
  marginBottom: 8,
  display: "flex",
  alignItems: "center",
  gap: 6,
};
const row: React.CSSProperties = {
  display: "flex",
  gap: 8,
  overflowX: "auto",
  paddingBottom: 4,
  WebkitOverflowScrolling: "touch",
};
const pill: React.CSSProperties = {
  flex: "0 0 auto",
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  background: "var(--ls-surface2)",
  border: "1px solid var(--ls-border)",
  borderRadius: 12,
  padding: "9px 13px",
  textDecoration: "none",
  color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 13,
  fontWeight: 600,
  whiteSpace: "nowrap",
  transition: ".15s",
};
const pillHot: React.CSSProperties = {
  border: "1px solid color-mix(in srgb, var(--ls-teal) 45%, transparent)",
  background: "color-mix(in srgb, var(--ls-teal) 12%, var(--ls-surface2))",
  color: "var(--ls-teal)",
};
const pillIcon: React.CSSProperties = { fontSize: 15, lineHeight: 1 };
const pillLabel: React.CSSProperties = {};
