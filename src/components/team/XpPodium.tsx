// =============================================================================
// XpPodium — top 3 membres par XP totaux (2026-05-04)
//
// Remplace le AcademyLeaderboard sur /team. Affiche les 3 distri les plus
// engagés (XP totaux), avec hiérarchie visuelle pyramide (1er au centre,
// 2ème à gauche, 3ème à droite). Click → ouvre la modale détail.
// =============================================================================

import type { TeamMemberEngagement } from "../../hooks/useTeamEngagement";

interface XpPodiumProps {
  members: TeamMemberEngagement[];
  /** Filtre out le root admin pour ne montrer que les membres "subordonnés". */
  excludeRootId?: string | null;
  onMemberClick?: (memberId: string) => void;
}

function initialsOf(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function XpPodium({ members, excludeRootId, onMemberClick }: XpPodiumProps) {
  // On exclut le root (l'admin lui-même) du podium si demandé
  const ranked = [...members]
    .filter((m) => !excludeRootId || m.user_id !== excludeRootId)
    .sort((a, b) => b.xp_total - a.xp_total);

  if (ranked.length === 0) {
    return (
      <div style={emptyBox}>
        Aucun membre dans ton équipe pour le moment.
      </div>
    );
  }

  const top3 = ranked.slice(0, 3);
  // Ordre d'affichage podium : [2ème, 1er, 3ème]
  const podiumOrder: Array<{ member: TeamMemberEngagement; rank: 1 | 2 | 3 } | null> = [
    top3[1] ? { member: top3[1], rank: 2 } : null,
    top3[0] ? { member: top3[0], rank: 1 } : null,
    top3[2] ? { member: top3[2], rank: 3 } : null,
  ];

  return (
    <div style={wrapStyle}>
      <div style={podiumGridStyle}>
        {podiumOrder.map((slot, i) => {
          if (!slot) return <div key={`empty-${i}`} />;
          return (
            <PodiumSlot
              key={slot.member.user_id}
              member={slot.member}
              rank={slot.rank}
              onClick={() => onMemberClick?.(slot.member.user_id)}
            />
          );
        })}
      </div>
    </div>
  );
}

interface PodiumSlotProps {
  member: TeamMemberEngagement;
  rank: 1 | 2 | 3;
  onClick?: () => void;
}

function PodiumSlot({ member, rank, onClick }: PodiumSlotProps) {
  const isFirst = rank === 1;
  const heightFactor = rank === 1 ? 1 : rank === 2 ? 0.78 : 0.62;
  const accent =
    rank === 1
      ? "var(--ls-gold)"
      : rank === 2
        ? "color-mix(in srgb, var(--ls-text-muted) 60%, var(--ls-text))"
        : "var(--ls-coral)";
  const medalEmoji = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";
  const crownEmoji = isFirst ? "👑" : null;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...slotBtnStyle,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {/* Avatar circulaire */}
      <div style={{ position: "relative" }}>
        {crownEmoji && (
          <div
            style={{
              position: "absolute",
              top: -22,
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: 22,
            }}
          >
            {crownEmoji}
          </div>
        )}
        <div style={avatarCircleStyle(accent, isFirst)}>
          {initialsOf(member.name)}
        </div>
      </div>

      {/* Nom + role */}
      <div style={{ marginTop: 10, textAlign: "center" }}>
        <div style={nameStyle}>{member.name}</div>
        <div style={roleStyle}>
          {member.role === "admin" ? "Admin" : member.role === "referent" ? "Référent" : "Distributeur"}
        </div>
      </div>

      {/* Marche du podium */}
      <div
        style={{
          ...stepBlockStyle(accent),
          height: 110 * heightFactor,
          marginTop: 14,
        }}
      >
        <div style={medalStyle}>{medalEmoji}</div>
        <div style={xpValueStyle(accent)}>
          {member.xp_total.toLocaleString("fr-FR")}
          <span style={{ fontSize: 11, color: "var(--ls-text-muted)", fontWeight: 400, marginLeft: 4 }}>
            XP
          </span>
        </div>
        <div style={levelStyle}>Niveau {member.xp_level}</div>
      </div>
    </button>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const wrapStyle: React.CSSProperties = {
  padding: "8px 0",
};

const podiumGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: 12,
  alignItems: "end",
  maxWidth: 560,
  margin: "0 auto",
};

const slotBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  padding: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  width: "100%",
};

const avatarCircleStyle = (accent: string, isFirst: boolean): React.CSSProperties => ({
  width: isFirst ? 76 : 60,
  height: isFirst ? 76 : 60,
  borderRadius: "50%",
  background: `radial-gradient(circle at 30% 30%, color-mix(in srgb, ${accent} 30%, var(--ls-surface2)), var(--ls-surface))`,
  border: `2px solid ${accent}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "Syne, sans-serif",
  fontSize: isFirst ? 22 : 18,
  fontWeight: 800,
  color: "var(--ls-text)",
  boxShadow: isFirst ? `0 8px 28px color-mix(in srgb, ${accent} 35%, transparent)` : "none",
});

const nameStyle: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontSize: 14,
  fontWeight: 700,
  color: "var(--ls-text)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: 130,
};

const roleStyle: React.CSSProperties = {
  fontSize: 10,
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
  textTransform: "uppercase",
  letterSpacing: 0.6,
  marginTop: 2,
};

const stepBlockStyle = (accent: string): React.CSSProperties => ({
  width: "100%",
  background: `color-mix(in srgb, ${accent} 14%, var(--ls-surface))`,
  border: `0.5px solid ${accent}`,
  borderRadius: 14,
  padding: "12px 8px 14px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 4,
});

const medalStyle: React.CSSProperties = {
  fontSize: 22,
};

const xpValueStyle = (accent: string): React.CSSProperties => ({
  fontFamily: "Syne, sans-serif",
  fontSize: 18,
  fontWeight: 800,
  color: accent,
});

const levelStyle: React.CSSProperties = {
  fontSize: 10,
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
  textTransform: "uppercase",
  letterSpacing: 0.6,
};

const emptyBox: React.CSSProperties = {
  padding: "30px 20px",
  textAlign: "center",
  color: "var(--ls-text-muted)",
  fontSize: 13,
  fontFamily: "DM Sans, sans-serif",
};
