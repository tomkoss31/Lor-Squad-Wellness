// =============================================================================
// RentabJourney — Phase D Co-pilote V5 (2026-05-05)
//
// Refonte visuelle du widget Rentabilité existant en "parcours horizontal" :
//   - Header : montant + "gagnés ce mois" italique + status pill
//   - Barre de progression horizontale (gold gradient + curseur rond gold)
//   - Markers : 0€ · current% · target€ projection fin de mois
//   - CTA "Voir le détail →" qui navigue vers /rentabilite
//
// Réutilise le hook useUserRentability (livré Phase A rentab) pour les
// données. Couplé Thomas+Mélanie auto-géré par le hook.
// =============================================================================

import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../../../context/AppContext";
import {
  useUserRentability,
  rentabilityZone,
} from "../../../../hooks/useUserRentability";

const ZONE_META: Record<string, { label: string; emoji: string }> = {
  red: { label: "À booster", emoji: "🔥" },
  orange: { label: "En route", emoji: "⚡" },
  green: { label: "Carton plein", emoji: "✨" },
};

function formatEur(n: number): string {
  return Math.round(n).toLocaleString("fr-FR") + " €";
}

function monthLabel(iso: string): string {
  try {
    const d = new Date(iso + "T12:00:00Z");
    const f = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(d);
    return f.charAt(0).toUpperCase() + f.slice(1);
  } catch {
    return "";
  }
}

export function RentabJourney() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const { data, loading, isCoupleAggregated } = useUserRentability(
    currentUser?.id ?? null,
  );

  if (loading) {
    return (
      <section style={cardStyle} data-v5-rentab-journey>
        <div style={{ color: "var(--v5-ink-light)", padding: 20, textAlign: "center" }}>Chargement…</div>
      </section>
    );
  }

  if (!data) return null;

  const zone = rentabilityZone(data.margin_eur);
  const meta = ZONE_META[zone];

  // Calcul du % atteint vs projection fin de mois
  const projection = data.projection_eur || data.margin_eur;
  const pct = projection > 0 ? Math.min(100, (data.margin_eur / projection) * 100) : 0;
  const pctRounded = Math.round(pct);

  return (
    <section style={cardStyle} data-v5-rentab-journey>
      {/* Glow décoratif gold en haut-droite */}
      <div style={glowStyle} />

      {/* TOP — montant + status + meta */}
      <div style={topRowStyle}>
        <div style={{ position: "relative", zIndex: 1, flex: 1 }}>
          <div style={overlineStyle} className="v5-cinzel">
            ◆ Ma rentabilité · {monthLabel(data.month_start)}
          </div>
          <div style={titleLineStyle}>
            <span style={amountBigStyle}>{formatEur(data.margin_eur)}</span>
            <span style={amountTextStyle} className="v5-cormorant-italic">
              gagnés ce mois
            </span>
            <span style={statusPillStyle}>
              {meta.emoji} {meta.label}
            </span>
          </div>
          <div style={metaLineStyle}>
            <strong>{data.products_count} programme{data.products_count > 1 ? "s" : ""} vendu{data.products_count > 1 ? "s" : ""}</strong>
            {" · marge "}
            {data.margin_pct}%
            {isCoupleAggregated && " · agrégé Thomas + Mélanie"}
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate("/rentabilite")}
          style={detailBtnStyle}
        >
          Voir le détail →
        </button>
      </div>

      {/* PARCOURS horizontal */}
      <div style={journeyWrapStyle}>
        <div style={barWrapStyle}>
          <div style={{ ...barFillStyle, width: `${pct}%` }} />
        </div>
        <div style={markersStyle}>
          <span style={markerStyle}>0 €</span>
          <span style={markerCurrentStyle}>
            ▲ {formatEur(data.margin_eur)} · {pctRounded}% atteint
          </span>
          <span style={markerTargetStyle}>
            {formatEur(projection)} · projection fin de mois
          </span>
        </div>
      </div>
    </section>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: "var(--v5-card-bg)",
  borderRadius: 20,
  padding: "22px 28px",
  position: "relative",
  overflow: "hidden",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
};

const glowStyle: React.CSSProperties = {
  position: "absolute",
  top: -100,
  right: -100,
  width: 320,
  height: 320,
  background: "radial-gradient(circle, rgba(212, 169, 55, 0.10), transparent 65%)",
  pointerEvents: "none",
};

const topRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 20,
  position: "relative",
  zIndex: 1,
  gap: 12,
};

const overlineStyle: React.CSSProperties = {
  fontFamily: "Cinzel, serif",
  fontSize: 10,
  letterSpacing: 3,
  color: "#8B6F1F",
  textTransform: "uppercase",
  fontWeight: 600,
  marginBottom: 6,
};

const titleLineStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 14,
  flexWrap: "wrap",
};

const amountBigStyle: React.CSSProperties = {
  fontFamily: "DM Sans, sans-serif",
  fontSize: 38,
  fontWeight: 900,
  letterSpacing: -1.5,
  lineHeight: 1,
  background: "linear-gradient(180deg, #EF9F27, #BA7517)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const amountTextStyle: React.CSSProperties = {
  fontFamily: "'Cormorant Garamond', serif",
  fontStyle: "italic",
  fontSize: 22,
  color: "var(--v5-ink)",
  fontWeight: 600,
  letterSpacing: -0.5,
};

const statusPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "linear-gradient(135deg, #E6F3EE, #D4F0E1)",
  color: "#14704F",
  padding: "6px 14px",
  borderRadius: 20,
  fontSize: 11,
  fontWeight: 700,
  border: "1px solid rgba(29, 158, 117, 0.25)",
  fontFamily: "DM Sans, sans-serif",
};

const metaLineStyle: React.CSSProperties = {
  fontSize: 12.5,
  color: "var(--v5-ink-light)",
  marginTop: 8,
  fontFamily: "DM Sans, sans-serif",
};

const detailBtnStyle: React.CSSProperties = {
  background: "var(--v5-card-bg-soft)",
  color: "#8B6F1F",
  border: "1px solid var(--v5-border-soft)",
  padding: "10px 18px",
  borderRadius: 10,
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "DM Sans, sans-serif",
  whiteSpace: "nowrap",
  flexShrink: 0,
  position: "relative",
  zIndex: 1,
};

const journeyWrapStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  marginTop: 14,
};

const barWrapStyle: React.CSSProperties = {
  position: "relative",
  height: 14,
  background: "var(--v5-card-bg-soft)",
  borderRadius: 20,
  overflow: "visible",
  margin: "18px 0 8px",
};

const barFillStyle: React.CSSProperties = {
  height: "100%",
  background: "linear-gradient(90deg, #EF9F27, #D4A937, #BA7517)",
  borderRadius: 20,
  position: "relative",
  boxShadow: "0 0 12px rgba(212, 169, 55, 0.4)",
  transition: "width 0.6s ease",
};

const markersStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: 10,
  color: "var(--v5-ink-light)",
  fontWeight: 600,
  fontFamily: "'JetBrains Mono', monospace",
  gap: 8,
  flexWrap: "wrap",
};

const markerStyle: React.CSSProperties = {
  color: "var(--v5-ink-light)",
};

const markerCurrentStyle: React.CSSProperties = {
  color: "#8B6F1F",
  fontWeight: 800,
};

const markerTargetStyle: React.CSSProperties = {
  color: "var(--v5-ink-soft)",
  fontWeight: 700,
  textAlign: "right",
};
