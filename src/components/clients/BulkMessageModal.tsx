// =============================================================================
// BulkMessageModal — envoi multi-clients (Tier B C V2 — 2026-04-28)
// =============================================================================
//
// Quand le coach selectionne N clients dans /clients et clique
// "Envoyer un message", cette modale s ouvre :
//   1. Selection d un template (5 templates existants).
//   2. Apercu editable du message (avec interpolation contextuelle par
//      client — le 1er client sert de preview).
//   3. Liste des N clients avec un bouton WhatsApp / SMS par ligne.
//
// Pourquoi pas un envoi automatique ? Les browsers bloquent les pop-ups
// multiples (impossible d ouvrir 5 wa.me en serie). On laisse le coach
// cliquer 1 par 1 — chaque click ouvre un onglet/app individuel.
//
// Bonus : bouton "Copier la liste WhatsApp" qui copie une suite de
// liens wa.me?... formatte. Utile pour coller dans Notes ou par mail.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import {
  buildWhatsAppLink,
  getApplicableTemplates,
  MESSAGE_TEMPLATES,
  type MessageTemplate,
} from "../../lib/messageTemplates";
import type { Client } from "../../types/domain";

interface Props {
  clients: Client[];
  onClose: () => void;
}

type Channel = "whatsapp" | "sms";

