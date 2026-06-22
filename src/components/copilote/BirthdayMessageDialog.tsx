// Chantier N (2026-04-26) : popup riche pour message anniversaire.
// Style aligne sur les popups suivi J+X (header petit + titre gros +
// card beige message + 3 boutons copier/whatsapp/sms + tip teal +
// bouton gold "marquer comme envoye").

import { useState } from "react";
import { createPortal } from "react-dom";
import type { Client } from "../../types/domain";
import { calculateAge } from "../../lib/age";
import {
  buildBirthdayMessage,
  buildBirthdayWhatsAppUrl,
  buildBirthdaySmsUrl,
} from "../../lib/birthdayMessage";

type Props = {
  client: Client;
  coachFirstName: string;
  onClose: () => void;
  onMarkSent: (clientId: string) => Promise<void> | void;
};

export function BirthdayMessageDialog({ client, coachFirstName, onClose, onMarkSent }: Props) {
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const age = calculateAge(client.birthDate);
  const message = buildBirthdayMessage({
    firstName: client.firstName,
    birthDate: client.birthDate,
    coachFirstName,
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("[birthday-dialog] copy failed", err);
    }
  };

  const handleMarkSent = async () => {
    setSending(true);
    try {
      await onMarkSent(client.id);
      onClose();
    } catch (err) {
      console.error("[birthday-dialog] mark sent failed", err);
    } finally {
      setSending(false);
    }
  };

  const waUrl = client.phone ? buildBirthdayWhatsAppUrl(client.phone, message) : null;
  const smsUrl = client.phone ? buildBirthdaySmsUrl(client.phone, message) : null;

  const overlay = (
    // Audit a11y 2026-04-30 : backdrop souris (ESC clavier au niveau dialog).
    <div
      role="presentation"
      aria-hidden="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10050,
        padding: "16px",
      }}
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events -- stopPropagation only, dialog role on element */}
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="birthday-dialog-title"
        style={{
          background: "var(--ls-surface)",
          border: "1px solid var(--ls-border)",
          borderRadius: "16px",
          maxWidth: "480px",
          width: "100%",
          padding: "24px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
          <div style={{
            fontSize: "10px",
            color: "var(--ls-text-muted)",
            letterSpacing: "1.5px",
            fontWeight: 500,
            textTransform: "uppercase",
          }}>
            🎂 Anniversaire · {client.firstName} {client.lastName}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "20px",
              color: "var(--ls-text-muted)",
              cursor: "pointer",
              padding: 0,
              lineHeight: 1,
            }}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        <div
          id="birthday-dialog-title"
          style={{
            fontSize: "22px",
            fontWeight: 500,
            color: "var(--ls-text)",
            marginBottom: "20px",
            fontFamily: "Syne, serif",
          }}
        >
          Joyeux anniversaire ! 🎂{age !== null ? ` ${age} ans` : ""}
        </div>

        <div style={{
          fontSize: "10px",
          color: "var(--ls-text-muted)",
          letterSpacing: "1.2px",
          fontWeight: 500,
          marginBottom: "8px",
          textTransform: "uppercase",
        }}>
          Message pour {client.firstName}
        </div>

        <div style={{
          background: "color-mix(in srgb, var(--ls-gold) 10%, var(--ls-surface2))",
          borderRadius: "12px",
          padding: "16px",
          fontSize: "15px",
          lineHeight: 1.5,
          color: "var(--ls-text)",
          marginBottom: "16px",
          whiteSpace: "pre-wrap",
        }}>
          {message}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "16px" }}>
          <button
            type="button"
            onClick={handleCopy}
            style={{
              background: copied ? "color-mix(in srgb, var(--ls-teal) 14%, transparent)" : "var(--ls-surface2)",
              color: copied ? "var(--ls-teal)" : "var(--ls-text)",
              border: "0.5px solid var(--ls-border)",
              padding: "10px 8px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
            }}
          >
            <span style={{ fontSize: "14px" }}>📋</span>
            {copied ? "Copié !" : "Copier"}
          </button>
          {waUrl ? (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: "#25D366",
                color: "white",
                border: "none",
                padding: "10px 8px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
              }}
            >
              WhatsApp
            </a>
          ) : (
            <button type="button" disabled style={{
              background: "var(--ls-surface2)", color: "var(--ls-text-hint)", border: "0.5px solid var(--ls-border)",
              padding: "10px 8px", borderRadius: "8px", fontSize: "12px", cursor: "not-allowed",
            }}>
              WhatsApp
            </button>
          )}
          {smsUrl ? (
            <a
              href={smsUrl}
              style={{
                background: "var(--ls-surface2)",
                color: "var(--ls-text)",
                border: "0.5px solid var(--ls-border)",
                padding: "10px 8px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
              }}
            >
              SMS
            </a>
          ) : (
            <button type="button" disabled style={{
              background: "var(--ls-surface2)", color: "var(--ls-text-hint)", border: "0.5px solid var(--ls-border)",
              padding: "10px 8px", borderRadius: "8px", fontSize: "12px", cursor: "not-allowed",
            }}>
              SMS
            </button>
          )}
        </div>

        <div style={{
          background: "color-mix(in srgb, var(--ls-teal) 12%, transparent)",
          borderRadius: "10px",
          padding: "12px 14px",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}>
          <span style={{ fontSize: "16px" }}>💡</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--ls-teal)" }}>
              Petit tip pour anniversaire ?
            </div>
            <div style={{ fontSize: "11px", color: "var(--ls-teal)", opacity: 0.85, marginTop: "2px" }}>
              Pense à proposer un café ou un appel rapide.
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleMarkSent()}
          disabled={sending}
          style={{
            width: "100%",
            background: sending ? "var(--ls-text-hint)" : "var(--ls-gold)",
            color: sending ? "var(--ls-surface)" : "#1a1407",
            border: "none",
            padding: "14px",
            borderRadius: "10px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: sending ? "wait" : "pointer",
          }}
        >
          {sending ? "Envoi en cours..." : "Marquer comme envoyé ✓"}
        </button>
      </div>
    </div>
  );

  // Portail vers <body> : passe au-dessus du hero Noaly / contextes d'empilement.
  return typeof document !== "undefined" ? createPortal(overlay, document.body) : overlay;
}
