// Chantier Co-pilote V4 (2026-04-24).
// Card "Agenda du jour" : liste compacte des 3 prochains RDV + compteur.

import { useNavigate } from "react-router-dom";
import { getInitials } from "../../lib/utils/getInitials";
import type { CopiloteAgendaItem } from "../../hooks/useCopiloteData";

function formatHour(d: Date): string {
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function TodayAgendaCard({
  items,
  moreCount,
}: {
  items: CopiloteAgendaItem[];
  moreCount: number;
}) {
  const navigate = useNavigate();

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 16,
        background: "var(--ls-surface)",
        border: "1px solid var(--ls-border)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 24,
            height: 24,
            borderRadius: 7,
            background: "rgba(15,110,86,0.12)",
            color: "#0F6E56",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          📅
        </span>
        <span
          style={{
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontWeight: 700,
            color: "var(--ls-text-muted)",
          }}
        >
          Agenda du jour
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 10,
            padding: "2px 8px",
            borderRadius: 8,
            background: "var(--ls-surface2)",
            color: "var(--ls-text-muted)",
            fontWeight: 600,
          }}
        >
          {items.length + moreCount}
        </span>
      </div>

      {items.length === 0 ? (
        <div
          style={{
            padding: "20px 10px",
            textAlign: "center",
            fontSize: 13,
            color: "var(--ls-text-muted)",
          }}
        >
          Aucun RDV aujourd'hui.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={() =>
                navigate(it.kind === "rdv-prospect" ? "/agenda?filter=today" : `/clients/${it.clientId}`)
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 10,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "DM Sans, sans-serif",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--ls-surface2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "rgba(15,110,86,0.12)",
                  color: "#0F6E56",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "Syne, sans-serif",
                  fontWeight: 700,
                  fontSize: 11,
                  flexShrink: 0,
                }}
              >
                {getInitials(it.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ls-text)" }}>
                  {it.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--ls-text-hint)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {it.type}
                </div>
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--ls-text-muted)",
                  flexShrink: 0,
                  fontFamily: "Syne, sans-serif",
                }}
              >
                {formatHour(it.time)}
              </div>
            </button>
          ))}
        </div>
      )}

      {moreCount > 0 ? (
        <button
          type="button"
          onClick={() => navigate("/agenda?filter=today")}
          style={{
            marginTop: 8,
            width: "100%",
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid var(--ls-border)",
            background: "transparent",
            color: "var(--ls-text-muted)",
            fontSize: 11,
            fontFamily: "DM Sans, sans-serif",
            cursor: "pointer",
          }}
        >
          + {moreCount} autre{moreCount > 1 ? "s" : ""} · Voir l'agenda →
        </button>
      ) : null}
    </div>
  );
}
