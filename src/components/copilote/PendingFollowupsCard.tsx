// Chantier Co-pilote V4 (2026-04-24).
// Card "Suivis à faire" : 3 suivis protocole J+1/3/7/10 + compteur.

import { useNavigate } from "react-router-dom";
import { getInitials } from "../../lib/utils/getInitials";
import type { CopiloteFollowupItem } from "../../hooks/useCopiloteData";

const TONE_PALETTE: Record<
  CopiloteFollowupItem["tone"],
  { bg: string; color: string }
> = {
  teal: { bg: "rgba(45,212,191,0.15)", color: "#0F6E56" },
  coral: { bg: "rgba(251,113,133,0.15)", color: "#C13048" },
  purple: { bg: "rgba(124,58,237,0.15)", color: "#6D28D9" },
  gold: { bg: "rgba(201,168,76,0.2)", color: "#8B6F2A" },
  blue: { bg: "rgba(59,130,246,0.15)", color: "#2563EB" },
};

export function PendingFollowupsCard({
  items,
  moreCount,
}: {
  items: CopiloteFollowupItem[];
  moreCount: number;
}) {
  const navigate = useNavigate();
  const total = items.length + moreCount;

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
            background: "rgba(201,168,76,0.2)",
            color: "#8B6F2A",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          ⭐
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
          Suivis à faire
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 10,
            padding: "2px 8px",
            borderRadius: 8,
            background: total > 0 ? "#A32D2D" : "var(--ls-surface2)",
            color: total > 0 ? "#FFFFFF" : "var(--ls-text-muted)",
            fontWeight: 700,
          }}
        >
          {total}
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
          Aucun suivi en attente 👌
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((it) => {
            const palette = TONE_PALETTE[it.tone] ?? TONE_PALETTE.gold;
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => navigate(`/clients/${it.clientId}?tab=actions`)}
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
                    background: palette.bg,
                    color: palette.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "Syne, sans-serif",
                    fontWeight: 700,
                    fontSize: 11,
                    flexShrink: 0,
                  }}
                >
                  {getInitials(it.clientName)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ls-text)" }}>
                    {it.clientName}
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
                    J+{it.protocolDay} · {it.label}
                  </div>
                </div>
                <span
                  style={{
                    padding: "3px 8px",
                    borderRadius: 7,
                    background: palette.bg,
                    color: palette.color,
                    fontSize: 10,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  J+{it.protocolDay}
                </span>
              </button>
            );
          })}
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
          + {moreCount} autre{moreCount > 1 ? "s" : ""} · Voir les suivis →
        </button>
      ) : null}
    </div>
  );
}
