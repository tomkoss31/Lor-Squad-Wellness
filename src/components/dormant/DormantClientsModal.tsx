// =============================================================================
// DormantClientsModal — liste détaillée des clients dormants (2026-05-05)
//
// Click sur le widget Co-pilote → ouvre cette modale.
// Pour chaque client : nom, urgence, jours, PV potentiel, dernier programme.
// Boutons : "💬 Relancer WhatsApp" (lien wa.me) + "📋 Voir la fiche".
// =============================================================================

import { useNavigate } from "react-router-dom";
import {
  URGENCY_META,
  type DormantClient,
} from "../../hooks/useDormantClients";

interface DormantClientsModalProps {
  clients: DormantClient[];
  totalPv: number;
  onClose: () => void;
}

function buildRelanceMessage(client: DormantClient): string {
  const firstName = (client.client_name ?? "").trim().split(/\s+/)[0] || "Salut";
  if (client.urgency === "never") {
    return `Hey ${firstName} ! Je pense à toi 🌱 Tu m'avais montré de l'intérêt pour démarrer un programme — où tu en es ? Je te rappelle que je suis là pour t'accompagner dès que tu veux.`;
  }
  return `Hey ${firstName} ! Ça fait un moment qu'on s'est pas parlé 🌿 Je voulais prendre de tes nouvelles, comment tu te sens en ce moment ? Si tu veux qu'on refasse un point ensemble dis-moi.`;
}

function whatsappLink(phone: string | null, message: string): string | null {
  if (!phone) return null;
  // Nettoyer le téléphone (retirer espaces, +, etc.)
  const cleaned = phone.replace(/[^\d]/g, "");
  if (!cleaned) return null;
  // Si commence par 0 (FR) → 33 + reste
  const formatted = cleaned.startsWith("0") ? "33" + cleaned.slice(1) : cleaned;
  return `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`;
}

function formatRelative(iso: string | null, days: number): string {
  if (!iso) return "Jamais";
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 30) return `Il y a ${days} jours`;
  if (days < 60) return `Il y a ${Math.floor(days / 7)} semaines`;
  if (days < 365) return `Il y a ${Math.floor(days / 30)} mois`;
  return `Il y a ${Math.floor(days / 365)} an(s)`;
}

