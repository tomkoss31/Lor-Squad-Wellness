// =============================================================================
// FormationAdminKPIs — bandeau KPIs admin Formation (Phase D)
//
// 5 cards inline : distri actifs / pending sponsor / admin_relay /
// validated total / validated today.
// =============================================================================

import type { FormationAdminKpis } from "../../features/formation/hooks/useFormationAdminKpis";

interface Props {
  data: FormationAdminKpis | null;
  loading: boolean;
}

const CARDS = [
  { key: "active_distri_count", label: "Distri actifs", emoji: "👥", accent: "var(--ls-teal)", suffix: "" },
  { key: "pending_sponsor_count", label: "Sponsor pending", emoji: "🟡", accent: "var(--ls-gold)", suffix: "" },
  { key: "admin_relay_count", label: "Admin relay", emoji: "🟣", accent: "var(--ls-purple)", suffix: "" },
  { key: "validated_total", label: "Validés total", emoji: "✓", accent: "var(--ls-teal)", suffix: "" },
  { key: "validated_today", label: "Validés aujourd'hui", emoji: "🎉", accent: "var(--ls-gold)", suffix: "" },
] as const;

export function FormationAdminKPIs({ data, loading }: Props) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 10,
      }}
    >
      {CARDS.map((card) => {
        const value = data ? (data[card.key] as number) : 0;
        return (
          <div
            key={card.key}
            style={{
              padding: "12px 14px",
              background: `linear-gradient(135deg, color-mix(in srgb, ${card.accent} 8%, var(--ls-surface)) 0%, var(--ls-surface) 100%)`,
              border: `0.5px solid color-mix(in srgb, ${card.accent} 22%, var(--ls-border))`,
              borderTop: `3px solid ${card.accent}`,
              borderRadius: 14,
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 16 }} aria-hidden="true">{card.emoji}</span>
              <span
                style={{
                  fontSize: 9.5,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  color: card.accent,
                }}
              >
                {card.label}
              </span>
            </div>
            <div
              style={{
                fontFamily: "Syne, serif",
                fontSize: 26,
                fontWeight: 800,
                color: "var(--ls-text)",
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
            >
              {loading ? "—" : value.toLocaleString("fr-FR")}
              {card.suffix}
            </div>
          </div>
        );
      })}
    </div>
  );
}
