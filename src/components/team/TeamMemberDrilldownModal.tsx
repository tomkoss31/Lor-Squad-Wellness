// =============================================================================
// TeamMemberDrilldownModal — vue détail d'un membre (refactor Chantier #13)
//
// Modale plein écran (mobile) / centrée (desktop) qui affiche TOUTES les
// métriques d'un seul membre. Depuis 2026-05-18 : compose les blocs partages
// distributor-blocks/ (reutilises egalement dans /distributors/:id enrichie).
//
// CTA vers la fiche distri complete (DistributorPortfolioPage).
// =============================================================================

import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import {
  STATUS_META,
  type TeamMemberEngagement,
} from "../../hooks/useTeamEngagement";
import { useAppContext } from "../../context/AppContext";
import {
  ActiviteRecenteBlock,
  ApprentissageBlock,
  CompteActifBlock,
  EngagementBlock,
  EngagementTotalBlock,
  ProgressionRangBlock,
  PvBizworksBlock,
  RangHerbalifeBlock,
} from "../distributor-blocks";
import { RankPinBadge } from "../rank/RankPinBadge";
import type { HerbalifeRank } from "../../types/domain";

interface TeamMemberDrilldownModalProps {
  member: TeamMemberEngagement | null;
  onClose: () => void;
}

function initialsOf(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function TeamMemberDrilldownModal({ member, onClose }: TeamMemberDrilldownModalProps) {
  const navigate = useNavigate();
  const { currentUser, users, refreshAfterFreeze } = useAppContext();

  if (!member) return null;

  const fullUser = users.find((u) => u.id === member.user_id) ?? null;
  const status = STATUS_META[member.status];

  const isAdmin = currentUser?.role === "admin";
  const isSelf = currentUser?.id === member.user_id;
  const canToggleFreeze = isAdmin && !isSelf;
  const canEditRankPv = isAdmin && !isSelf;

  const handleOpenFiche = () => {
    onClose();
    navigate(`/distributors/${member.user_id}`);
  };

  const refresh = async () => {
    await refreshAfterFreeze?.();
  };

  return (
    <div style={overlayStyle} onClick={onClose} role="dialog" aria-modal="true">
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} style={closeBtnStyle} aria-label="Fermer">
          ×
        </button>

        {/* Header */}
        <div style={headerStyle}>
          <div style={avatarBigStyle}>{initialsOf(member.name)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={nameStyle}>{member.name}</h2>
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                marginTop: 6,
                flexWrap: "wrap",
              }}
            >
              <span style={subRoleStyle}>
                {member.role === "admin"
                  ? "Admin"
                  : member.role === "referent"
                    ? "Référent"
                    : "Distributeur"}
              </span>
              {member.current_rank && (
                <RankPinBadge
                  rank={member.current_rank as HerbalifeRank}
                  size="xs"
                  showLabel
                />
              )}
              <span style={statusPillStyle(status.color)}>
                <span aria-hidden="true">{status.emoji}</span>
                {status.label}
              </span>
            </div>
          </div>
        </div>

        {/* Blocs partages */}
        <EngagementTotalBlock member={member} />
        <ApprentissageBlock member={member} />
        <ActiviteRecenteBlock member={member} />
        <EngagementBlock member={member} />

        {canEditRankPv && (
          <>
            <RangHerbalifeBlock
              memberId={member.user_id}
              memberName={member.name}
              fullUser={fullUser}
              onApplied={refresh}
            />
            <ProgressionRangBlock memberId={member.user_id} fullUser={fullUser} />
            <PvBizworksBlock
              memberId={member.user_id}
              memberName={member.name}
              onApplied={refresh}
            />
          </>
        )}

        {canToggleFreeze && (
          <CompteActifBlock
            memberId={member.user_id}
            memberName={member.name}
            fullUser={fullUser}
            onApplied={refresh}
            onAfterToggle={onClose}
          />
        )}

        {/* Footer CTAs */}
        <div style={ctaRowStyle}>
          <button type="button" onClick={handleOpenFiche} style={primaryBtnStyle}>
            Ouvrir la fiche complète →
          </button>
          <button type="button" onClick={onClose} style={ghostBtnStyle}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Styles modale ────────────────────────────────────────────────────────────

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "color-mix(in srgb, var(--ls-bg) 80%, transparent)",
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px 16px",
  overflowY: "auto",
};

const modalStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: 600,
  maxHeight: "calc(100vh - 40px)",
  overflowY: "auto",
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 18,
  padding: "24px 22px",
  boxShadow: "0 24px 72px color-mix(in srgb, var(--ls-text) 20%, transparent)",
};

const closeBtnStyle: CSSProperties = {
  position: "absolute",
  top: 12,
  right: 14,
  width: 32,
  height: 32,
  borderRadius: 10,
  background: "transparent",
  border: "none",
  color: "var(--ls-text-muted)",
  fontSize: 24,
  cursor: "pointer",
  lineHeight: 1,
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  marginBottom: 18,
  paddingRight: 30,
};

const avatarBigStyle: CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: 14,
  background:
    "linear-gradient(135deg, var(--ls-gold), color-mix(in srgb, var(--ls-gold) 70%, var(--ls-coral)))",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "Syne, sans-serif",
  fontSize: 18,
  fontWeight: 800,
  color: "var(--ls-bg)",
  flexShrink: 0,
};

const nameStyle: CSSProperties = {
  margin: 0,
  fontFamily: "Syne, sans-serif",
  fontSize: 22,
  fontWeight: 800,
  color: "var(--ls-text)",
};

const subRoleStyle: CSSProperties = {
  fontSize: 12,
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
};

const statusPillStyle = (color: string): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "3px 9px",
  borderRadius: 8,
  fontSize: 11,
  fontWeight: 600,
  background: `color-mix(in srgb, ${color} 14%, transparent)`,
  color,
  border: `0.5px solid ${color}`,
  fontFamily: "DM Sans, sans-serif",
});

const ctaRowStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  marginTop: 16,
  flexWrap: "wrap",
};

const primaryBtnStyle: CSSProperties = {
  flex: "1 1 auto",
  padding: "12px 18px",
  borderRadius: 12,
  border: "none",
  background:
    "linear-gradient(135deg, var(--ls-gold), color-mix(in srgb, var(--ls-gold) 80%, var(--ls-coral)))",
  color: "var(--ls-bg)",
  fontFamily: "Syne, sans-serif",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const ghostBtnStyle: CSSProperties = {
  padding: "12px 18px",
  borderRadius: 12,
  border: "0.5px solid var(--ls-border)",
  background: "transparent",
  color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 13,
  cursor: "pointer",
};
