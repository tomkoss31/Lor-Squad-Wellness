// =============================================================================
// EngagementBlock — Derniere connexion + Connexions cumulees
// =============================================================================
// Extrait de TeamMemberDrilldownModal (Chantier #13 sous-vague A.1, 2026-05-18).
// =============================================================================

import type { TeamMemberEngagement } from "../../hooks/useTeamEngagement";
import { MetricCard, SectionTitle, formatRelativeFR, twoColGridStyle } from "./_shared";

interface Props {
  member: TeamMemberEngagement;
  hideTitle?: boolean;
}

export function EngagementBlock({ member, hideTitle }: Props) {
  return (
    <>
      {!hideTitle && <SectionTitle>🔥 Engagement</SectionTitle>}
      <div style={twoColGridStyle}>
        <MetricCard
          title="Dernière connexion"
          primary={formatRelativeFR(member.last_seen_at)}
          secondary={
            member.last_seen_at
              ? new Date(member.last_seen_at).toLocaleDateString("fr-FR")
              : "—"
          }
          color="var(--ls-text-muted)"
        />
        <MetricCard
          title="Connexions cumulées"
          primary={String(member.lifetime_login_count)}
          secondary={`${member.lifetime_login_count * 5} XP daily`}
          color="var(--ls-coral)"
        />
      </div>
    </>
  );
}
