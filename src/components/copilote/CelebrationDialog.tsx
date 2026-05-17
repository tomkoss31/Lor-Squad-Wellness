// =============================================================================
// CelebrationDialog — popup multi-canal pour message célébration
// (Phase 0.5 brainstorm Égypte 2026-05, fix régression Co-pilote V5)
// =============================================================================
//
// Régression : la migration Co-pilote V5 du 8 mai 2026 avait remplacé le
// `BirthdayMessageDialog` riche par un `handleSendWhatsApp` direct sans
// modale, sans édition, sans choix canal. On rétablit une modale plus
// générique qui gère les 4 types de célébration (birthday / program_1m
// / program_3m / program_6m), avec message éditable et 4 boutons
// multi-canal (Copier / WhatsApp / SMS / Telegram) — pattern aligné
// sur `MessageTemplatesModal`.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { KIND_META, type Celebration } from "./CelebrationCard";

interface Props {
  celebration: Celebration;
  phone: string | null;
  coachFirstName: string;
  onClose: () => void;
}

function formatPhoneE164(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("0")) return "33" + digits.slice(1);
  return digits;
}

export function CelebrationDialog({ celebration, phone, coachFirstName, onClose }: Props) {
  const meta = KIND_META[celebration.kind];
  const initialMessage = useMemo(
    () => meta.message(celebration.first_name, celebration, coachFirstName),
    [celebration, coachFirstName, meta],
  );
  const [draft, setDraft] = useState<string>(initialMessage);
  const [copied, setCopied] = useState(false);

  // Reset quand on change de célébration
  useEffect(() => {
    setDraft(initialMessage);
    setCopied(false);
  }, [initialMessage]);

  // ESC pour fermer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const phoneE164 = phone ? formatPhoneE164(phone) : "";
  const phoneClean = phone ? phone.replace(/[^\d+]/g, "") : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("[celebration-dialog] copy failed", err);
    }
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(draft);
    const url = phoneE164
      ? `https://wa.me/${phoneE164}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSMS = () => {
    const text = encodeURIComponent(draft);
    const url = phoneClean ? `sms:${phoneClean}?body=${text}` : `sms:?body=${text}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleTelegram = () => {
    const text = encodeURIComponent(draft);
    const url = `https://t.me/share/url?url=&text=${text}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const titleEyebrow = `${meta.emoji} ${meta.label(celebration)} · ${celebration.first_name} ${celebration.last_name}`;

  return (
    <div
      role="presentation"
      aria-hidden="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- stopPropagation only, dialog role on element */}
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="celebration-dialog-title"
        style={{
          width: "100%",
          maxWidth: 520,
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
            padding: "16px 20px",
            borderBottom: "0.5px solid var(--ls-border)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 10,
                color: "var(--ls-text-muted)",
                letterSpacing: 1.4,
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              {titleEyebrow}
            </div>
            <div
              id="celebration-dialog-title"
              style={{
                fontFamily: "Syne, sans-serif",
                fontSize: 18,
                fontWeight: 600,
                color: "var(--ls-text)",
                marginTop: 4,
              }}
            >
              Message pour {celebration.first_name}
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

        {/* Textarea éditable */}
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              fontSize: 10,
              color: "var(--ls-text-hint)",
              textTransform: "uppercase",
              letterSpacing: 1.2,
              fontWeight: 600,
            }}
          >
            Aperçu (modifiable)
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={9}
            style={{
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
              minHeight: 180,
            }}
          />
          <div style={{ fontSize: 10, color: "var(--ls-text-hint)" }}>
            {phoneClean
              ? `📞 ${phone} — pré-rempli sur WhatsApp / SMS`
              : "⚠️ Pas de numéro — ouvre WhatsApp / SMS sans destinataire"}
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
          <ChannelButton icon="📱" label="WhatsApp" tone="teal" onClick={handleWhatsApp} />
          <ChannelButton icon="💬" label="SMS" tone="purple" onClick={handleSMS} />
          <ChannelButton icon="✈️" label="Telegram" tone="teal" onClick={handleTelegram} />
          <ChannelButton
            icon={copied ? "✓" : "📋"}
            label={copied ? "Copié !" : "Copier"}
            tone="gold"
            onClick={handleCopy}
          />
        </div>
      </div>
    </div>
  );
}

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
