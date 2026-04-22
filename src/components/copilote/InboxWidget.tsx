// Chantier Messagerie finalisée (2026-04-23) — commit 5/5.
// Widget "📥 N demandes à traiter" sur la home Co-pilote.

import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import type { ClientMessage } from "../../types/domain";

function timeAgoShort(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function badgeForType(type: ClientMessage["message_type"]): string {
  switch (type) {
    case "product_request":
      return "Conseil produit";
    case "recommendation":
      return "Recommandation";
    case "rdv_request":
      return "Modif RDV";
    case "coach_reply":
      return "Réponse";
    default:
      return "Message";
  }
}

export function InboxWidget() {
  const { clientMessages, currentUser } = useAppContext();
  const navigate = useNavigate();

  const toHandle = useMemo(() => {
    const incoming = clientMessages.filter((m) => {
      if ((m.sender ?? "client") !== "client") return false;
      if (m.archived_at || m.resolved_at) return false;
      if (m.read) return false;
      if (currentUser && currentUser.role !== "admin") {
        return m.distributor_id === currentUser.id || m.distributor_id === currentUser.name;
      }
      return true;
    });
    return [...incoming]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [clientMessages, currentUser]);

  const count = toHandle.length;

  return (
    <div
      style={{
        padding: 16,
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
          marginBottom: count > 0 ? 12 : 4,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "rgba(201,168,76,0.1)",
            color: "var(--ls-gold)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          📥
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "var(--ls-text-muted)",
              fontWeight: 500,
              marginBottom: 2,
            }}
          >
            À traiter
          </div>
          <div
            style={{
              fontFamily: "Syne, sans-serif",
              fontSize: 18,
              fontWeight: 700,
              color: "var(--ls-text)",
              lineHeight: 1.1,
            }}
          >
            {count === 0 ? "Inbox à jour 👌" : `${count} demande${count > 1 ? "s" : ""} en attente`}
          </div>
        </div>
        {count > 0 ? (
          <span
            style={{
              padding: "3px 9px",
              borderRadius: 10,
              background: "#A32D2D",
              color: "#FFFFFF",
              fontSize: 11,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {count}
          </span>
        ) : null}
      </div>

      {count > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {toHandle.map((m) => {
            const firstName = m.client_name.split(/\s+/)[0] ?? m.client_name;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => navigate(`/messagerie/conversation/${m.id}`)}
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
                <span style={{ color: "var(--ls-gold)", fontSize: 11, flexShrink: 0 }}>▸</span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--ls-text)",
                    flexShrink: 0,
                  }}
                >
                  {firstName}
                </span>
                <span style={{ color: "var(--ls-text-hint)", fontSize: 11 }}>·</span>
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--ls-text-muted)",
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {badgeForType(m.message_type)}
                </span>
                <span style={{ fontSize: 10, color: "var(--ls-text-hint)", flexShrink: 0 }}>
                  {timeAgoShort(m.created_at)}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {count > 0 ? (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--ls-border)" }}>
          <Link
            to="/messages"
            style={{
              fontSize: 12,
              color: "var(--ls-gold)",
              textDecoration: "none",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            Voir la messagerie →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
