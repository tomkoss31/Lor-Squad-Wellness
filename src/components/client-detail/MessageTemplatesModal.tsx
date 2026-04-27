// =============================================================================
// MessageTemplatesModal — popup multi-canal pour envoyer un message au client
// (Chantier E refonte, 2026-04-29)
// =============================================================================
//
// Pattern aligne avec ClientAccessModal / BirthdayBlock : modal popup plein
// ecran avec backdrop, card centree, et boutons multi-canal en bas.
//
// Flow :
//   1. User selectionne un template dans la liste de gauche (templates
//      pertinents en premier avec badge PERTINENT).
//   2. Le message rendu apparait dans la textarea editable au centre.
//   3. User peut editer librement (interpolation = point de depart).
//   4. 4 boutons d action : WhatsApp / SMS / Telegram / Copier.
//
// Telegram : on utilise t.me/share/url qui ouvre le picker de contact
// Telegram (web ou app native). Pas besoin d auth, fonctionne meme sans
// numero stocke.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import {
  buildWhatsAppLink,
  getApplicableTemplates,
  MESSAGE_TEMPLATES,
  type MessageTemplate,
} from "../../lib/messageTemplates";
import type { Client } from "../../types/domain";

interface MessageTemplatesModalProps {
  client: Client;
  open: boolean;
  onClose: () => void;
  /** Pre-selectionne un template a l ouverture (ex: relance-douce si pause). */
  preselectedTemplateId?: string;
}

