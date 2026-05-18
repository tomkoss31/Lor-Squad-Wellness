// =============================================================================
// distributor-blocks / _shared — primitives + styles reutilisables
// =============================================================================
// Extrait de TeamMemberDrilldownModal (Chantier #13 sous-vague A.1, 2026-05-18).
// Ces primitives sont utilisees par tous les blocs distri partages entre la
// modale drill-down (/team) et la page enrichie (/distributors/:id).
// =============================================================================

import type { CSSProperties, ReactNode } from "react";

// ─── Section title (h3 Syne) ──────────────────────────────────────────────────
export function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 style={sectionTitleStyle}>{children}</h3>;
}

// ─── Breakdown row (XP card) ─────────────────────────────────────────────────
export function BreakdownRow({
  emoji,
  label,
  value,
}: {
  emoji: string;
  label: string;
  value: number;
}) {
  return (
    <div style={breakdownRowStyle}>
      <span style={{ fontSize: 14 }} aria-hidden="true">
        {emoji}
      </span>
      <span
        style={{
          fontSize: 11,
          color: "var(--ls-text-muted)",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          flex: 1,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "Syne, sans-serif",
          fontSize: 13,
          fontWeight: 700,
          color: "var(--ls-text)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Metric card (Apprentissage / Activite / Engagement) ─────────────────────
export function MetricCard({
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
      <div
        style={{
          fontSize: 10,
          color: "var(--ls-text-muted)",
          textTransform: "uppercase",
          letterSpacing: 0.6,
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: "Syne, sans-serif",
          fontSize: 18,
          fontWeight: 700,
          color: "var(--ls-text)",
        }}
      >
        {primary}
      </div>
      {secondary && (
        <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 2 }}>
          {secondary}
        </div>
      )}
      {badge && <div style={badgeStyle(color)}>{badge}</div>}
    </div>
  );
}

// ─── PV tier row (bloc PV Bizworks, input + star toggle VIP optionnel) ──────
export function PvTierRow({
  label,
  tip,
  value,
  onChange,
  vipFlag,
  onToggleVip,
}: {
  label: string;
  tip: string;
  value: string;
  onChange: (v: string) => void;
  vipFlag?: boolean;
  onToggleVip?: () => void;
}) {
  const hasToggle = typeof onToggleVip === "function";
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      {hasToggle ? (
        <button
          type="button"
          onClick={onToggleVip}
          aria-label={
            vipFlag
              ? "VIP — clique pour passer en Distri"
              : "Distri — clique pour passer en VIP"
          }
          title={
            vipFlag
              ? "VIP — clique pour passer en Distri"
              : "Distri — clique pour passer en VIP"
          }
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: 16,
            padding: 0,
            width: 22,
            opacity: vipFlag ? 1 : 0.4,
            color: vipFlag ? "var(--ls-gold)" : "var(--ls-text-muted)",
          }}
        >
          {vipFlag ? "⭐" : "☆"}
        </button>
      ) : (
        <span style={{ width: 22 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            color: "var(--ls-text)",
            fontFamily: "Inter, system-ui, sans-serif",
            fontWeight: 500,
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: 10, color: "var(--ls-text-muted)" }}>{tip}</div>
      </div>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        style={{
          width: 90,
          padding: "7px 10px",
          borderRadius: 8,
          border: "1px solid var(--ls-border)",
          background: "var(--ls-surface)",
          color: "var(--ls-text)",
          fontSize: 13,
          fontFamily: "Inter, system-ui, sans-serif",
          textAlign: "right",
        }}
      />
    </div>
  );
}

// ─── Helpers format ──────────────────────────────────────────────────────────
export function formatRelativeFR(iso: string | null): string {
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

// ─── Brand gradient action button (réutilisé Rang / PV) ──────────────────────
export function PrimaryActionButton({
  label,
  onClick,
  disabled,
  busy,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      style={{
        padding: "9px 14px",
        borderRadius: 10,
        border: "none",
        background:
          busy || disabled
            ? "var(--ls-surface2)"
            : "linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%)",
        color: busy || disabled ? "var(--ls-text-muted)" : "#FFFFFF",
        fontSize: 12,
        fontWeight: 700,
        fontFamily: "Sora, system-ui, sans-serif",
        cursor: busy ? "wait" : disabled ? "default" : "pointer",
      }}
    >
      {busy ? "…" : label}
    </button>
  );
}

// ─── Card admin standard (wrapper consistent) ────────────────────────────────
export function AdminCard({
  children,
  highlighted,
  style,
}: {
  children: ReactNode;
  highlighted?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 12,
        background: highlighted
          ? "color-mix(in srgb, var(--ls-teal) 6%, var(--ls-surface2))"
          : "var(--ls-surface2)",
        border: highlighted
          ? "1px solid color-mix(in srgb, var(--ls-teal) 30%, transparent)"
          : "1px solid var(--ls-border)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── Styles partages ─────────────────────────────────────────────────────────
const sectionTitleStyle: CSSProperties = {
  margin: "0 0 10px",
  fontFamily: "Syne, sans-serif",
  fontSize: 14,
  fontWeight: 700,
  color: "var(--ls-text)",
};

const breakdownRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 8px",
  borderRadius: 8,
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
};

const metricCardStyle = (color: string): CSSProperties => ({
  position: "relative",
  background: `color-mix(in srgb, ${color} 6%, var(--ls-surface))`,
  border: `0.5px solid ${color}`,
  borderRadius: 12,
  padding: "12px 14px",
});

const badgeStyle = (color: string): CSSProperties => ({
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

export const twoColGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  marginBottom: 18,
};

export const threeColGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: 8,
  marginBottom: 18,
};

export const labelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "var(--ls-text)",
  letterSpacing: 0.3,
  marginBottom: 4,
};

export const hintStyle: CSSProperties = {
  fontSize: 11,
  color: "var(--ls-text-muted)",
  lineHeight: 1.4,
  marginBottom: 10,
};
