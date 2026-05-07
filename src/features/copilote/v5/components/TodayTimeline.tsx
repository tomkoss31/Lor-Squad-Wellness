// =============================================================================
// TodayTimeline — Phase D Co-pilote V5 (2026-05-05)
//
// Liste éditoriale des items du jour : RDV / suivis / recos.
// 3 styles de border-left selon le type :
//   - gold (rdv)    · timeline-item
//   - teal (suivi)  · timeline-item.suivi
//   - purple (reco) · timeline-item.recos
//
// Fusionne TodayAgendaCard + PendingFollowupsCard de l'ancienne page.
// Source : useCopiloteData.todayAgenda + .pendingFollowups
// =============================================================================

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCopiloteData } from "../../../../hooks/useCopiloteData";
import { useGlobalView } from "../../../../hooks/useGlobalView";

type TimelineItemType = "rdv" | "suivi" | "reco";

interface TimelineItemData {
  id: string;
  type: TimelineItemType;
  time: string;
  title: string;
  meta: string;
  tag: string;
  emoji: string;
  clientId: string;
}

const TYPE_COLORS: Record<TimelineItemType, { border: string; time: string }> = {
  rdv: { border: "#D4A937", time: "#8B6F1F" },
  suivi: { border: "#1D9E75", time: "#14704F" },
  reco: { border: "#7F77DD", time: "#7F77DD" },
};

