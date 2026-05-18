// =============================================================================
// ActiviteRecenteBlock — Bilans 30j + RDV 30j + Messages 7j
// =============================================================================
// Extrait de TeamMemberDrilldownModal (Chantier #13 sous-vague A.1, 2026-05-18).
// =============================================================================

import type { TeamMemberEngagement } from "../../hooks/useTeamEngagement";
import { MetricCard, SectionTitle, threeColGridStyle } from "./_shared";

interface Props {
  member: TeamMemberEngagement;
  hideTitle?: boolean;
}

export function ActiviteRecenteBlock({ member, hideTitle }: Props) {
  return (
    <>
      {!hideTitle && <SectionTitle>📊 Activité récente</SectionTitle>}
      <div style={threeColGridStyle}>
        <MetricCard
          title="Bilans 30j"
          primary={String(member.bilans_30d)}
          secondary="initiaux créés"
          color="var(--ls-teal)"
        />
        <MetricCard
          title="RDV 30j"
          primary={String(member.rdv_30d)}
          secondary="follow-ups planifiés"
          color="var(--ls-gold)"
        />
        <MetricCard
          title="Messages 7j"
          primary={String(member.messages_7d)}
          secondary="envoyés aux clients"
          color="var(--ls-coral)"
        />
      </div>
    </>
  );
}
