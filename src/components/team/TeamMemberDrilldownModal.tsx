// =============================================================================
// TeamMemberDrilldownModal — vue détail d'un membre (2026-05-04)
//
// Modale plein écran (mobile) / centrée (desktop) qui affiche TOUTES les
// métriques d'un seul membre sur 1 vue : XP breakdown + Academy +
// Formation pyramide + Activité 7-30j + Engagement (last_seen, streak).
// CTA vers la fiche distri complète (DistributorPortfolioPage).
// =============================================================================

import { useNavigate } from "react-router-dom";
import {
  STATUS_META,
  type TeamMemberEngagement,
} from "../../hooks/useTeamEngagement";

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

function formatRelative(iso: string | null): string {
  if (!iso) return "Jamais connecté";
  try {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const days = Math.floor(diffMs / (24 * 3600 * 1000));
    if (days === 0) return "Aujourd'hui";
    if (days === 1) return "Hier";
    if (days < 7) return `Il y a ${days} jours`;
    if (days < 30) return `Il y a ${Math.floor(days / 7)} semaines`;
    if (days < 365) return `Il y a ${Math.floor(days / 30)} mois`;
    return `Il y a ${Math.floor(days / 365)} an(s)`;
  } catch {
    return "—";
  }
}

export function TeamMemberDrilldownModal({ member, onClose }: TeamMemberDrilldownModalProps) {
  const navigate = useNavigate();
  if (!member) return null;
  const status = STATUS_META[member.status];

  const handleOpenFiche = () => {
    onClose();
    navigate(`/distributors/${member.user_id}`);
  };

  return (
    <div style={overlayStyle} onClick={onClose} role="dialog" aria-modal="true">
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Close */}
        <button type="button" onClick={onClose} style={closeBtnStyle} aria-label="Fermer">
          ×
        </button>

        {/* Header */}
        <div style={headerStyle}>
          <div style={avatarBigStyle}>{initialsOf(member.name)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={nameStyle}>{member.name}</h2>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
              <span style={subRoleStyle}>
                {member.role === "admin" ? "Admin" : member.role === "referent" ? "Référent" : "Distributeur"}
                {member.current_rank && ` · ${member.current_rank}`}
              </span>
              <span style={statusPillStyle(status.color)}>
                <span aria-hidden="true">{status.emoji}</span>
                {status.label}
              </span>
            </div>
          </div>
        </div>

        {/* Big XP card */}
        <div style={xpBigCardStyle}>
          <div style={{ fontSize: 11, color: "var(--ls-text-muted)", textTransform: "uppercase", letterSpacing: 0.8 }}>
            Engagement total
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4 }}>
            <span style={xpTotalStyle}>{member.xp_total.toLocaleString("fr-FR")}</span>
            <span style={{ fontSize: 13, color: "var(--ls-text-muted)" }}>XP</span>
            <span style={levelBadgeStyle}>Niveau {member.xp_level}</span>
          </div>

          {/* Breakdown XP */}
          <div style={breakdownGridStyle}>
            <BreakdownRow emoji="🎓" label="Academy" value={member.xp_academy} />
            <BreakdownRow emoji="📋" label="Bilans" value={member.xp_bilans} />
            <BreakdownRow emoji="📅" label="RDV" value={member.xp_rdv} />
            <BreakdownRow emoji="💬" label="Messages" value={member.xp_messages} />
            <BreakdownRow emoji="📚" label="Formation" value={member.xp_formation} />
            <BreakdownRow emoji="🔥" label="Connexions" value={member.xp_daily} />
          </div>
        </div>

        {/* Section Apprentissage */}
        <SectionTitle>🎓 Apprentissage</SectionTitle>
        <div style={twoColGrid}>
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
            badge={member.formation_pending > 0 ? `${member.formation_pending} en attente` : undefined}
          />
        </div>

        {/* Section Activité */}
        <SectionTitle>📊 Activité récente</SectionTitle>
        <div style={threeColGrid}>
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

        {/* Section Engagement */}
        <SectionTitle>🔥 Engagement</SectionTitle>
        <div style={twoColGrid}>
          <MetricCard
            title="Dernière connexion"
            primary={formatRelative(member.last_seen_at)}
            secondary={member.last_seen_at ? new Date(member.last_seen_at).toLocaleDateString("fr-FR") : "—"}
            color="var(--ls-text-muted)"
          />
          <MetricCard
            title="Connexions cumulées"
            primary={String(member.lifetime_login_count)}
            secondary={`${member.lifetime_login_count * 5} XP daily`}
            color="var(--ls-coral)"
          />
        </div>

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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 style={sectionTitleStyle}>{children}</h3>;
}

