// =============================================================================
// LearningGrid — progression Academy + Formation par membre (2026-05-04)
//
// Carte par membre avec deux progress bars : Academy (sur 12 sections) et
// Formation pyramide (modules N1/N2/N3 validés). Permet à l'admin (Thomas/
// Mel) de voir d'un coup d'œil qui en est où côté apprentissage.
// =============================================================================

import type { TeamMemberEngagement } from "../../hooks/useTeamEngagement";
import { STATUS_META } from "../../hooks/useTeamEngagement";

interface LearningGridProps {
  members: TeamMemberEngagement[];
  excludeRootId?: string | null;
  onMemberClick?: (memberId: string) => void;
}

// Total modules par niveau (cf. parcours-content.ts) :
// N1 = 7 (M1.1, M1.A, M1.B, M1.C, M1.D, M1.E, M1.F, plus l'EBE legacy 1.6)
// N2 = 5
// N3 = 4
// On utilise des cibles approximatives — l'important c'est le visuel
// progressif, pas le chiffre exact.
const N1_TOTAL = 7;
const N2_TOTAL = 5;
const N3_TOTAL = 4;

function initialsOf(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function LearningGrid({ members, excludeRootId, onMemberClick }: LearningGridProps) {
  const visible = members.filter((m) => !excludeRootId || m.user_id !== excludeRootId);

  if (visible.length === 0) {
    return (
      <div style={emptyStyle}>
        Aucun membre dans ton équipe pour le moment.
      </div>
    );
  }

  return (
    <div style={gridStyle}>
      {visible.map((m) => (
        <LearningCard key={m.user_id} member={m} onClick={() => onMemberClick?.(m.user_id)} />
      ))}
    </div>
  );
}

function LearningCard({
  member,
  onClick,
}: {
  member: TeamMemberEngagement;
  onClick?: () => void;
}) {
  const academyColor =
    member.academy_percent >= 100
      ? "var(--ls-teal)"
      : member.academy_percent >= 50
        ? "var(--ls-gold)"
        : "var(--ls-text-muted)";

  const status = STATUS_META[member.status];

  return (
    <button type="button" onClick={onClick} style={cardStyle}>
      {/* Header : avatar + nom + statut */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={avatarStyle}>{initialsOf(member.name)}</div>
        <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
          <div style={nameStyle}>{member.name}</div>
          <div style={{ fontSize: 10, color: "var(--ls-text-muted)" }}>
            {member.role === "admin" ? "Admin" : member.role === "referent" ? "Référent" : "Distributeur"}
            {member.current_rank && ` · ${member.current_rank}`}
          </div>
        </div>
        <span style={statusBadgeStyle(status.color)}>{status.emoji}</span>
      </div>

      {/* Academy progress */}
      <div style={blockStyle}>
        <div style={blockLabelStyle}>
          <span>🎓 Academy</span>
          <span style={{ color: academyColor, fontWeight: 700 }}>
            {member.academy_step}/12
          </span>
        </div>
        <div style={progressBarBgStyle}>
          <div
            style={{
              ...progressBarFillStyle,
              background: academyColor,
              width: `${Math.min(member.academy_percent, 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Formation pyramide N1 / N2 / N3 */}
      <div style={blockStyle}>
        <div style={blockLabelStyle}>
          <span>📚 Formation</span>
          <span style={{ color: "var(--ls-text-muted)" }}>
            {member.formation_total_validated} validés
            {member.formation_pending > 0 && ` · ${member.formation_pending} en attente`}
          </span>
        </div>
        <div style={pyramidRowStyle}>
          <PyramidStep
            label="N1"
            validated={member.formation_validated_n1}
            total={N1_TOTAL}
            color="var(--ls-gold)"
          />
          <PyramidStep
            label="N2"
            validated={member.formation_validated_n2}
            total={N2_TOTAL}
            color="var(--ls-teal)"
          />
          <PyramidStep
            label="N3"
            validated={member.formation_validated_n3}
            total={N3_TOTAL}
            color="var(--ls-purple)"
          />
        </div>
      </div>

      {/* Footer : XP + Level */}
      <div style={footerStyle}>
        <span style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>
          ⚡ Niv. <strong style={{ color: "var(--ls-text)" }}>{member.xp_level}</strong>
        </span>
        <span style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>
          {member.xp_total.toLocaleString("fr-FR")} XP
        </span>
      </div>
    </button>
  );
}

function PyramidStep({
  label,
  validated,
  total,
  color,
}: {
  label: string;
  validated: number;
  total: number;
  color: string;
}) {
  const ratio = total > 0 ? Math.min(validated / total, 1) : 0;
  return (
    <div style={pyramidStepStyle(ratio > 0 ? color : "var(--ls-border)")}>
      <div style={{ fontSize: 10, fontWeight: 700, color: ratio > 0 ? color : "var(--ls-text-muted)" }}>
        {label}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ls-text)" }}>
        {validated}/{total}
      </div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: 12,
};

const cardStyle: React.CSSProperties = {
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 14,
  padding: "16px 16px",
  cursor: "pointer",
  textAlign: "left",
  transition: "transform 0.18s, box-shadow 0.18s",
  display: "flex",
  flexDirection: "column",
  gap: 0,
};

const avatarStyle: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 11,
  background: "var(--ls-surface2)",
  border: "0.5px solid var(--ls-border)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "Syne, sans-serif",
  fontSize: 12,
  fontWeight: 700,
  color: "var(--ls-text)",
  flexShrink: 0,
};

const nameStyle: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontSize: 14,
  fontWeight: 700,
  color: "var(--ls-text)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const statusBadgeStyle = (color: string): React.CSSProperties => ({
  width: 28,
  height: 28,
  borderRadius: 9,
  background: `color-mix(in srgb, ${color} 14%, var(--ls-surface2))`,
  border: `0.5px solid ${color}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 14,
});

const blockStyle: React.CSSProperties = {
  marginBottom: 10,
};

const blockLabelStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  fontSize: 11,
  fontFamily: "DM Sans, sans-serif",
  color: "var(--ls-text)",
  marginBottom: 6,
  fontWeight: 600,
};

const progressBarBgStyle: React.CSSProperties = {
  width: "100%",
  height: 8,
  background: "var(--ls-surface2)",
  borderRadius: 4,
  overflow: "hidden",
};

const progressBarFillStyle: React.CSSProperties = {
  height: "100%",
  borderRadius: 4,
  transition: "width 0.4s ease",
};

const pyramidRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: 6,
};

const pyramidStepStyle = (color: string): React.CSSProperties => ({
  padding: "8px 6px",
  background: "var(--ls-surface2)",
  border: `0.5px solid ${color}`,
  borderRadius: 8,
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 2,
});

const footerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  paddingTop: 10,
  borderTop: "0.5px solid var(--ls-border)",
};

const emptyStyle: React.CSSProperties = {
  padding: "30px 20px",
  textAlign: "center",
  color: "var(--ls-text-muted)",
  fontSize: 13,
  fontFamily: "DM Sans, sans-serif",
};
