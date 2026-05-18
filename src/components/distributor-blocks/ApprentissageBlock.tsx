// =============================================================================
// ApprentissageBlock — Academy + Formation pyramide
// =============================================================================
// Extrait de TeamMemberDrilldownModal (Chantier #13 sous-vague A.1, 2026-05-18).
// =============================================================================

import type { TeamMemberEngagement } from "../../hooks/useTeamEngagement";
import { MetricCard, SectionTitle, twoColGridStyle } from "./_shared";

interface Props {
  member: TeamMemberEngagement;
  hideTitle?: boolean;
}

export function ApprentissageBlock({ member, hideTitle }: Props) {
  return (
    <>
      {!hideTitle && <SectionTitle>🎓 Apprentissage</SectionTitle>}
      <div style={twoColGridStyle}>
        <MetricCard
          title="Academy"
          primary={`${member.academy_step} / 12`}
          secondary={`${member.academy_percent}% complété`}
          color={member.academy_percent >= 100 ? "var(--ls-teal)" : "var(--ls-gold)"}
        />
        <MetricCard
          title="Formation"
          primary={`${member.formation_total_validated} validés`}
          secondary={`N1: ${member.formation_validated_n1} · N2: ${member.formation_validated_n2} · N3: ${member.formation_validated_n3}`}
          color="var(--ls-purple)"
          badge={
            member.formation_pending > 0 ? `${member.formation_pending} en attente` : undefined
          }
        />
      </div>
    </>
  );
}
