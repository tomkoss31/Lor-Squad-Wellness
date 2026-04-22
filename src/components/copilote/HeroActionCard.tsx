// Chantier Co-pilote V4 (2026-04-24).
// Hero card teal : focus sur la prochaine action (RDV ou suivi).
// Si nextAction == null → card neutre "Tout est calme".

import { useNavigate } from "react-router-dom";
import { formatCountdown } from "../../lib/utils/copiloteHelpers";
import { getInitials } from "../../lib/utils/getInitials";
import type { CopiloteNextAction } from "../../hooks/useCopiloteData";

function formatHour(d: Date): string {
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function HeroActionCard({
  nextAction,
  now,
}: {
  nextAction: CopiloteNextAction | null;
  now: Date;
}) {
  const navigate = useNavigate();

  if (!nextAction || nextAction.kind === "none") {
    return (
      <div
        style={{
          padding: "24px 22px",
          borderRadius: 20,
          background: "linear-gradient(135deg, rgba(45,212,191,0.08), rgba(15,110,86,0.14))",
          border: "1px solid rgba(15,110,86,0.2)",
          color: "var(--ls-text)",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: "rgba(15,110,86,0.2)",
            color: "#0F6E56",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            flexShrink: 0,
          }}
        >
          🎉
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#0F6E56",
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            Prochaine action
          </div>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: 18, fontWeight: 700 }}>
            Tout est calme, bonne journée 🎉
          </div>
          <div style={{ fontSize: 12, color: "var(--ls-text-muted)", marginTop: 4 }}>
            Aucun RDV programmé, aucun suivi en attente.
          </div>
        </div>
      </div>
    );
  }

  const isRdv = nextAction.kind === "rdv";
  const countdown = isRdv && nextAction.time ? formatCountdown(nextAction.time, now) : null;

  return (
    <div
      style={{
        position: "relative",
        padding: 22,
        borderRadius: 20,
        background: "linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)",
        color: "#FFFFFF",
        overflow: "hidden",
      }}
    >
      {/* Décoration cercle */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -40,
          right: -40,
          width: 160,
          height: 160,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
        }}
      />

      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.25)",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Syne, sans-serif",
            fontWeight: 700,
            fontSize: 17,
            flexShrink: 0,
          }}
        >
          {getInitials(nextAction.clientName)}
        </div>

        <div style={{ flex: 1, minWidth: 200 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              opacity: 0.85,
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            Prochaine action{countdown ? ` · ${countdown}` : ""}
          </div>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 700 }}>
            {nextAction.clientName}
          </div>
          <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>
            {nextAction.title}
            {nextAction.location ? ` · ${nextAction.location}` : ""}
          </div>
        </div>

        {isRdv && nextAction.time ? (
          <div
            style={{
              textAlign: "right",
              fontFamily: "Syne, sans-serif",
              fontWeight: 700,
              fontSize: 32,
              letterSpacing: "-0.02em",
              flexShrink: 0,
            }}
          >
            {formatHour(nextAction.time)}
          </div>
        ) : null}
      </div>

      <div
        style={{
          position: "relative",
          marginTop: 18,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => {
            if (nextAction.isProspect) {
              navigate("/agenda?filter=today");
            } else {
              navigate(`/clients/${nextAction.clientId}`);
            }
          }}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.35)",
            color: "#FFFFFF",
            fontSize: 13,
            fontFamily: "DM Sans, sans-serif",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Voir fiche
        </button>
        <button
          type="button"
          onClick={() => {
            if (isRdv) {
              navigate(nextAction.isProspect ? "/agenda" : `/clients/${nextAction.clientId}/follow-up/new`);
            } else {
              navigate(`/clients/${nextAction.clientId}?tab=actions`);
            }
          }}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            background: "#FFFFFF",
            color: "#0F6E56",
            border: "none",
            fontSize: 13,
            fontFamily: "Syne, sans-serif",
            fontWeight: 700,
            cursor: "pointer",
            letterSpacing: 0.3,
          }}
        >
          {isRdv ? "Préparer le bilan" : "Envoyer le message"}
        </button>
      </div>
    </div>
  );
}
