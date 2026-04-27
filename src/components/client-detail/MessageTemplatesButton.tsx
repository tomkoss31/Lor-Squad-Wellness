// =============================================================================
// MessageTemplatesButton — CTA gold qui ouvre MessageTemplatesModal
// (Refonte 2026-04-29 : ancien dropdown remplace par modal popup)
// =============================================================================
//
// Bouton visible et premium dans l onglet Actions. Click -> ouvre la modal
// multi-canal (WhatsApp / SMS / Telegram / Copier).
// =============================================================================

import { useMemo, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { getApplicableTemplates } from "../../lib/messageTemplates";
import type { Client } from "../../types/domain";
import { MessageTemplatesModal } from "./MessageTemplatesModal";

interface MessageTemplatesButtonProps {
  client: Client;
  /** Pre-selectionne un template a l ouverture (ex: relance-douce). */
  preselectedTemplateId?: string;
  /** Variante d affichage : full = CTA gold large, compact = chip discret. */
  variant?: "full" | "compact";
}

export function MessageTemplatesButton({
  client,
  preselectedTemplateId,
  variant = "full",
}: MessageTemplatesButtonProps) {
  const { currentUser, visibleFollowUps } = useAppContext();
  const [open, setOpen] = useState(false);

  const ctx = useMemo(
    () => ({
      coachFirstName: currentUser?.name?.split(/\s+/)[0] ?? "Ton coach",
      followUps: visibleFollowUps,
      now: new Date(),
    }),
    [currentUser, visibleFollowUps],
  );

  const applicable = useMemo(
    () => getApplicableTemplates(client, ctx),
    [client, ctx],
  );

  const suggestionCount = applicable.length;

  if (variant === "compact") {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            background: "var(--ls-surface)",
            border: "0.5px solid var(--ls-border)",
            borderRadius: 10,
            color: "var(--ls-text)",
            fontSize: 12,
            fontFamily: "DM Sans, sans-serif",
            cursor: "pointer",
          }}
        >
          💬 Envoyer un message
          {suggestionCount > 0 && (
            <span
              style={{
                fontSize: 9,
                padding: "1px 6px",
                borderRadius: 4,
                background: "color-mix(in srgb, var(--ls-teal) 18%, transparent)",
                color: "var(--ls-teal)",
                fontWeight: 700,
              }}
            >
              {suggestionCount}
            </span>
          )}
        </button>
        <MessageTemplatesModal
          client={client}
          open={open}
          onClose={() => setOpen(false)}
          preselectedTemplateId={preselectedTemplateId}
        />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-tour-id="messages-quick-templates-cta"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          width: "100%",
          padding: "12px 14px",
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 18%, var(--ls-surface)), color-mix(in srgb, var(--ls-gold) 8%, var(--ls-surface)))",
          border: "0.5px solid color-mix(in srgb, var(--ls-gold) 45%, transparent)",
          borderRadius: 12,
          cursor: "pointer",
          fontFamily: "DM Sans, sans-serif",
          textAlign: "left",
          transition: "transform 120ms ease, box-shadow 120ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow =
            "0 6px 18px color-mix(in srgb, var(--ls-gold) 22%, transparent)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>💬</span>
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--ls-text)",
              }}
            >
              Envoyer un message
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--ls-text-muted)",
                marginTop: 1,
              }}
            >
              WhatsApp · SMS · Telegram · Copier
            </div>
          </div>
        </div>
        {suggestionCount > 0 && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 0.5,
              padding: "3px 8px",
              borderRadius: 6,
              background: "color-mix(in srgb, var(--ls-teal) 22%, transparent)",
              color: "var(--ls-teal)",
              flexShrink: 0,
            }}
          >
            {suggestionCount} SUGGESTION{suggestionCount > 1 ? "S" : ""}
          </span>
        )}
      </button>
      <MessageTemplatesModal
        client={client}
        open={open}
        onClose={() => setOpen(false)}
        preselectedTemplateId={preselectedTemplateId}
      />
    </>
  );
}