export function MessageTemplatesModal({
  client,
  open,
  onClose,
  preselectedTemplateId,
}: MessageTemplatesModalProps) {
  const { currentUser, visibleFollowUps } = useAppContext();

  const ctx = useMemo(
    () => ({
      coachFirstName: currentUser?.name?.split(/\s+/)[0] ?? "Ton coach",
      followUps: visibleFollowUps,
      now: new Date(),
    }),
    [currentUser, visibleFollowUps],
  );

  const applicable = useMemo(() => getApplicableTemplates(client, ctx), [client, ctx]);
  const applicableIds = useMemo(() => new Set(applicable.map((t) => t.id)), [applicable]);

  // Premier template par defaut : preselected > pertinent > premier de la liste
  const defaultTemplateId =
    preselectedTemplateId
    ?? applicable[0]?.id
    ?? MESSAGE_TEMPLATES[0]?.id;

  const [selectedId, setSelectedId] = useState<string>(defaultTemplateId);
  const [draft, setDraft] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setSelectedId(defaultTemplateId);
      setCopied(false);
    }
  }, [open, defaultTemplateId]);

  // Re-render template when selection change
  useEffect(() => {
    const tmpl = MESSAGE_TEMPLATES.find((t) => t.id === selectedId);
    if (tmpl) {
      setDraft(tmpl.render(client, ctx));
    }
  }, [selectedId, client, ctx]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const phoneClean = (client.phone || "").replace(/[^\d+]/g, "");

  function handleCopy() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(draft).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  function handleWhatsApp() {
    const url = buildWhatsAppLink(client.phone, draft);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleSMS() {
    const text = encodeURIComponent(draft);
    const url = phoneClean ? `sms:${phoneClean}?body=${text}` : `sms:?body=${text}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleTelegram() {
    // t.me/share/url ouvre le picker de contact Telegram (web ou app)
    const text = encodeURIComponent(draft);
    const url = `https://t.me/share/url?url=&text=${text}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // Tri : pertinents en premier, puis le reste
  const sortedTemplates: MessageTemplate[] = [
    ...applicable,
    ...MESSAGE_TEMPLATES.filter((t) => !applicableIds.has(t.id)),
  ];

  const fname = (client.firstName || "").trim() || "ce client";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 720,
          maxHeight: "90vh",
          background: "var(--ls-surface)",
          border: "0.5px solid var(--ls-border)",
          borderRadius: 18,
          boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "0.5px solid var(--ls-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "Syne, sans-serif",
                fontSize: 18,
                fontWeight: 600,
                color: "var(--ls-text)",
              }}
            >
              💬 Envoyer un message à {fname}
            </div>
            <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 2 }}>
              Choisis un template, edite si besoin, puis envoie via le canal de ton choix.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{
              background: "transparent",
              border: "none",
              fontSize: 22,
              color: "var(--ls-text-muted)",
              cursor: "pointer",
              lineHeight: 1,
              padding: 4,
            }}
          >
            ×
          </button>
        </div>

        {/* Body : 2 colonnes (templates | preview) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(220px, 260px) 1fr",
            flex: 1,
            minHeight: 0,
          }}
        >
          {/* Liste templates */}
          <div
            style={{
              borderRight: "0.5px solid var(--ls-border)",
              padding: 8,
              overflowY: "auto",
              background: "var(--ls-surface2)",
            }}
          >
            <div
              style={{
                padding: "6px 10px 8px",
                fontSize: 9,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                color: "var(--ls-text-hint)",
                fontWeight: 600,
              }}
            >
              {applicable.length > 0
                ? `${applicable.length} suggestion${applicable.length > 1 ? "s" : ""}`
                : "Templates"}
            </div>
            {sortedTemplates.map((template) => {
              const isApplicable = applicableIds.has(template.id);
              const isSelected = selectedId === template.id;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setSelectedId(template.id)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    padding: "10px 10px",
                    background: isSelected
                      ? "color-mix(in srgb, var(--ls-gold) 12%, transparent)"
                      : "transparent",
                    border: isSelected
                      ? "0.5px solid var(--ls-gold)"
                      : "0.5px solid transparent",
                    borderRadius: 10,
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                    marginBottom: 4,
                    fontFamily: "inherit",
                    transition: "background 120ms ease",
                  }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{template.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: "var(--ls-text)",
                        }}
                      >
                        {template.label}
                      </span>
                      {isApplicable && (
                        <span
                          style={{
                            fontSize: 8,
                            padding: "1px 5px",
                            borderRadius: 4,
                            background: "color-mix(in srgb, var(--ls-teal) 18%, transparent)",
                            color: "var(--ls-teal)",
                            fontWeight: 700,
                            letterSpacing: 0.5,
                          }}
                        >
                          PERTINENT
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--ls-text-muted)",
                        marginTop: 2,
                        lineHeight: 1.3,
                      }}
                    >
                      {template.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Preview editable */}
          <div
            style={{
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              minHeight: 0,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "var(--ls-text-hint)",
                textTransform: "uppercase",
                letterSpacing: 1.2,
                fontWeight: 600,
              }}
            >
              Apercu du message
            </div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              style={{
                flex: 1,
                minHeight: 240,
                padding: 12,
                background: "var(--ls-surface2)",
                border: "0.5px solid var(--ls-border)",
                borderRadius: 10,
                fontFamily: "inherit",
                fontSize: 13,
                lineHeight: 1.5,
                color: "var(--ls-text)",
                resize: "vertical",
                outline: "none",
              }}
            />
            <div style={{ fontSize: 10, color: "var(--ls-text-hint)" }}>
              {phoneClean
                ? `📞 ${client.phone} — pre-rempli sur WhatsApp / SMS`
                : "⚠️ Pas de numero — ouvre WhatsApp / SMS sans destinataire"}
            </div>
          </div>
        </div>

        {/* Footer : 4 boutons multi-canal */}
        <div
          style={{
            padding: 14,
            borderTop: "0.5px solid var(--ls-border)",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
            background: "var(--ls-surface2)",
          }}
        >
          <ChannelButton
            icon="📱"
            label="WhatsApp"
            tone="teal"
            onClick={handleWhatsApp}
          />
          <ChannelButton
            icon="💬"
            label="SMS"
            tone="purple"
            onClick={handleSMS}
          />
          <ChannelButton
            icon="✈️"
            label="Telegram"
            tone="teal"
            onClick={handleTelegram}
          />
          <ChannelButton
            icon={copied ? "✓" : "📋"}
            label={copied ? "Copie !" : "Copier"}
            tone="gold"
            onClick={handleCopy}
          />
        </div>
      </div>
    </div>
  );
}

// ─── ChannelButton ───────────────────────────────────────────────────────────

interface ChannelButtonProps {
  icon: string;
  label: string;
  tone: "gold" | "teal" | "purple" | "coral";
  onClick: () => void;
}

function ChannelButton({ icon, label, tone, onClick }: ChannelButtonProps) {
  const color = `var(--ls-${tone})`;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        padding: "12px 8px",
        background: `color-mix(in srgb, ${color} 10%, var(--ls-surface))`,
        border: `0.5px solid color-mix(in srgb, ${color} 40%, transparent)`,
        borderRadius: 10,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "transform 120ms ease, background 120ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = `color-mix(in srgb, ${color} 18%, var(--ls-surface))`;
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = `color-mix(in srgb, ${color} 10%, var(--ls-surface))`;
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color }}>{label}</span>
    </button>
  );
}
