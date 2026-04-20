import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Client, FollowUpProtocolLog } from "../../types/domain";
import { interpolateStepMessage, type FollowUpStep } from "../../data/followUpProtocol";

interface Props {
  step: FollowUpStep;
  client: Client;
  existingLog: FollowUpProtocolLog | undefined;
  onClose: () => void;
  onMarkSent: () => Promise<void> | void;
  busy: boolean;
}

/**
 * Chantier Protocole de suivi (2026-04-20) — popup "Voir étape".
 * Affiche le message interpolé + boutons Copier / WhatsApp / SMS, lien vers
 * le guide coach, et CTA "Marquer comme envoyé".
 */
export function FollowUpStepModal({
  step,
  client,
  existingLog,
  onClose,
  onMarkSent,
  busy,
}: Props) {
  const [copied, setCopied] = useState(false);

  const message = useMemo(
    () => interpolateStepMessage(step.clientMessage, { firstName: client.firstName }),
    [step, client.firstName]
  );
  const smsText = useMemo(
    () =>
      interpolateStepMessage(step.smsMessage || step.clientMessage, {
        firstName: client.firstName,
      }),
    [step, client.firstName]
  );

  // Numéro de téléphone normalisé pour wa.me (chiffres uniquement) + fallback
  const phoneDigits = (client.phone ?? "").replace(/\D/g, "");
  const waUrl = phoneDigits
    ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`
    : null;
  const smsUrl = client.phone ? `sms:${client.phone}?body=${encodeURIComponent(smsText)}` : null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback sans API clipboard — navigateur ancien
      setCopied(false);
    }
  }

  const alreadySent = Boolean(existingLog);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Fermer la fenêtre"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${step.title} — message pour ${client.firstName}`}
        style={{
          background: "var(--ls-surface)",
          borderRadius: 14,
          width: "100%",
          maxWidth: 440,
          padding: 22,
          border: "1px solid var(--ls-border)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: "var(--ls-text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 500 }}>
              {step.title.split("·")[0]?.trim() ?? step.id.toUpperCase()} · {client.firstName} {client.lastName}
            </div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, color: "var(--ls-text)", marginTop: 4 }}>
              {step.shortTitle} {step.iconEmoji}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{ flexShrink: 0, background: "transparent", border: "none", color: "var(--ls-text-muted)", fontSize: 22, cursor: "pointer", padding: 4, lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Message bloc */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 600, marginBottom: 8 }}>
            Message pour {client.firstName}
          </div>
          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background: "var(--ls-surface2)",
              border: "1px solid var(--ls-border)",
              fontSize: 14,
              lineHeight: 1.55,
              color: "var(--ls-text)",
              fontFamily: "'DM Sans', sans-serif",
              whiteSpace: "pre-wrap",
            }}
          >
            {message}
          </div>
        </div>

        {/* Boutons d'action */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
          <button
            type="button"
            onClick={handleCopy}
            style={{
              padding: "10px 0",
              borderRadius: 10,
              border: "1px solid var(--ls-border)",
              background: copied ? "color-mix(in srgb, var(--ls-teal) 12%, transparent)" : "var(--ls-surface2)",
              color: copied ? "var(--ls-teal)" : "var(--ls-text)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              transition: "all 150ms",
            }}
          >
            {copied ? "✓ Copié" : "📋 Copier"}
          </button>
          <a
            href={waUrl ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!waUrl}
            onClick={(e) => { if (!waUrl) e.preventDefault(); }}
            style={{
              padding: "10px 0",
              borderRadius: 10,
              border: "1px solid transparent",
              background: waUrl ? "rgba(37,211,102,0.1)" : "var(--ls-surface2)",
              color: waUrl ? "#16A34A" : "var(--ls-text-hint)",
              fontSize: 12,
              fontWeight: 600,
              cursor: waUrl ? "pointer" : "not-allowed",
              textAlign: "center",
              textDecoration: "none",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            WhatsApp
          </a>
          <a
            href={smsUrl ?? undefined}
            aria-disabled={!smsUrl}
            onClick={(e) => { if (!smsUrl) e.preventDefault(); }}
            style={{
              padding: "10px 0",
              borderRadius: 10,
              border: "1px solid var(--ls-border)",
              background: smsUrl ? "var(--ls-surface2)" : "var(--ls-surface2)",
              color: smsUrl ? "var(--ls-text)" : "var(--ls-text-hint)",
              fontSize: 12,
              fontWeight: 600,
              cursor: smsUrl ? "pointer" : "not-allowed",
              textAlign: "center",
              textDecoration: "none",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            SMS
          </a>
        </div>

        {/* Lien vers le guide coach */}
        <Link
          to={`/guide-suivi#${step.id}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 14px",
            borderRadius: 12,
            background: "color-mix(in srgb, var(--ls-teal) 7%, transparent)",
            border: "1px solid color-mix(in srgb, var(--ls-teal) 22%, transparent)",
            textDecoration: "none",
            marginBottom: 14,
            transition: "border-color 150ms",
          }}
        >
          <div style={{ fontSize: 16 }}>💡</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: "var(--ls-text)", fontWeight: 600 }}>
              Besoin d'aide pour présenter ?
            </div>
            <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 2 }}>
              Voir le guide coach complet
            </div>
          </div>
          <div style={{ fontSize: 14, color: "var(--ls-teal)", fontWeight: 600 }}>→</div>
        </Link>

        {/* Marquer comme envoyé */}
        <button
          type="button"
          onClick={() => void onMarkSent()}
          disabled={busy}
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: 12,
            border: "none",
            background: alreadySent ? "color-mix(in srgb, var(--ls-teal) 12%, transparent)" : "var(--ls-gold)",
            color: alreadySent ? "var(--ls-teal)" : "var(--ls-gold-contrast, #0B0D11)",
            fontSize: 14,
            fontWeight: 700,
            fontFamily: "'Syne', sans-serif",
            cursor: busy ? "wait" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "opacity 150ms",
          }}
        >
          {busy
            ? "Enregistrement…"
            : alreadySent
              ? `✓ Envoyé le ${new Date(existingLog!.sentAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} — marquer à nouveau`
              : "Marquer comme envoyé ✓"}
        </button>
      </div>
    </div>
  );
}
