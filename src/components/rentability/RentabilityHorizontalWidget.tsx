// =============================================================================
// RentabilityHorizontalWidget — widget Co-pilote V5 horizontal premium.
// Hero gauche (titre + chips + status + delta + CTA) + jauge à droite avec
// marker projection. Click partout = navigate vers /rentabilite.
//
// Chantier Rentabilité Premium V2 (2026-05-20).
// Validé Thomas — remplace la WalletCard sur Co-pilote (qui ne reste qu'en
// petit format sur la page rentabilité hero).
// Source design : docs/mockups/rentabilite-design-v2/.../widget.jsx
// =============================================================================

import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { useStealthMode } from "../../hooks/useStealthMode";
import { useRentabilitySummary } from "../../hooks/useRentabilitySummary";
import { useCountUp } from "./shared/useCountUp";
import { GaugeProjection } from "./shared/GaugeProjection";

function monthLabel(iso: string | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso + "T12:00:00Z");
    const f = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(d);
    return f.charAt(0).toUpperCase() + f.slice(1);
  } catch {
    return "";
  }
}

export function RentabilityHorizontalWidget() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const {
    data,
    loading,
    isCoupleAggregated,
    downlineOverride,
    manualOverride,
    totalMargin,
    prevMonthEur: prev,
    delta,
    projection,
  } = useRentabilitySummary(currentUser?.id ?? null);
  const { stealthOn, toggle: toggleStealth } = useStealthMode();

  const animTotal = useCountUp(Math.round(totalMargin), { duration: 1100, delay: 80 });
  const month = monthLabel(data?.month_start);

  const pct = projection > 0 ? Math.min(100, Math.round((totalMargin / projection) * 100)) : 0;
  const valueFrac = projection > 0 ? totalMargin / projection : 0;
  const ahead = totalMargin >= prev;

  // Status pill : Carton plein / En route / À booster
  const status = totalMargin >= 500
    ? { label: "Carton plein", emoji: "🏆", pillClass: "lr-pill--win" }
    : totalMargin >= 200
    ? { label: "En route", emoji: "⚡", pillClass: "lr-pill--win" }
    : { label: "À booster", emoji: "🔥", pillClass: "lr-pill--push" };

  if (!currentUser) return null;
  if (loading || !data) {
    return (
      <div className="lr lr-card" style={{ ...widgetWrapStyle, opacity: 0.5 }}>
        <div style={{ padding: 30, textAlign: "center", color: "var(--ls-rentab-ink-3)" }}>Chargement…</div>
      </div>
    );
  }

  return (
    <div className={`lr ${stealthOn ? "lr-stealth-on" : ""}`}>
      <style>{`
        @media (max-width: 720px) {
          .lr-rentab-widget-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
            padding: 18px 16px 16px !important;
          }
          .lr-rentab-widget-grid [data-lr-amount] {
            font-size: 48px !important;
          }
          .lr-rentab-widget-grid [data-lr-gauge-wrap] {
            order: 2;
          }
          .lr-rentab-widget-grid [data-lr-left] {
            order: 1;
          }
        }
      `}</style>
      <div className="lr-card lr-rentab-widget-grid" style={widgetWrapStyle}>
        <div className="lr-mesh" style={{ opacity: 0.65 }} />

        {/* ─── LEFT ──────────────────────────────────────────────── */}
        <div data-lr-left style={{ position: "relative", display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <div className="lr-fadeup" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <span className="lr-eyebrow">
              <span aria-hidden="true">◆</span>
              Ma rentabilité
              <span style={{ color: "var(--ls-rentab-ink-3)", letterSpacing: "0.14em" }}>· {month}</span>
              {isCoupleAggregated && (
                <span className="lr-chip" style={{ height: 22, padding: "0 8px", fontSize: 10.5, marginLeft: 4 }}>
                  Agrégé · 2 comptes
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={toggleStealth}
              aria-pressed={stealthOn}
              title={stealthOn ? "Afficher les montants" : "Masquer les montants"}
              style={stealthBtnStyle(stealthOn)}
            >
              {stealthOn ? "🙈" : "👁️"}
            </button>
          </div>

          <div
            className="lr-fadeup lr-d-1"
            style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", columnGap: 14, rowGap: 4 }}
          >
            <span
              style={{
                fontFamily: "Syne, sans-serif",
                fontStyle: "italic",
                fontWeight: 600,
                fontSize: 28,
                color: "var(--ls-rentab-ink-2)",
                letterSpacing: "-0.01em",
              }}
            >
              Tu gagnes
            </span>
            <span data-stealth data-lr-amount className="lr-display lr-num" style={{ fontSize: 64 }}>
              {Math.round(animTotal).toLocaleString("fr-FR")}
              <span style={{ fontSize: 38, marginLeft: 2 }}>€</span>
            </span>
          </div>

          <div className="lr-fadeup lr-d-2" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span className="lr-chip">
              <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 999, background: "var(--ls-rentab-ink-3)" }} />
              {data.products_count} programme{data.products_count > 1 ? "s" : ""} · marge {Math.round(data.margin_pct)}%
            </span>
            {downlineOverride > 0 && (
              <span data-stealth className="lr-chip lr-chip--purple">
                <span aria-hidden="true">👥</span>
                +{Math.round(downlineOverride)}€ override équipe
              </span>
            )}
            {manualOverride > 0 && (
              <span data-stealth className="lr-chip lr-chip--purple">
                <span aria-hidden="true">+</span>
                +{Math.round(manualOverride)}€ hors-app
              </span>
            )}
          </div>

          <div style={{ flex: 1 }} />

          <div
            className="lr-fadeup lr-d-3"
            style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}
          >
            <span className={`lr-pill ${status.pillClass}`}>
              <span className="lr-pill__dot" />
              <span aria-hidden="true">{status.emoji}</span>
              {status.label}
            </span>
            {prev > 0 && (
              <span
                style={{
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: 12.5,
                  color: "var(--ls-rentab-ink-3)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span aria-hidden="true" style={{ color: delta >= 0 ? "var(--ls-rentab-teal)" : "var(--ls-rentab-coral)" }}>
                  {delta >= 0 ? "↑" : "↓"}
                </span>
                <span
                  data-stealth
                  style={{ color: delta >= 0 ? "var(--ls-rentab-teal)" : "var(--ls-rentab-coral)", fontWeight: 600 }}
                >
                  {delta >= 0 ? "+" : ""}{delta}€
                </span>
                vs mois dernier
              </span>
            )}
            <div style={{ marginLeft: "auto" }}>
              <button
                type="button"
                onClick={() => navigate("/rentabilite")}
                className="lr-cta"
                style={{ height: 36 }}
              >
                Voir le détail complet
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </div>

        {/* ─── RIGHT (jauge) ────────────────────────────────────── */}
        <div
          data-lr-gauge-wrap
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
        >
          <GaugeProjection
            value={valueFrac}
            projection={1}
            size={186}
            thickness={13}
            ahead={ahead}
            glow
            uid="copilote-widget"
            centerTop="atteint"
            centerBig={`${pct}%`}
            centerSub="vs projection"
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "DM Sans, sans-serif",
              fontSize: 12,
              color: "var(--ls-rentab-ink-3)",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  background: "var(--ls-rentab-gold)",
                  boxShadow: "0 0 0 3px color-mix(in oklab, var(--ls-rentab-gold) 28%, transparent)",
                }}
              />
              projection
            </span>
            <span data-stealth className="lr-num">
              <strong style={{ color: "var(--ls-rentab-ink)", fontWeight: 700 }}>
                {projection.toLocaleString("fr-FR")} €
              </strong>
            </span>
            <span>fin de mois</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const widgetWrapStyle: React.CSSProperties = {
  position: "relative",
  padding: "26px 28px 22px",
  display: "grid",
  gridTemplateColumns: "1.45fr 1fr",
  gap: 28,
  overflow: "hidden",
};

function stealthBtnStyle(on: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "5px 11px",
    borderRadius: 8,
    border: "0.5px solid color-mix(in oklab, var(--ls-rentab-ink) 12%, transparent)",
    background: on
      ? "color-mix(in oklab, var(--ls-rentab-purple) 12%, transparent)"
      : "transparent",
    color: on ? "var(--ls-rentab-purple)" : "var(--ls-rentab-ink-3)",
    fontFamily: "DM Sans, sans-serif",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}
