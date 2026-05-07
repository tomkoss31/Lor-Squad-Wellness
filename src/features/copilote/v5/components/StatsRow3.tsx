// =============================================================================
// StatsRow3 — Phase D Co-pilote V5 (2026-05-05)
//
// Grid 3 stats colorées (teal / gold / purple) :
//   1. À traiter aujourd'hui (messages + RDV à confirmer)
//   2. Bilans cette semaine (current/target)
//   3. Programmes vendus ce mois
//
// Responsive : 3 cols >=1200px, 2 cols 900-1199px, 1 col <900px.
// =============================================================================

import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../../../context/AppContext";
import { useUserRentability } from "../../../../hooks/useUserRentability";

interface StatsRow3Props {
  /** Nombre d'éléments à traiter (messages + RDV à confirmer). */
  todoCount?: number;
  /** Subtitle "X messages · Y RDV à confirmer". */
  todoSubtitle?: string;
  /** Bilans réalisés cette semaine. */
  bilansWeekDone?: number;
  /** Cible bilans cette semaine. */
  bilansWeekTarget?: number;
  /** Trend bilans (ex. "↗ +1 vs semaine dernière"). */
  bilansTrend?: string;
}

export function StatsRow3({
  todoCount = 0,
  todoSubtitle = "Tout est calme",
  bilansWeekDone = 0,
  bilansWeekTarget = 6,
  bilansTrend = "—",
}: StatsRow3Props) {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const { data: rentab } = useUserRentability(currentUser?.id ?? null);

  const programs = rentab?.products_count ?? 0;

  return (
    <section style={rowStyle} data-v5-stats>
      <button
        type="button"
        onClick={() => navigate("/messages")}
        style={{ ...cardStyle, ...cardEmeraldStyle }}
        className="v5-hover-lift"
        data-v5-stat="emerald"
      >
        <div style={haloEmeraldStyle} aria-hidden="true" />
        <div style={overlineStyle}>📥 À traiter aujourd'hui</div>
        <div style={valueEmeraldStyle}>{todoCount}</div>
        <div style={trendStyle}>
          {todoSubtitle}
        </div>
      </button>

      <button
        type="button"
        onClick={() => navigate("/agenda")}
        style={{ ...cardStyle, ...cardCyanStyle }}
        className="v5-hover-lift"
        data-v5-stat="cyan"
      >
        <div style={haloCyanStyle} aria-hidden="true" />
        <div style={overlineStyle}>🩺 Bilans cette semaine</div>
        <div style={valueStyle}>
          {bilansWeekDone}{" "}
          <span style={lightStyle}>/ {bilansWeekTarget}</span>
        </div>
        <div style={trendStyle}>{bilansTrend}</div>
      </button>

      <button
        type="button"
        onClick={() => navigate("/rentabilite")}
        style={{ ...cardStyle, ...cardVioletStyle }}
        className="v5-hover-lift"
        data-v5-stat="violet"
      >
        <div style={haloVioletStyle} aria-hidden="true" />
        <div style={overlineStyle}>📦 Programmes vendus</div>
        <div style={valueVioletStyle}>
          {programs} <span style={lightStyle}>/ mois</span>
        </div>
        <div style={trendStyle}>
          {programs === 0
            ? "Vends ton 1er programme"
            : `Marge ${rentab?.margin_pct ?? 25}%`}
        </div>
      </button>
    </section>
  );
}

// ─── V7 Phase 5 (2026-05-08) : Stats row pastels G3 + halos ───────────
// Avant : 3 cards teal/gold/purple V5 avec couleurs hardcodees.
// Apres : 3 cards emerald/cyan/violet G3 avec halo radial top-right
// + valeurs principales en gradient color-coordonne (emerald pour
// "a traiter", default ink pour "bilans", G3 pour "programmes").
const rowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 12,
};

