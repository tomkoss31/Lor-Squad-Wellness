// =============================================================================
// MessageTemplatesButton — bouton + dropdown de templates pour /clients/:id
// (Chantier E, 2026-04-29)
// =============================================================================
//
// Affiche un bouton "Templates messages" qui ouvre un menu listant les
// templates pertinents pour le client courant. Click sur un template :
//   1. Construit le texte interpole avec les donnees client
//   2. Copie dans le presse-papier
//   3. Ouvre WhatsApp avec le numero pre-rempli
// =============================================================================

import { useMemo, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import {
  buildWhatsAppLink,
  getApplicableTemplates,
  MESSAGE_TEMPLATES,
} from "../../lib/messageTemplates";
import type { Client } from "../../types/domain";

interface MessageTemplatesButtonProps {
  client: Client;
}

export function MessageTemplatesButton({ client }: MessageTemplatesButtonProps) {
  const { currentUser, visibleFollowUps } = useAppContext();
  const [open, setOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const ctx = useMemo(
    () => ({
      coachFirstName: currentUser?.name?.split(/\s+/)[0] ?? "Ton coach",
      followUps: visibleFollowUps,
      now: new Date(),
    }),
    [currentUser, visibleFollowUps],
  );

  const applicable = useMemo(() => getApplicableTemplates(client, ctx), [client, ctx]);

  // Si aucun template pertinent, on affiche tous les templates en mode "manuel"
  const templatesToShow = applicable.length > 0 ? applicable : MESSAGE_TEMPLATES;

  function handleSelect(templateId: string) {
    const template = MESSAGE_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    const text = template.render(client, ctx);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    const url = buildWhatsAppLink(client.phone, text);
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    setCopiedId(templateId);
    setTimeout(() => {
      setCopiedId(null);
      setOpen(false);
    }, 1200);
  }

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Templates messages"
        aria-expanded={open}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 14px",
          background: "var(--ls-surface)",
          border: "0.5px solid var(--ls-border)",
          borderRadius: 10,
          color: "var(--ls-text-muted)",
          fontSize: 12,
          fontFamily: "DM Sans, sans-serif",
          cursor: "pointer",
        }}
      >
        💬 Templates message
        <span style={{ fontSize: 9, opacity: 0.6 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 30 }}
          />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              zIndex: 31,
              minWidth: 280,
              maxWidth: 360,
              background: "var(--ls-surface)",
              border: "0.5px solid var(--ls-border)",
              borderRadius: 12,
              padding: 6,
              boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <div
              style={{
                padding: "8px 10px",
                fontSize: 9,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                color: "var(--ls-text-hint)",
                fontWeight: 600,
              }}
            >
              {applicable.length > 0 ? `${applicable.length} suggestion${applicable.length > 1 ? "s" : ""}` : "Tous les templates"}
            </div>
            {templatesToShow.map((template) => {
              const isApplicable = applicable.some((a) => a.id === template.id);
              const isCopied = copiedId === template.id;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleSelect(template.id)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "10px 12px",
                    background: "transparent",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                    fontFamily: "DM Sans, sans-serif",
                    transition: "background 120ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--ls-surface2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{template.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: "var(--ls-text)",
                        }}
                      >
                        {template.label}
                      </span>
                      {isApplicable && (
                        <span
                          style={{
                            fontSize: 9,
                            padding: "1px 6px",
                            borderRadius: 4,
                            background: "color-mix(in srgb, var(--ls-teal) 15%, transparent)",
                            color: "var(--ls-teal)",
                            fontWeight: 600,
                          }}
                        >
                          PERTINENT
                        </span>
                      )}
                      {isCopied && (
                        <span
                          style={{
                            fontSize: 9,
                            padding: "1px 6px",
                            borderRadius: 4,
                            background: "color-mix(in srgb, var(--ls-gold) 15%, transparent)",
                            color: "var(--ls-gold)",
                            fontWeight: 600,
                          }}
                        >
                          ✓ COPIÉ
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 2, lineHeight: 1.4 }}>
                      {template.description}
                    </div>
                  </div>
                </button>
              );
            })}
            <div
              style={{
                padding: "8px 10px",
                fontSize: 10,
                color: "var(--ls-text-hint)",
                borderTop: "0.5px solid var(--ls-border)",
                marginTop: 4,
                paddingTop: 8,
              }}
            >
              💡 Le message est copié + WhatsApp s'ouvre avec le numéro pré-rempli
            </div>
          </div>
        </>
      )}
    </div>
  );
}
