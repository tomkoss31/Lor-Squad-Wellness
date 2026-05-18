// =============================================================================
// EngagementTotalBlock — XP total + breakdown 6 categories
// =============================================================================
// Extrait de TeamMemberDrilldownModal (Chantier #13 sous-vague A.1, 2026-05-18).
// Affiche : xp_total + xp_level + breakdown Academy/Bilans/RDV/Messages/
// Formation/Connexions.
// =============================================================================

import type { CSSProperties } from "react";
import type { TeamMemberEngagement } from "../../hooks/useTeamEngagement";
import { BreakdownRow } from "./_shared";

interface Props {
  member: TeamMemberEngagement;
}

export function EngagementTotalBlock({ member }: Props) {
  return (
    <div style={xpBigCardStyle}>
      <div
        style={{
          fontSize: 11,
          color: "var(--ls-text-muted)",
          textTransform: "uppercase",
          letterSpacing: 0.8,
        }}
      >
        Engagement total
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4 }}>
        <span style={xpTotalStyle}>{member.xp_total.toLocaleString("fr-FR")}</span>
        <span style={{ fontSize: 13, color: "var(--ls-text-muted)" }}>XP</span>
        <span style={levelBadgeStyle}>Niveau {member.xp_level}</span>
      </div>
      <div style={breakdownGridStyle}>
        <BreakdownRow emoji="🎓" label="Academy" value={member.xp_academy} />
        <BreakdownRow emoji="📋" label="Bilans" value={member.xp_bilans} />
        <BreakdownRow emoji="📅" label="RDV" value={member.xp_rdv} />
        <BreakdownRow emoji="💬" label="Messages" value={member.xp_messages} />
        <BreakdownRow emoji="📚" label="Formation" value={member.xp_formation} />
        <BreakdownRow emoji="🔥" label="Connexions" value={member.xp_daily} />
      </div>
    </div>
  );
}

const xpBigCardStyle: CSSProperties = {
  background:
    "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 10%, var(--ls-surface)), var(--ls-surface))",
  border: "0.5px solid color-mix(in srgb, var(--ls-gold) 30%, var(--ls-border))",
  borderRadius: 14,
  padding: "16px 18px",
  marginBottom: 18,
};

const xpTotalStyle: CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontSize: 32,
  fontWeight: 800,
  color: "var(--ls-gold)",
};

const levelBadgeStyle: CSSProperties = {
  marginLeft: "auto",
  padding: "4px 10px",
  borderRadius: 8,
  background: "var(--ls-gold)",
  color: "var(--ls-bg)",
  fontSize: 11,
  fontFamily: "Syne, sans-serif",
  fontWeight: 700,
};

const breakdownGridStyle: CSSProperties = {
  marginTop: 14,
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 6,
};