export function TodayTimeline() {
  const navigate = useNavigate();
  const [globalView] = useGlobalView();
  const data = useCopiloteData(new Date(), globalView);

  const items = useMemo<TimelineItemData[]>(() => {
    const out: TimelineItemData[] = [];

    // RDV du jour (clients + prospects)
    for (const r of data.todayAgenda) {
      const time = new Intl.DateTimeFormat("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(r.time);
      out.push({
        id: `rdv-${r.id}`,
        type: "rdv",
        time,
        title: `RDV ${r.name}`,
        meta: r.type,
        tag: r.kind === "rdv-prospect" ? "Prospect" : "Client",
        emoji: "🎯",
        clientId: r.clientId,
      });
    }

    // Suivis pending
    for (const f of data.pendingFollowups) {
      out.push({
        id: `fu-${f.id}`,
        type: "suivi",
        time: f.protocolDay > 0 ? `J+${f.protocolDay}` : "—",
        title: `Suivi ${f.clientName}`,
        meta: f.label,
        tag: "Suivi",
        emoji: "📱",
        clientId: f.clientId,
      });
    }

    return out.slice(0, 5);
  }, [data]);

  return (
    <section style={cardStyle}>
      <div style={headerStyle}>
        <h3 style={titleStyle}>
          📅 Aujourd'hui
          <span style={badgeNumStyle}>{items.length}</span>
        </h3>
        <button type="button" style={linkStyle} onClick={() => navigate("/agenda")}>
          Tout l'agenda →
        </button>
      </div>

      {items.length === 0 ? (
        <div style={emptyStyle}>🍃 Tranquille aujourd'hui — profite-en pour préparer demain.</div>
      ) : (
        items.map((item) => (
          <button
            key={item.id}
            type="button"
            style={{
              ...itemStyle,
              borderLeftColor: TYPE_COLORS[item.type].border,
            }}
            className="v5-hover-shift"
            onClick={() => navigate(`/clients/${item.clientId}`)}
          >
            <div
              style={{
                ...itemTimeStyle,
                color: TYPE_COLORS[item.type].time,
              }}
              className="v5-mono"
            >
              {item.time}
            </div>
            <div style={itemIconStyle}>{item.emoji}</div>
            <div style={itemInfoStyle}>
              <div style={itemTitleStyle}>{item.title}</div>
              <div style={itemMetaStyle}>{item.meta}</div>
            </div>
            <div style={itemActionStyle}>
              <span style={itemTagStyle}>{item.tag}</span>
              <span style={itemArrowStyle}>›</span>
            </div>
          </button>
        ))
      )}
    </section>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

// ─── V7 Phase 6 (2026-05-08) : Timeline re-skin G3 ────────────────────
const cardStyle: React.CSSProperties = {
  background: "var(--ls-surface)",
  border: "1px solid var(--ls-border)",
  borderRadius: 18,
  padding: "20px 24px",
  boxShadow:
    "0 1px 2px rgba(15,23,42,0.04), 0 12px 28px -14px rgba(15,23,42,0.10)",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 14,
};

const titleStyle: React.CSSProperties = {
  fontFamily: "var(--lb360-display, 'Sora', sans-serif)",
  fontSize: 16,
  fontWeight: 800,
  color: "var(--ls-text)",
  letterSpacing: "-0.015em",
  display: "flex",
  alignItems: "center",
  gap: 8,
  margin: 0,
};

const badgeNumStyle: React.CSSProperties = {
  background: "color-mix(in srgb, #10B981 12%, transparent)",
  color: "color-mix(in srgb, #10B981 70%, var(--ls-text))",
  border: "1px solid color-mix(in srgb, #10B981 25%, transparent)",
  padding: "3px 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
};

// Lien "Tout l agenda →" : ghost emerald (au lieu de gold)
const linkStyle: React.CSSProperties = {
  fontSize: 12,
  color: "color-mix(in srgb, #10B981 75%, var(--ls-text))",
  fontWeight: 700,
  cursor: "pointer",
  background: "transparent",
  border: "none",
  padding: 0,
  fontFamily: "var(--lb360-display, 'Sora', sans-serif)",
  letterSpacing: "0.01em",
};

const emptyStyle: React.CSSProperties = {
  textAlign: "center",
  padding: "24px 10px",
  color: "var(--ls-text-muted)",
  fontSize: 13,
  fontStyle: "italic",
  fontFamily: "var(--lb360-display-serif, 'Fraunces', serif)",
};

// Item RDV : barre laterale gauche gradient G3 + glow emerald
const itemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "12px 14px",
  borderRadius: 12,
  background: "color-mix(in srgb, var(--ls-text) 3%, transparent)",
  marginBottom: 8,
  position: "relative",
  borderLeft: "3px solid transparent",
  borderImage:
    "var(--lb360-gradient, linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%)) 1",
  cursor: "pointer",
  width: "100%",
  textAlign: "left",
  border: "none",
  borderLeftWidth: 3,
  borderLeftStyle: "solid",
  transition: "background 0.18s ease, transform 0.18s ease",
};

const itemTimeStyle: React.CSSProperties = {
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
  fontSize: 14,
  fontWeight: 700,
  color: "var(--ls-text)",
  flexShrink: 0,
  width: 52,
};

const itemIconStyle: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 10,
  background: "var(--ls-surface)",
  border: "1px solid var(--ls-border)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 17,
  flexShrink: 0,
};

const itemInfoStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const itemTitleStyle: React.CSSProperties = {
  fontFamily: "var(--lb360-display, 'Sora', sans-serif)",
  fontSize: 14,
  fontWeight: 700,
  color: "var(--ls-text)",
  marginBottom: 2,
  letterSpacing: "-0.005em",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const itemMetaStyle: React.CSSProperties = {
  fontSize: 11.5,
  color: "var(--ls-text-muted)",
  fontFamily: "var(--lb360-body, 'Inter', sans-serif)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const itemActionStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const itemTagStyle: React.CSSProperties = {
  fontSize: 10.5,
  background: "var(--ls-surface)",
  padding: "4px 10px",
  borderRadius: 999,
  color: "var(--ls-text-muted)",
  fontWeight: 600,
  border: "1px solid var(--ls-border)",
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
  letterSpacing: "0.04em",
};

const itemArrowStyle: React.CSSProperties = {
  color: "var(--ls-text-muted)",
  fontSize: 14,
};
