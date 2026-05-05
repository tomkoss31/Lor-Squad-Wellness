// =============================================================================
// RentabilityWidget — Co-pilote (2026-05-05)
//
// Widget compact en haut du Co-pilote : jauge ronde "compact" + click =
// popup détail. Skippe silencieusement si pas de user (login).
// =============================================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { useUserRentability } from "../../hooks/useUserRentability";
import { RentabilityGauge } from "./RentabilityGauge";
import { RentabilityDetailModal } from "./RentabilityDetailModal";

export function RentabilityWidget() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const { data, loading } = useUserRentability(currentUser?.id ?? null);
  const [open, setOpen] = useState(false);

  if (!currentUser) return null;
  if (loading) {
    return (
      <div style={skeletonStyle}>
        <div style={skeletonGaugeStyle} />
      </div>
    );
  }
  if (!data) return null;

  return (
    <>
      <div style={cardStyle}>
        <div style={leftStyle}>
          <div style={eyebrowStyle}>💎 Ma rentabilité</div>
          <h3 style={titleStyle}>
            Tu gagnes <span style={{ color: "var(--ls-gold)" }}>{Math.round(data.margin_eur).toLocaleString("fr-FR")} €</span> ce mois
          </h3>
          <p style={subStyle}>
            {data.products_count > 0
              ? `${data.products_count} programme${data.products_count > 1 ? "s" : ""} vendu${data.products_count > 1 ? "s" : ""} · marge ${data.margin_pct}%`
              : "Vends ton premier programme pour démarrer 🚀"}
          </p>
          <div style={ctaRowStyle}>
            <button
              type="button"
              onClick={() => setOpen(true)}
              style={ctaBtnPrimary}
            >
              Voir le détail →
            </button>
            <button
              type="button"
              onClick={() => navigate("/rentabilite")}
              style={ctaBtnGhost}
            >
              Page complète
            </button>
          </div>
        </div>
        <div style={rightStyle}>
          <RentabilityGauge data={data} size="compact" onClick={() => setOpen(true)} />
        </div>
      </div>

      {open && <RentabilityDetailModal data={data} onClose={() => setOpen(false)} />}
    </>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 6%, var(--ls-surface)) 0%, var(--ls-surface) 60%)",
  border: "0.5px solid color-mix(in srgb, var(--ls-gold) 28%, var(--ls-border))",
  borderRadius: 18,
  padding: "18px 20px",
  display: "flex",
  alignItems: "center",
  gap: 18,
  flexWrap: "wrap",
  boxShadow: "0 6px 22px color-mix(in srgb, var(--ls-gold) 8%, transparent)",
};

const leftStyle: React.CSSProperties = {
  flex: "1 1 280px",
  minWidth: 0,
};

const rightStyle: React.CSSProperties = {
  flex: "0 0 auto",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 10,
  color: "var(--ls-gold)",
  textTransform: "uppercase",
  letterSpacing: 1.4,
  fontWeight: 700,
  marginBottom: 4,
  fontFamily: "DM Sans, sans-serif",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "Syne, sans-serif",
  fontSize: 19,
  fontWeight: 800,
  color: "var(--ls-text)",
  lineHeight: 1.25,
};

const subStyle: React.CSSProperties = {
  margin: "6px 0 0",
  fontSize: 12,
  color: "var(--ls-text-muted)",
  lineHeight: 1.4,
};

const ctaRowStyle: React.CSSProperties = {
  marginTop: 12,
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const ctaBtnPrimary: React.CSSProperties = {
  padding: "9px 16px",
  borderRadius: 10,
  border: "none",
  background: "linear-gradient(135deg, var(--ls-gold), color-mix(in srgb, var(--ls-gold) 75%, var(--ls-coral)))",
  color: "var(--ls-bg)",
  fontFamily: "Syne, sans-serif",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const ctaBtnGhost: React.CSSProperties = {
  padding: "9px 14px",
  borderRadius: 10,
  border: "0.5px solid var(--ls-border)",
  background: "transparent",
  color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 12,
  cursor: "pointer",
};

const skeletonStyle: React.CSSProperties = {
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 18,
  padding: 20,
  display: "flex",
  justifyContent: "center",
  minHeight: 200,
};

const skeletonGaugeStyle: React.CSSProperties = {
  width: 180,
  height: 180,
  borderRadius: "50%",
  background:
    "linear-gradient(135deg, var(--ls-surface2) 0%, color-mix(in srgb, var(--ls-text-muted) 14%, var(--ls-surface)) 50%, var(--ls-surface2) 100%)",
  backgroundSize: "200% 200%",
  animation: "ls-rent-skeleton 1.5s ease-in-out infinite",
};