function BreakdownRow({ emoji, label, value }: { emoji: string; label: string; value: number }) {
  return (
    <div style={breakdownRowStyle}>
      <span style={{ fontSize: 14 }} aria-hidden="true">{emoji}</span>
      <span style={{ fontSize: 11, color: "var(--ls-text-muted)", textTransform: "uppercase", letterSpacing: 0.5, flex: 1 }}>
        {label}
      </span>
      <span style={{ fontFamily: "Syne, sans-serif", fontSize: 13, fontWeight: 700, color: "var(--ls-text)" }}>
        {value}
      </span>
    </div>
  );
}

function MetricCard({
  title,
  primary,
  secondary,
  color,
  badge,
}: {
  title: string;
  primary: string;
  secondary?: string;
  color: string;
  badge?: string;
}) {
  return (
    <div style={metricCardStyle(color)}>
      <div style={{ fontSize: 10, color: "var(--ls-text-muted)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ fontFamily: "Syne, sans-serif", fontSize: 18, fontWeight: 700, color: "var(--ls-text)" }}>
        {primary}
      </div>
      {secondary && (
        <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 2 }}>{secondary}</div>
      )}
      {badge && <div style={badgeStyle(color)}>{badge}</div>}
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
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

const modalStyle: React.CSSProperties = {
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

const closeBtnStyle: React.CSSProperties = {
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

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  marginBottom: 18,
  paddingRight: 30,
};

const avatarBigStyle: React.CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: 14,
  background: "linear-gradient(135deg, var(--ls-gold), color-mix(in srgb, var(--ls-gold) 70%, var(--ls-coral)))",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "Syne, sans-serif",
  fontSize: 18,
  fontWeight: 800,
  color: "var(--ls-bg)",
  flexShrink: 0,
};

const nameStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "Syne, sans-serif",
  fontSize: 22,
  fontWeight: 800,
  color: "var(--ls-text)",
};

const subRoleStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
};

const statusPillStyle = (color: string): React.CSSProperties => ({
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

const xpBigCardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 10%, var(--ls-surface)), var(--ls-surface))",
  border: "0.5px solid color-mix(in srgb, var(--ls-gold) 30%, var(--ls-border))",
  borderRadius: 14,
  padding: "16px 18px",
  marginBottom: 18,
};

const xpTotalStyle: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontSize: 32,
  fontWeight: 800,
  color: "var(--ls-gold)",
};

const levelBadgeStyle: React.CSSProperties = {
  marginLeft: "auto",
  padding: "4px 10px",
  borderRadius: 8,
  background: "var(--ls-gold)",
  color: "var(--ls-bg)",
  fontSize: 11,
  fontFamily: "Syne, sans-serif",
  fontWeight: 700,
};

const breakdownGridStyle: React.CSSProperties = {
  marginTop: 14,
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 6,
};

const breakdownRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 8px",
  borderRadius: 8,
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: "0 0 10px",
  fontFamily: "Syne, sans-serif",
  fontSize: 14,
  fontWeight: 700,
  color: "var(--ls-text)",
};

const twoColGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  marginBottom: 18,
};

const threeColGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: 8,
  marginBottom: 18,
};

const metricCardStyle = (color: string): React.CSSProperties => ({
  position: "relative",
  background: `color-mix(in srgb, ${color} 6%, var(--ls-surface))`,
  border: `0.5px solid ${color}`,
  borderRadius: 12,
  padding: "12px 14px",
});

const badgeStyle = (color: string): React.CSSProperties => ({
  display: "inline-block",
  marginTop: 6,
  fontSize: 9,
  padding: "2px 6px",
  borderRadius: 6,
  background: `color-mix(in srgb, ${color} 14%, transparent)`,
  color,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.5,
});

const ctaRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  marginTop: 16,
  flexWrap: "wrap",
};

const primaryBtnStyle: React.CSSProperties = {
  flex: "1 1 auto",
  padding: "12px 18px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg, var(--ls-gold), color-mix(in srgb, var(--ls-gold) 80%, var(--ls-coral)))",
  color: "var(--ls-bg)",
  fontFamily: "Syne, sans-serif",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const ghostBtnStyle: React.CSSProperties = {
  padding: "12px 18px",
  borderRadius: 12,
  border: "0.5px solid var(--ls-border)",
  background: "transparent",
  color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 13,
  cursor: "pointer",
};
