// =============================================================================
// RentabilityDetailModal — popup détail rentabilité (2026-05-05)
//
// Click sur la jauge → affiche tout le breakdown :
//   - Big total + zone label
//   - Calcul détaillé (revenus × marge%)
//   - Projection fin de mois vs réel actuel
//   - Top 5 programmes vendus du mois
//   - Comparaison vs mois précédent (delta % et €)
//   - Rang actuel + marge appliquée
// =============================================================================

import {
  rentabilityZone,
  type RentabilityData,
} from "../../hooks/useUserRentability";
import { RentabilityGauge } from "./RentabilityGauge";

interface RentabilityDetailModalProps {
  data: RentabilityData;
  onClose: () => void;
}

const ZONE_COLOR: Record<string, string> = {
  red: "var(--ls-coral)",
  orange: "var(--ls-gold)",
  green: "var(--ls-teal)",
};

function formatEur(n: number): string {
  return Math.round(n).toLocaleString("fr-FR") + " €";
}

function monthLabel(iso: string): string {
  try {
    const d = new Date(iso + "T12:00:00Z");
    return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(d);
  } catch {
    return "";
  }
}

export function RentabilityDetailModal({ data, onClose }: RentabilityDetailModalProps) {
  const zone = rentabilityZone(data.margin_eur);
  const zoneColor = ZONE_COLOR[zone];

  const delta = data.margin_eur - data.prev_month_eur;
  const deltaPct =
    data.prev_month_eur > 0 ? Math.round((delta / data.prev_month_eur) * 100) : null;

  return (
    <div style={overlayStyle} onClick={onClose} role="dialog" aria-modal="true">
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} style={closeBtnStyle} aria-label="Fermer">×</button>

        {/* Header */}
        <div style={headerStyle}>
          <div style={eyebrowStyle}>💎 Ma rentabilité · {monthLabel(data.month_start)}</div>
          <h2 style={titleStyle}>{data.user_name}</h2>
          <div style={rankPillStyle}>
            👑 {data.rank_label} · marge perso <strong>{data.margin_pct}%</strong>
          </div>
        </div>

        {/* Big jauge centrée */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
          <RentabilityGauge data={data} size="hero" delay={100} />
        </div>

        {/* Calcul détaillé */}
        <SectionTitle>📊 Le calcul</SectionTitle>
        <div style={calcGridStyle}>
          <CalcRow
            label="Chiffre d'affaires brut"
            value={formatEur(data.revenue_brut)}
            sub={`${data.products_count} programme${data.products_count > 1 ? "s" : ""} vendu${data.products_count > 1 ? "s" : ""} ce mois`}
            color="var(--ls-text)"
          />
          <CalcRow
            label="× marge perso (rang)"
            value={`${data.margin_pct} %`}
            sub={data.rank_label}
            color="var(--ls-text-muted)"
          />
          <CalcRow
            label="= Marge brute"
            value={formatEur(data.margin_eur)}
            sub={data.products_count > 0 ? "ton revenu net du mois" : "aucune vente trackée"}
            color={zoneColor}
            highlight
          />
        </div>

        {/* Projection vs mois précédent */}
        <SectionTitle>🎯 Projection & comparaison</SectionTitle>
        <div style={twoColStyle}>
          <ProjectionCard
            title="Fin de mois"
            value={formatEur(data.projection_eur)}
            sub={
              data.days_elapsed < data.days_in_month
                ? `Au rythme actuel (jour ${data.days_elapsed}/${data.days_in_month})`
                : "Mois écoulé"
            }
            color={zoneColor}
          />
          <ProjectionCard
            title="Mois précédent"
            value={formatEur(data.prev_month_eur)}
            sub={
              deltaPct !== null
                ? delta >= 0
                  ? `📈 +${formatEur(delta)} (+${deltaPct}%)`
                  : `📉 ${formatEur(delta)} (${deltaPct}%)`
                : "—"
            }
            color={delta >= 0 ? "var(--ls-teal)" : "var(--ls-coral)"}
          />
        </div>

        {/* Top programmes */}
        {data.top_programs && data.top_programs.length > 0 && (
          <>
            <SectionTitle>🏆 Top programmes vendus</SectionTitle>
            <ul style={programsListStyle}>
              {data.top_programs.map((p, i) => (
                <li key={`${p.product_name}-${i}`} style={programRowStyle(i)}>
                  <span style={rankBadgeStyle(i)}>#{i + 1}</span>
                  <span style={{ flex: 1, fontWeight: 600, color: "var(--ls-text)" }}>
                    {p.product_name}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>
                    × {p.qty}
                  </span>
                  <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, color: "var(--ls-text)", minWidth: 64, textAlign: "right" }}>
                    {formatEur(p.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Note méthodologie */}
        <div style={methodoStyle}>
          ℹ️ Calcul basé sur les programmes trackés dans l'app Lor'Squad (commandes via fiche client).
          Les commandes hors-fiche (perso, club, Bizworks) ne sont pas incluses dans cette V1.
        </div>

        <button type="button" onClick={onClose} style={ghostBtnStyle}>
          Fermer
        </button>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 style={sectionTitleStyle}>{children}</h3>;
}

function CalcRow({ label, value, sub, color, highlight }: { label: string; value: string; sub?: string; color: string; highlight?: boolean }) {
  return (
    <div style={highlight ? calcRowHighlightStyle(color) : calcRowStyle}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: "var(--ls-text-muted)", fontFamily: "DM Sans, sans-serif", fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: "var(--ls-text-muted)", marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ fontFamily: "Syne, sans-serif", fontWeight: highlight ? 800 : 700, fontSize: highlight ? 22 : 16, color }}>
        {value}
      </div>
    </div>
  );
}

function ProjectionCard({ title, value, sub, color }: { title: string; value: string; sub: string; color: string }) {
  return (
    <div style={projectionCardStyle(color)}>
      <div style={{ fontSize: 10, color: "var(--ls-text-muted)", textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600 }}>{title}</div>
      <div style={{ fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 4 }}>{sub}</div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0,
  background: "color-mix(in srgb, var(--ls-bg) 80%, transparent)",
  backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
  zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
  padding: "20px 16px", overflowY: "auto",
};

const modalStyle: React.CSSProperties = {
  position: "relative", width: "100%", maxWidth: 560,
  maxHeight: "calc(100vh - 40px)", overflowY: "auto",
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 22,
  padding: "26px 24px",
  boxShadow: "0 24px 80px color-mix(in srgb, var(--ls-text) 24%, transparent)",
};

const closeBtnStyle: React.CSSProperties = {
  position: "absolute", top: 12, right: 14,
  width: 36, height: 36, borderRadius: 12,
  background: "transparent", border: "none",
  color: "var(--ls-text-muted)", fontSize: 26, cursor: "pointer", lineHeight: 1,
};

const headerStyle: React.CSSProperties = {
  textAlign: "center", marginBottom: 18, paddingRight: 30,
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 10, color: "var(--ls-gold)", textTransform: "uppercase",
  letterSpacing: 1.4, fontWeight: 700, marginBottom: 4,
};

const titleStyle: React.CSSProperties = {
  margin: 0, fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 800, color: "var(--ls-text)",
};

const rankPillStyle: React.CSSProperties = {
  display: "inline-block", marginTop: 6,
  fontSize: 11, padding: "3px 10px", borderRadius: 9,
  background: "color-mix(in srgb, var(--ls-gold) 12%, transparent)",
  color: "var(--ls-gold)",
  border: "0.5px solid color-mix(in srgb, var(--ls-gold) 40%, transparent)",
  fontFamily: "DM Sans, sans-serif", fontWeight: 600,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: "20px 0 10px", fontFamily: "Syne, sans-serif",
  fontSize: 14, fontWeight: 700, color: "var(--ls-text)",
};

const calcGridStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 6,
};

const calcRowStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "10px 12px", background: "var(--ls-surface2)",
  borderRadius: 10, gap: 10,
};

const calcRowHighlightStyle = (color: string): React.CSSProperties => ({
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "14px 14px", borderRadius: 12, gap: 10,
  background: `color-mix(in srgb, ${color} 8%, var(--ls-surface))`,
  border: `0.5px solid ${color}`,
  boxShadow: `0 6px 20px color-mix(in srgb, ${color} 14%, transparent)`,
});

const twoColStyle: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
};

const projectionCardStyle = (color: string): React.CSSProperties => ({
  background: `color-mix(in srgb, ${color} 6%, var(--ls-surface))`,
  border: `0.5px solid ${color}`,
  borderRadius: 12, padding: "14px 16px",
});

const programsListStyle: React.CSSProperties = {
  margin: 0, padding: 0, listStyle: "none",
  display: "flex", flexDirection: "column", gap: 6,
};

const programRowStyle = (idx: number): React.CSSProperties => ({
  display: "flex", alignItems: "center", gap: 10,
  padding: "10px 12px",
  background: idx === 0
    ? "color-mix(in srgb, var(--ls-gold) 6%, var(--ls-surface))"
    : "var(--ls-surface2)",
  borderRadius: 10,
  border: idx === 0 ? "0.5px solid color-mix(in srgb, var(--ls-gold) 30%, transparent)" : "none",
});

const rankBadgeStyle = (idx: number): React.CSSProperties => {
  const colors = ["var(--ls-gold)", "#9CA3AF", "#A87132", "var(--ls-text-muted)"];
  return {
    fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 12,
    color: colors[Math.min(idx, 3)], minWidth: 24,
  };
};

const methodoStyle: React.CSSProperties = {
  marginTop: 18, padding: "10px 12px",
  background: "var(--ls-surface2)", border: "0.5px solid var(--ls-border)",
  borderRadius: 10, fontSize: 11, color: "var(--ls-text-muted)",
  lineHeight: 1.5, fontStyle: "italic",
};

const ghostBtnStyle: React.CSSProperties = {
  width: "100%", marginTop: 16,
  padding: "12px 18px", borderRadius: 12,
  border: "0.5px solid var(--ls-border)",
  background: "transparent", color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer",
};