const cardStyle: React.CSSProperties = {
  background: "var(--ls-surface)",
  borderRadius: 16,
  padding: "18px 20px",
  position: "relative",
  overflow: "hidden",
  isolation: "isolate",
  boxShadow:
    "0 1px 2px rgba(15,23,42,0.04), 0 12px 28px -14px rgba(15,23,42,0.10)",
  cursor: "pointer",
  textAlign: "left",
  border: "1px solid var(--ls-border)",
  transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
};

// Card 1 : tinte emerald (a traiter)
const cardEmeraldStyle: React.CSSProperties = {
  background: "var(--lb360-card-emerald, var(--ls-surface))",
  borderColor: "color-mix(in srgb, #10B981 18%, var(--ls-border))",
};

// Card 2 : tinte cyan (bilans)
const cardCyanStyle: React.CSSProperties = {
  background: "var(--lb360-card-cyan, var(--ls-surface))",
  borderColor: "color-mix(in srgb, #06B6D4 14%, var(--ls-border))",
};

// Card 3 : tinte violet (programmes vendus)
const cardVioletStyle: React.CSSProperties = {
  background: "var(--lb360-card-violet, var(--ls-surface))",
  borderColor: "color-mix(in srgb, #8B5CF6 18%, var(--ls-border))",
};

// Halos top-right par card
const haloEmeraldStyle: React.CSSProperties = {
  position: "absolute",
  top: -50,
  right: -50,
  width: 140,
  height: 140,
  background:
    "radial-gradient(circle, color-mix(in srgb, #10B981 22%, transparent), transparent 65%)",
  pointerEvents: "none",
  zIndex: 0,
  filter: "blur(4px)",
};

const haloCyanStyle: React.CSSProperties = {
  ...haloEmeraldStyle,
  background:
    "radial-gradient(circle, color-mix(in srgb, #06B6D4 18%, transparent), transparent 65%)",
};

const haloVioletStyle: React.CSSProperties = {
  ...haloEmeraldStyle,
  background:
    "radial-gradient(circle, color-mix(in srgb, #8B5CF6 22%, transparent), transparent 65%)",
};

const overlineStyle: React.CSSProperties = {
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
  fontSize: 11,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  fontWeight: 500,
  color: "var(--ls-text-muted)",
  marginBottom: 10,
  display: "flex",
  alignItems: "center",
  gap: 6,
  position: "relative",
  zIndex: 1,
};

// Valeur principale generique (Sora 800)
const valueStyle: React.CSSProperties = {
  fontFamily: "var(--lb360-display, 'Sora', sans-serif)",
  fontSize: 32,
  fontWeight: 800,
  color: "var(--ls-text)",
  letterSpacing: "-0.025em",
  lineHeight: 1,
  display: "flex",
  alignItems: "baseline",
  gap: 6,
  position: "relative",
  zIndex: 1,
};

// Valeur "a traiter" : gradient emerald → cyan pour signaler positivite
const valueEmeraldStyle: React.CSSProperties = {
  ...valueStyle,
  background: "linear-gradient(135deg, #10B981, #06B6D4)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
  color: "transparent",
};

// Valeur "programmes" : gradient G3 complet (signature)
const valueVioletStyle: React.CSSProperties = {
  ...valueStyle,
  background:
    "var(--lb360-gradient, linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%))",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
  color: "transparent",
};

const lightStyle: React.CSSProperties = {
  fontSize: 16,
  color: "var(--ls-text-muted)",
  fontWeight: 500,
  // Reset du gradient text fill (sinon "/mois" disparait sous le clip)
  WebkitTextFillColor: "var(--ls-text-muted)" as React.CSSProperties["WebkitTextFillColor"],
  background: "none",
};

const trendStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--ls-text-muted)",
  marginTop: 8,
  fontWeight: 500,
  display: "flex",
  alignItems: "center",
  gap: 5,
  fontFamily: "var(--lb360-body, 'Inter', sans-serif)",
  position: "relative",
  zIndex: 1,
};