export function DormantClientsModal({ clients, totalPv, onClose }: DormantClientsModalProps) {
  const navigate = useNavigate();

  return (
    <div style={overlayStyle} onClick={onClose} role="dialog" aria-modal="true">
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} style={closeBtnStyle} aria-label="Fermer">×</button>

        {/* Header */}
        <div style={headerStyle}>
          <div style={eyebrowStyle}>🔥 Plan de relance</div>
          <h2 style={titleStyle}>
            {clients.length} client{clients.length > 1 ? "s" : ""} à reconquérir
          </h2>
          <div style={pvBigStyle}>
            <span style={pvNumberStyle}>{totalPv.toLocaleString("fr-FR")}</span>
            <span style={pvUnitStyle}>PV potentiels</span>
          </div>
          <p style={subtitleStyle}>
            Ces clients n'ont pas commandé depuis longtemps. Une relance bien placée = du PV qui revient sans prospecter.
          </p>
        </div>

        {/* Liste */}
        {clients.length === 0 ? (
          <div style={emptyStyle}>
            🎉 Personne à relancer ! Tous tes clients sont à jour.
          </div>
        ) : (
          <ul style={listStyle}>
            {clients.map((c) => {
              const meta = URGENCY_META[c.urgency];
              const message = buildRelanceMessage(c);
              const waLink = whatsappLink(c.client_phone, message);

              return (
                <li key={c.client_id} style={cardStyle(meta.color)}>
                  {/* Header card */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={nameStyle}>{c.client_name}</span>
                      <span style={urgencyPillStyle(meta.color)}>
                        {meta.emoji} {meta.label}
                      </span>
                    </div>
                    <span style={pvPillStyle}>~{c.pv_potential} PV</span>
                  </div>

                  {/* Sub info */}
                  <div style={subInfoStyle}>
                    <span>📅 {formatRelative(c.last_order_date, c.days_since_last_order)}</span>
                    {c.last_program_name && <span>· {c.last_program_name}</span>}
                  </div>

                  {/* Actions */}
                  <div style={actionsRowStyle}>
                    {waLink ? (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={primaryBtnStyle(meta.color)}
                      >
                        💬 Relancer WhatsApp
                      </a>
                    ) : (
                      <span style={{ ...primaryBtnStyle(meta.color), opacity: 0.4, pointerEvents: "none", textAlign: "center" }}>
                        💬 Pas de tél
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        navigate(`/clients/${c.client_id}`);
                      }}
                      style={ghostBtnStyle}
                    >
                      Voir la fiche
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <button type="button" onClick={onClose} style={closeBigBtnStyle}>
          Fermer
        </button>
      </div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0,
  background: "color-mix(in srgb, var(--ls-bg) 80%, transparent)",
  backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
  zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
  padding: "20px 16px", overflowY: "auto",
};

const modalStyle: React.CSSProperties = {
  position: "relative", width: "100%", maxWidth: 580,
  maxHeight: "calc(100vh - 40px)", overflowY: "auto",
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 22, padding: "26px 24px",
  boxShadow: "0 24px 72px color-mix(in srgb, var(--ls-coral) 18%, transparent)",
};

const closeBtnStyle: React.CSSProperties = {
  position: "absolute", top: 12, right: 14,
  width: 36, height: 36, borderRadius: 12,
  background: "transparent", border: "none",
  color: "var(--ls-text-muted)", fontSize: 26, cursor: "pointer", lineHeight: 1,
};

const headerStyle: React.CSSProperties = {
  textAlign: "center", marginBottom: 20, paddingRight: 30,
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 10, color: "var(--ls-coral)", textTransform: "uppercase",
  letterSpacing: 1.4, fontWeight: 700, marginBottom: 4,
};

const titleStyle: React.CSSProperties = {
  margin: "0 0 12px", fontFamily: "Syne, sans-serif",
  fontSize: 22, fontWeight: 800, color: "var(--ls-text)",
};

const pvBigStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "baseline", gap: 6,
  padding: "10px 18px", borderRadius: 14,
  background: "color-mix(in srgb, var(--ls-gold) 10%, var(--ls-surface2))",
  border: "0.5px solid color-mix(in srgb, var(--ls-gold) 35%, transparent)",
  marginBottom: 10,
};

const pvNumberStyle: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontSize: 28, fontWeight: 800, color: "var(--ls-gold)",
};

const pvUnitStyle: React.CSSProperties = {
  fontSize: 12, color: "var(--ls-text-muted)", fontWeight: 600,
  textTransform: "uppercase", letterSpacing: 0.6,
};

const subtitleStyle: React.CSSProperties = {
  margin: 0, fontSize: 13, color: "var(--ls-text-muted)",
  lineHeight: 1.5, maxWidth: 460, marginInline: "auto",
};

const listStyle: React.CSSProperties = {
  margin: 0, padding: 0, listStyle: "none",
  display: "flex", flexDirection: "column", gap: 10,
};

const cardStyle = (color: string): React.CSSProperties => ({
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderLeft: `3px solid ${color}`,
  borderRadius: 14, padding: "14px 16px",
});

const nameStyle: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontSize: 15, fontWeight: 700, color: "var(--ls-text)",
};

const urgencyPillStyle = (color: string): React.CSSProperties => ({
  fontSize: 10, padding: "2px 8px", borderRadius: 8,
  background: `color-mix(in srgb, ${color} 14%, transparent)`,
  color, border: `0.5px solid ${color}`,
  fontFamily: "DM Sans, sans-serif", fontWeight: 600,
});

const pvPillStyle: React.CSSProperties = {
  fontSize: 12, fontFamily: "Syne, sans-serif", fontWeight: 700,
  color: "var(--ls-gold)",
  background: "color-mix(in srgb, var(--ls-gold) 12%, transparent)",
  padding: "3px 10px", borderRadius: 8,
  border: "0.5px solid color-mix(in srgb, var(--ls-gold) 35%, transparent)",
  whiteSpace: "nowrap",
};

const subInfoStyle: React.CSSProperties = {
  fontSize: 11, color: "var(--ls-text-muted)",
  display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12,
};

const actionsRowStyle: React.CSSProperties = {
  display: "flex", gap: 8, flexWrap: "wrap",
};

const primaryBtnStyle = (color: string): React.CSSProperties => ({
  flex: "1 1 auto", display: "inline-block",
  padding: "10px 14px", borderRadius: 10,
  border: "none", cursor: "pointer",
  background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 75%, var(--ls-coral)))`,
  color: "var(--ls-bg)",
  fontFamily: "Syne, sans-serif", fontSize: 12, fontWeight: 700,
  textDecoration: "none", textAlign: "center",
});

const ghostBtnStyle: React.CSSProperties = {
  padding: "10px 14px", borderRadius: 10,
  border: "0.5px solid var(--ls-border)",
  background: "transparent", color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif", fontSize: 12, cursor: "pointer",
};

const closeBigBtnStyle: React.CSSProperties = {
  width: "100%", marginTop: 18,
  padding: "12px 18px", borderRadius: 12,
  border: "0.5px solid var(--ls-border)",
  background: "transparent", color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer",
};

const emptyStyle: React.CSSProperties = {
  textAlign: "center", padding: "40px 20px",
  color: "var(--ls-text-muted)", fontSize: 14,
};
