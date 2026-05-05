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
        style={{ ...cardStyle, ...cardTealStyle }}
        className="v5-hover-lift"
      >
        <div style={{ ...overlineStyle, color: "#14704F" }}>⚡ À traiter aujourd'hui</div>
        <div style={valueStyle}>{todoCount}</div>
        <div style={{ ...trendStyle, color: todoCount > 0 ? "#14704F" : "#7A6F5C" }}>
          {todoSubtitle}
        </div>
      </button>

      <button
        type="button"
        onClick={() => navigate("/agenda")}
        style={{ ...cardStyle, ...cardGoldStyle }}
        className="v5-hover-lift"
      >
        <div style={{ ...overlineStyle, color: "#8B6F1F" }}>🎯 Bilans cette semaine</div>
        <div style={valueStyle}>
          {bilansWeekDone}{" "}
          <span style={lightStyle}>/ {bilansWeekTarget}</span>
        </div>
        <div style={{ ...trendStyle, color: "#14704F", fontWeight: 700 }}>{bilansTrend}</div>
      </button>

      <button
        type="button"
        onClick={() => navigate("/rentabilite")}
        style={{ ...cardStyle, ...cardPurpleStyle }}
        className="v5-hover-lift"
      >
        <div style={{ ...overlineStyle, color: "#7F77DD" }}>📦 Programmes vendus</div>
        <div style={valueStyle}>
          {programs} <span style={lightStyle}>/ mois</span>
        </div>
        <div style={trendStyle}>
          {programs === 0
            ? "Vends ton 1er programme"
            : `marge ${rentab?.margin_pct ?? 25}%`}
        </div>
      </button>
    </section>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const rowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 12,
};

const cardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 16,
  padding: "16px 18px",
  position: "relative",
  overflow: "hidden",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
  cursor: "pointer",
  textAlign: "left",
  border: "1px solid transparent",
};

const cardTealStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #F5FBF8 0%, #E6F3EE 100%)",
  borderColor: "rgba(29, 158, 117, 0.18)",
};

const cardGoldStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #FFFCF5 0%, #FFF1D6 100%)",
  borderColor: "rgba(212, 169, 55, 0.25)",
};

const cardPurpleStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #FBFAFF 0%, #F0EEFF 100%)",
  borderColor: "rgba(127, 119, 221, 0.18)",
};

const overlineStyle: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: 1.5,
  textTransform: "uppercase",
  fontWeight: 700,
  marginBottom: 8,
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontFamily: "DM Sans, sans-serif",
};

const valueStyle: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 800,
  color: "#1A1612",
  letterSpacing: -1,
  lineHeight: 1,
  display: "flex",
  alignItems: "baseline",
  gap: 6,
  fontFamily: "DM Sans, sans-serif",
};

const lightStyle: React.CSSProperties = {
  fontSize: 16,
  color: "#7A6F5C",
  fontWeight: 500,
};

const trendStyle: React.CSSProperties = {
  fontSize: 11.5,
  color: "#7A6F5C",
  marginTop: 6,
  fontWeight: 500,
  display: "flex",
  alignItems: "center",
  gap: 5,
  fontFamily: "DM Sans, sans-serif",
};
