// =============================================================================
// DormantClientsWidget — Co-pilote (2026-05-05)
//
// Widget compact "🔥 X clients dormants = ~Y PV à reconquérir".
// Click → ouvre la modale liste détaillée avec actions de relance directe
// WhatsApp (lien wa.me pré-rempli avec template).
//
// Skippe silencieusement si aucun dormant (ne pollue pas le Co-pilote
// quand tout est OK).
// =============================================================================

import { useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { useDormantClients, URGENCY_META } from "../../hooks/useDormantClients";
import { DormantClientsModal } from "./DormantClientsModal";

export function DormantClientsWidget() {
  const { currentUser } = useAppContext();
  const { clients, totalPv, loading } = useDormantClients(currentUser?.id ?? null);
  const [open, setOpen] = useState(false);

  // Pas afficher tant que ça charge ou si rien à relancer
  if (!currentUser || loading || clients.length === 0) return null;

  // Compteurs par urgence (pour mini badges)
  const counts = {
    high: clients.filter((c) => c.urgency === "high").length,
    medium: clients.filter((c) => c.urgency === "medium").length,
    recent: clients.filter((c) => c.urgency === "recent").length,
    never: clients.filter((c) => c.urgency === "never").length,
  };

  // Préview les 3 clients les plus urgents
  const preview = clients.slice(0, 3);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={cardStyle}
        className="ls-dormant-widget"
      >
        <div style={leftStyle}>
          <div style={eyebrowStyle}>🔥 Plan de relance · aujourd'hui</div>
          <h3 style={titleStyle}>
            <strong style={{ color: "var(--ls-coral)" }}>{clients.length}</strong>
            {" "}client{clients.length > 1 ? "s" : ""} dormant{clients.length > 1 ? "s" : ""}
            {" = "}
            <strong style={{ color: "var(--ls-gold)" }}>~{totalPv.toLocaleString("fr-FR")} PV</strong>
            {" à reconquérir"}
          </h3>

          {/* Badges urgence */}
          <div style={badgesRowStyle}>
            {counts.never > 0 && (
              <Badge color={URGENCY_META.never.color} label={`${counts.never} jamais commandé`} emoji={URGENCY_META.never.emoji} />
            )}
            {counts.high > 0 && (
              <Badge color={URGENCY_META.high.color} label={`${counts.high} très dormants`} emoji={URGENCY_META.high.emoji} />
            )}
            {counts.medium > 0 && (
              <Badge color={URGENCY_META.medium.color} label={`${counts.medium} dormants`} emoji={URGENCY_META.medium.emoji} />
            )}
            {counts.recent > 0 && (
              <Badge color={URGENCY_META.recent.color} label={`${counts.recent} récents`} emoji={URGENCY_META.recent.emoji} />
            )}
          </div>

          {/* Preview top 3 */}
          <div style={previewRowStyle}>
            {preview.map((c) => (
              <span key={c.client_id} style={previewChipStyle}>
                {c.client_name.split(" ")[0]}
              </span>
            ))}
            {clients.length > 3 && (
              <span style={moreChipStyle}>+{clients.length - 3}</span>
            )}
          </div>
        </div>

        <div style={rightStyle}>
          <span style={ctaArrowStyle}>→</span>
        </div>
      </button>

      {open && (
        <DormantClientsModal
          clients={clients}
          totalPv={totalPv}
          onClose={() => setOpen(false)}
        />
      )}

      <style>{`
        .ls-dormant-widget {
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }
        .ls-dormant-widget:hover {
          transform: translateY(-2px);
          border-color: color-mix(in srgb, var(--ls-coral) 40%, var(--ls-border));
          box-shadow: 0 12px 28px color-mix(in srgb, var(--ls-coral) 14%, transparent);
        }
        @media (prefers-reduced-motion: reduce) {
          .ls-dormant-widget { transition: none; }
          .ls-dormant-widget:hover { transform: none; }
        }
      `}</style>
    </>
  );
}

function Badge({ color, label, emoji }: { color: string; label: string; emoji: string }) {
  return (
    <span
      style={{
        fontSize: 10, padding: "2px 8px", borderRadius: 8,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        color, border: `0.5px solid color-mix(in srgb, ${color} 40%, transparent)`,
        fontFamily: "DM Sans, sans-serif", fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      <span aria-hidden="true">{emoji}</span> {label}
    </span>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, color-mix(in srgb, var(--ls-coral) 8%, var(--ls-surface)) 0%, var(--ls-surface) 70%)",
  border: "0.5px solid color-mix(in srgb, var(--ls-coral) 28%, var(--ls-border))",
  borderRadius: 18,
  padding: "16px 20px",
  display: "flex",
  alignItems: "center",
  gap: 14,
  cursor: "pointer",
  textAlign: "left",
  width: "100%",
  boxShadow: "0 4px 16px color-mix(in srgb, var(--ls-coral) 6%, transparent)",
};

const leftStyle: React.CSSProperties = {
  flex: 1, minWidth: 0,
};

const rightStyle: React.CSSProperties = {
  flex: "0 0 auto",
};

const ctaArrowStyle: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontSize: 24,
  color: "var(--ls-coral)",
  fontWeight: 800,
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 10, color: "var(--ls-coral)", textTransform: "uppercase",
  letterSpacing: 1.4, fontWeight: 700, marginBottom: 4,
  fontFamily: "DM Sans, sans-serif",
};

const titleStyle: React.CSSProperties = {
  margin: 0, fontFamily: "Syne, sans-serif",
  fontSize: 16, fontWeight: 700, color: "var(--ls-text)",
  lineHeight: 1.35,
};

const badgesRowStyle: React.CSSProperties = {
  display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8,
};

const previewRowStyle: React.CSSProperties = {
  display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10,
};

const previewChipStyle: React.CSSProperties = {
  fontSize: 11,
  fontFamily: "DM Sans, sans-serif",
  padding: "3px 10px",
  borderRadius: 999,
  background: "var(--ls-surface2)",
  border: "0.5px solid var(--ls-border)",
  color: "var(--ls-text)",
  fontWeight: 500,
};

const moreChipStyle: React.CSSProperties = {
  ...previewChipStyle,
  color: "var(--ls-text-muted)",
  fontWeight: 700,
};
