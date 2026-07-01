// =============================================================================
// LearningGrid — progression APPRENTISSAGE par membre (refonte 2026-06-30).
//
// Carte pilotée par le PARCOURS « La Base Académie » (cockpit onboarding) :
// mini-progression 7 étapes + Jour X/90 + phase + étape en cours + badge.
// Academy (12 sections) + Formation + XP en ligne secondaire compacte.
// L'admin/référent voit d'un coup d'œil où en est chaque recrue dans son
// démarrage RÉEL. Identité reliée au cockpit (accent lime --ls-ops-accent).
// =============================================================================

import type { TeamMemberEngagement } from "../../hooks/useTeamEngagement";
import { useTeamStarterProgress, type MemberAcademy, type AcademyStepState } from "../../hooks/useTeamStarterProgress";

interface LearningGridProps {
  members: TeamMemberEngagement[];
  excludeRootId?: string | null;
  onMemberClick?: (memberId: string) => void;
}

function initialsOf(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function LearningGrid({ members, excludeRootId, onMemberClick }: LearningGridProps) {
  const visible = members.filter((m) => !excludeRootId || m.user_id !== excludeRootId);
  const { byUser } = useTeamStarterProgress();

  if (visible.length === 0) {
    return <div style={emptyStyle}>Aucun membre dans ton équipe pour le moment.</div>;
  }

  return (
    <div style={gridStyle}>
      {visible.map((m) => (
        <LearningCard key={m.user_id} member={m} acad={byUser[m.user_id]} onClick={() => onMemberClick?.(m.user_id)} />
      ))}
    </div>
  );
}

function LearningCard({
  member,
  acad,
  onClick,
}: {
  member: TeamMemberEngagement;
  acad?: MemberAcademy;
  onClick?: () => void;
}) {
  const roleLabel = member.role === "admin" ? "Admin" : member.role === "referent" ? "Référent" : "Distributeur";
  const started = Boolean(acad?.started);

  // Identité v2 : lime = « lancé·e » (win), teal = en cours, muté = pas démarré.
  const badge = !started
    ? { text: "pas démarré", color: "var(--ls-text-muted)" }
    : acad!.activated
      ? { text: "lancé·e ✓", color: "var(--ls-lime)" }
      : { text: `étape ${acad!.activeStepNumber}/7`, color: "var(--ls-teal)" };

  // Ligne meta courte (plus de troncature) : le jour + la phase suffisent ;
  // le rôle passe en micro-chip à côté du nom.
  const sub = started
    ? `Jour ${acad!.dayNumber || 1}/90 · ${acad!.phaseLabel}`
    : member.current_rank || "Pas encore démarré";

  return (
    <button type="button" onClick={onClick} style={cardStyle}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={avatarStyle}>{initialsOf(member.name)}</div>
        <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
          <div style={nameStyle}>{member.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, minWidth: 0 }}>
            <span style={roleChip}>{roleLabel}</span>
            <span style={metaStyle}>{sub}</span>
          </div>
        </div>
        <span style={pillBadge(badge.color)}>{badge.text}</span>
      </div>

      {/* Parcours La Base Académie (héros) */}
      <div style={journeyLabel}>La Base Académie · parcours</div>
      <MiniJourney steps={acad?.steps} />
      <div style={journeyActive}>
        {!started ? (
          "Pas encore démarré son cockpit"
        ) : acad!.activated ? (
          "Activé·e — au rythme (faire faire)"
        ) : (
          <>
            En cours · étape <b style={{ color: "var(--ls-text)" }}>{acad!.activeStepLabel}</b>
          </>
        )}
      </div>

      {/* Secondaire compact : Academy + Formation + XP */}
      <div style={secondaryRow}>
        <span>🎓 Academy <b style={bStrong}>{member.academy_step}/12</b></span>
        <span>📚 Formation <b style={bStrong}>{member.formation_total_validated}</b></span>
        <span>⚡ <b style={bStrong}>{member.xp_total.toLocaleString("fr-FR")} XP</b></span>
      </div>
    </button>
  );
}

function MiniJourney({ steps }: { steps?: AcademyStepState[] }) {
  const s = steps ?? (Array(7).fill("todo") as AcademyStepState[]);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
      {s.flatMap((st, i) => {
        const dot = <StepDot key={`d${i}`} state={st} n={i + 1} />;
        if (i >= s.length - 1) return [dot];
        const conn = (
          <span
            key={`c${i}`}
            style={{ height: 2, flex: 1, margin: "0 3px", background: st === "done" ? "var(--ls-ops-accent)" : "var(--ls-border)" }}
          />
        );
        return [dot, conn];
      })}
    </div>
  );
}

function StepDot({ state, n }: { state: AcademyStepState; n: number }) {
  const done = state === "done";
  const active = state === "active";
  return (
    <span
      style={{
        width: active ? 22 : 18,
        height: active ? 22 : 18,
        borderRadius: "50%",
        flex: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 10,
        fontWeight: 700,
        boxSizing: "border-box",
        boxShadow: active ? "0 0 0 3px rgba(var(--ls-ops-rgb-accent), 0.22)" : "none",
        ...(done || active
          ? { background: "var(--ls-ops-accent)", color: "var(--ls-ops-on-accent)" }
          : { border: "2px solid var(--ls-border)", color: "var(--ls-text-muted)" }),
      }}
    >
      {done ? "✓" : n}
    </span>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
  gap: 12,
};

const cardStyle: React.CSSProperties = {
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 14,
  padding: "16px",
  cursor: "pointer",
  textAlign: "left",
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

const metaStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10,
  letterSpacing: ".03em",
  color: "var(--ls-text-muted)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  minWidth: 0,
};

const roleChip: React.CSSProperties = {
  flexShrink: 0,
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 8.5,
  fontWeight: 700,
  letterSpacing: ".08em",
  textTransform: "uppercase",
  color: "var(--ls-text-muted)",
  background: "var(--ls-surface2)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 5,
  padding: "2px 6px",
};

const pillBadge = (color: string): React.CSSProperties => ({
  background: `color-mix(in srgb, ${color} 14%, transparent)`,
  border: `0.5px solid ${color}`,
  color,
  borderRadius: 8,
  padding: "3px 9px",
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: "nowrap",
  flexShrink: 0,
});

const journeyLabel: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10,
  letterSpacing: ".14em",
  textTransform: "uppercase",
  color: "var(--ls-text-muted)",
  marginBottom: 2,
};

const journeyActive: React.CSSProperties = {
  fontSize: 12.5,
  color: "var(--ls-text-muted)",
  marginTop: 8,
  lineHeight: 1.4,
};

const secondaryRow: React.CSSProperties = {
  display: "flex",
  gap: 14,
  flexWrap: "wrap",
  marginTop: 12,
  paddingTop: 12,
  borderTop: "0.5px solid var(--ls-border)",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11,
  color: "var(--ls-text-muted)",
};

const bStrong: React.CSSProperties = { color: "var(--ls-text)" };

const emptyStyle: React.CSSProperties = {
  padding: "30px 20px",
  textAlign: "center",
  color: "var(--ls-text-muted)",
  fontSize: 13,
  fontFamily: "DM Sans, sans-serif",
};