export function BulkMessageModal({ clients, onClose }: Props) {
  const { currentUser, visibleFollowUps } = useAppContext();
  const { push: pushToast } = useToast();

  const ctx = useMemo(
    () => ({
      coachFirstName: currentUser?.name?.split(/\s+/)[0] ?? "Ton coach",
      followUps: visibleFollowUps,
      now: new Date(),
    }),
    [currentUser, visibleFollowUps],
  );

  // Score chaque template par % de clients selectionnes pour qui il est
  // pertinent. Met le plus pertinent en premier dans la liste.
  const orderedTemplates = useMemo(() => {
    const scored = MESSAGE_TEMPLATES.map((t) => {
      const matches = clients.filter((c) => {
        const applicable = getApplicableTemplates(c, ctx);
        return applicable.some((a) => a.id === t.id);
      }).length;
      return { template: t, matches };
    });
    return scored.sort((a, b) => b.matches - a.matches);
  }, [clients, ctx]);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    orderedTemplates[0]?.template.id ?? MESSAGE_TEMPLATES[0]?.id ?? "",
  );

  const selectedTemplate: MessageTemplate | undefined = useMemo(
    () => MESSAGE_TEMPLATES.find((t) => t.id === selectedTemplateId),
    [selectedTemplateId],
  );

  // Le draft est buildé à partir du 1er client (fallback). Pour l envoi,
  // on re-génère le message PAR CLIENT (chaque message est personnalise
  // au prénom + chiffres du client cible).
  const previewClient = clients[0];
  const [draftPreview, setDraftPreview] = useState("");

  useEffect(() => {
    if (!selectedTemplate || !previewClient) {
      setDraftPreview("");
      return;
    }
    setDraftPreview(selectedTemplate.render(previewClient, ctx));
  }, [selectedTemplate, previewClient, ctx]);

  function buildMessageFor(client: Client): string {
    if (!selectedTemplate) return draftPreview;
    return selectedTemplate.render(client, ctx);
  }

  function handleChannelClick(client: Client, channel: Channel) {
    const text = buildMessageFor(client);
    const phoneClean = (client.phone || "").replace(/[^\d+]/g, "");
    if (channel === "whatsapp") {
      const url = buildWhatsAppLink(client.phone, text);
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      const encoded = encodeURIComponent(text);
      const url = phoneClean ? `sms:${phoneClean}?body=${encoded}` : `sms:?body=${encoded}`;
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  function handleCopyList() {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    const lines = clients.map((c) => {
      const phoneClean = (c.phone || "").replace(/[^\d+]/g, "");
      const text = buildMessageFor(c);
      const url = buildWhatsAppLink(c.phone, text);
      return `${c.firstName} ${c.lastName}${phoneClean ? ` (${c.phone})` : ""}\n${url}`;
    });
    const blob = lines.join("\n\n---\n\n");
    navigator.clipboard.writeText(blob).catch(() => {});
    pushToast({
      tone: "success",
      title: "Liste copiée",
      message: `${clients.length} liens WhatsApp dans le presse-papier.`,
    });
  }

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
        role="dialog"
        aria-modal="true"
        aria-label="Envoyer un message en masse"
        style={{
          width: "100%",
          maxWidth: 720,
          maxHeight: "92vh",
          background: "var(--ls-surface)",
          border: "0.5px solid var(--ls-border)",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.30)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "0.5px solid var(--ls-border)",
            display: "flex",
            alignItems: "flex-start",
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
              💬 Envoyer un message à {clients.length} client
              {clients.length > 1 ? "s" : ""}
            </div>
            <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 2 }}>
              Choisis un template, vérifie l&apos;aperçu, puis envoie via le canal de ton choix par client.
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

        {/* Body */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(200px, 240px) 1fr",
            flex: 1,
            minHeight: 0,
          }}
        >
          {/* Liste templates */}
          <div
            style={{
              borderRight: "0.5px solid var(--ls-border)",
              background: "var(--ls-surface2)",
              padding: 8,
              overflowY: "auto",
            }}
          >
            <div
              style={{
                padding: "6px 10px 8px",
                fontSize: 9,
                letterSpacing: 1.4,
                textTransform: "uppercase",
                fontWeight: 700,
                color: "var(--ls-text-hint)",
              }}
            >
              Templates
            </div>
            {orderedTemplates.map(({ template, matches }) => {
              const isSelected = selectedTemplateId === template.id;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setSelectedTemplateId(template.id)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    width: "100%",
                    padding: "10px",
                    marginBottom: 4,
                    background: isSelected
                      ? "color-mix(in srgb, var(--ls-gold) 12%, transparent)"
                      : "transparent",
                    border: isSelected
                      ? "0.5px solid var(--ls-gold)"
                      : "0.5px solid transparent",
                    borderRadius: 10,
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                  }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{template.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--ls-text)",
                        marginBottom: 2,
                      }}
                    >
                      {template.label}
                    </div>
                    {matches > 0 ? (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: 0.4,
                          padding: "1px 5px",
                          borderRadius: 3,
                          background: "color-mix(in srgb, var(--ls-teal) 18%, transparent)",
                          color: "var(--ls-teal)",
                        }}
                      >
                        {matches} / {clients.length} pertinent
                        {matches > 1 ? "s" : ""}
                      </span>
                    ) : (
                      <div style={{ fontSize: 10, color: "var(--ls-text-hint)" }}>
                        {template.description}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Preview + liste clients */}
          <div
            style={{
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                fontWeight: 700,
                color: "var(--ls-text-hint)",
              }}
            >
              Aperçu (avec {previewClient?.firstName ?? "client"})
            </div>
            <textarea
              value={draftPreview}
              onChange={(e) => setDraftPreview(e.target.value)}
              rows={4}
              style={{
                padding: 10,
                background: "var(--ls-surface2)",
                border: "0.5px solid var(--ls-border)",
                borderRadius: 8,
                fontFamily: "inherit",
                fontSize: 12,
                lineHeight: 1.5,
                color: "var(--ls-text)",
                resize: "none",
                outline: "none",
              }}
            />
            <div
              style={{
                fontSize: 10,
                color: "var(--ls-text-hint)",
                fontStyle: "italic",
              }}
            >
              💡 Le message envoyé est personnalisé par client (prénom, chiffres).
              L&apos;aperçu ci-dessus utilise les données du 1er client.
            </div>

            {/* Liste clients */}
            <div
              style={{
                fontSize: 10,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                fontWeight: 700,
                color: "var(--ls-text-hint)",
                marginTop: 4,
              }}
            >
              Clients sélectionnés
            </div>
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                padding: 2,
              }}
            >
              {clients.map((c) => {
                const phoneClean = (c.phone || "").replace(/[^\d+]/g, "");
                const hasPhone = phoneClean.length > 0;
                return (
                  <div
                    key={c.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      background: "var(--ls-surface2)",
                      border: "0.5px solid var(--ls-border)",
                      borderRadius: 9,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--ls-text)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {c.firstName} {c.lastName}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--ls-text-muted)",
                        }}
                      >
                        {hasPhone ? c.phone : "Pas de numéro"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleChannelClick(c, "whatsapp")}
                      title="WhatsApp"
                      style={{
                        padding: "6px 10px",
                        background:
                          "color-mix(in srgb, var(--ls-teal) 14%, var(--ls-surface))",
                        border: "0.5px solid color-mix(in srgb, var(--ls-teal) 40%, transparent)",
                        color: "var(--ls-teal)",
                        borderRadius: 7,
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: "inherit",
                        cursor: "pointer",
                      }}
                    >
                      📱 WA
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChannelClick(c, "sms")}
                      title="SMS"
                      disabled={!hasPhone}
                      style={{
                        padding: "6px 10px",
                        background: hasPhone
                          ? "color-mix(in srgb, var(--ls-purple) 12%, var(--ls-surface))"
                          : "var(--ls-surface)",
                        border: "0.5px solid color-mix(in srgb, var(--ls-purple) 40%, transparent)",
                        color: hasPhone ? "var(--ls-purple)" : "var(--ls-text-hint)",
                        borderRadius: 7,
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: "inherit",
                        cursor: hasPhone ? "pointer" : "not-allowed",
                        opacity: hasPhone ? 1 : 0.5,
                      }}
                    >
                      💬 SMS
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 16px",
            borderTop: "0.5px solid var(--ls-border)",
            background: "var(--ls-surface2)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: 10, color: "var(--ls-text-hint)" }}>
            ⚠️ Les browsers bloquent l&apos;ouverture de plusieurs onglets en série.
            Click un par un.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={handleCopyList}
              style={{
                padding: "8px 14px",
                background: "var(--ls-surface)",
                border: "0.5px solid var(--ls-border)",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                color: "var(--ls-text)",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              📋 Copier la liste
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 14px",
                background: "transparent",
                border: "0.5px solid var(--ls-border)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--ls-text-muted)",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
