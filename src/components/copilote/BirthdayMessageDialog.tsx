// Chantier N (2026-04-26) : popup riche pour message anniversaire.
// Style aligne sur les popups suivi J+X (header petit + titre gros +
// card beige message + 3 boutons copier/whatsapp/sms + tip teal +
// bouton gold "marquer comme envoye").

import { useState } from "react";
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

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="birthday-dialog-title"
        style={{
          background: "white",
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
            color: "#888",
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
              color: "#888",
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
            color: "#2C2C2A",
            marginBottom: "20px",
            fontFamily: "Syne, serif",
          }}
        >
          Joyeux anniversaire ! 🎂{age !== null ? ` ${age} ans` : ""}
        </div>

        <div style={{
          fontSize: "10px",
          color: "#888",
          letterSpacing: "1.2px",
          fontWeight: 500,
          marginBottom: "8px",
          textTransform: "uppercase",
        }}>
          Message pour {client.firstName}
        </div>

        <div style={{
          background: "#FAF6E8",
          borderRadius: "12px",
          padding: "16px",
          fontSize: "15px",
          lineHeight: 1.5,
          color: "#444441",
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
              background: copied ? "#E1F5EE" : "white",
              color: copied ? "#0F6E56" : "#444441",
              border: "0.5px solid rgba(0,0,0,0.15)",
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
              background: "#F8F8F8", color: "#999", border: "0.5px solid rgba(0,0,0,0.05)",
              padding: "10px 8px", borderRadius: "8px", fontSize: "12px", cursor: "not-allowed",
            }}>
              WhatsApp
            </button>
          )}
          {smsUrl ? (
            <a
              href={smsUrl}
              style={{
                background: "white",
                color: "#444441",
                border: "0.5px solid rgba(0,0,0,0.15)",
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
              background: "#F8F8F8", color: "#999", border: "0.5px solid rgba(0,0,0,0.05)",
              padding: "10px 8px", borderRadius: "8px", fontSize: "12px", cursor: "not-allowed",
            }}>
              SMS
            </button>
          )}
        </div>

        <div style={{
          background: "#E1F5EE",
          borderRadius: "10px",
          padding: "12px 14px",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}>
          <span style={{ fontSize: "16px" }}>💡</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "12px", fontWeight: 500, color: "#0F6E56" }}>
              Petit tip pour anniversaire ?
            </div>
            <div style={{ fontSize: "11px", color: "#0F6E56", opacity: 0.85, marginTop: "2px" }}>
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
            background: sending ? "#888" : "#B8922A",
            color: "white",
            border: "none",
            padding: "14px",
            borderRadius: "10px",
            fontSize: "14px",
            fontWeight: 500,
            cursor: sending ? "wait" : "pointer",
          }}
        >
          {sending ? "Envoi en cours..." : "Marquer comme envoyé ✓"}
        </button>
      </div>
    </div>
  );
}
