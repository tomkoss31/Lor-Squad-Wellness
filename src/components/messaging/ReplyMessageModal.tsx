// Chantier Messagerie bidirectionnelle (2026-04-22) — commit 3/6.
// Modale de réponse coach → client. Insert dans client_messages avec
// sender='coach' → le trigger notify_new_coach_message fire et push une
// notif au client.

import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { useAppContext } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import { getSupabaseClient } from "../../services/supabaseClient";
import type { ClientMessage } from "../../types/domain";

export interface ReplyMessageModalProps {
  open: boolean;
  onClose: () => void;
  /** Message auquel le coach répond (affiché en haut de la modale). */
  parent: ClientMessage | null;
  /** Callback après envoi réussi — le parent rafraîchit sa liste. */
  onSent?: () => void;
}

export function ReplyMessageModal({ open, onClose, parent, onSent }: ReplyMessageModalProps) {
  const { currentUser } = useAppContext();
  const { push: pushToast } = useToast();
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setReply("");
    setError(null);
    setSending(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, parent?.id]);

  if (!open || !parent) return null;

  const firstName = parent.client_name?.split(/\s+/)[0] || "le client";

  async function handleSend() {
    setError(null);
    const trimmed = reply.trim();
    if (!trimmed) {
      setError("Écris un message avant d'envoyer.");
      return;
    }
    if (!currentUser) {
      setError("Session expirée, reconnecte-toi.");
      return;
    }
    setSending(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Supabase indisponible");

      const { error: insertErr } = await sb.from("client_messages").insert({
        client_id: parent!.client_id,
        client_name: parent!.client_name,
        distributor_id: currentUser.id,
        message_type: "coach_reply",
        message: trimmed,
        sender: "coach",
        sender_id: currentUser.id,
      });
      if (insertErr) throw new Error(insertErr.message);

      pushToast({
        tone: "success",
        title: "Message envoyé",
        message: `${firstName} va recevoir une notification.`,
      });
      onSent?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Fermer"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape" && !sending) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Répondre à ${firstName}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        style={{
          background: "var(--ls-surface)",
          borderRadius: 18,
          maxWidth: 520,
          width: "100%",
          padding: 24,
          border: "1px solid var(--ls-border)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          color: "var(--ls-text)",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        <p
          style={{
            fontFamily: "Syne, sans-serif",
            fontSize: 20,
            fontWeight: 700,
            margin: 0,
            marginBottom: 14,
          }}
        >
          Répondre à {firstName}
        </p>

        {parent.message ? (
          <div
            style={{
              padding: "10px 14px",
              borderLeft: "3px solid var(--ls-gold)",
              background: "var(--ls-surface2)",
              borderRadius: 6,
              fontSize: 13,
              color: "var(--ls-text-muted)",
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            <div
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "1px",
                color: "var(--ls-text-hint)",
                marginBottom: 4,
              }}
            >
              Message original
            </div>
            {parent.message}
          </div>
        ) : null}

        <label
          style={{
            display: "block",
            fontSize: 12,
            fontWeight: 500,
            color: "var(--ls-text-muted)",
            marginBottom: 6,
          }}
        >
          Ta réponse
        </label>
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={6}
          disabled={sending}
          placeholder={`Écris ta réponse à ${firstName}…`}
          maxLength={1200}
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid var(--ls-border)",
            background: "var(--ls-surface2)",
            fontSize: 14,
            fontFamily: "DM Sans, sans-serif",
            color: "var(--ls-text)",
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
            minHeight: 120,
          }}
        />
        {/* Chantier Messagerie finalisée (2026-04-23) : compteur caractères. */}
        <div
          style={{
            marginTop: 4,
            fontSize: 10,
            color: reply.length > 900 ? "#C9A84C" : "var(--ls-text-hint)",
            textAlign: "right",
          }}
        >
          {reply.length} / 1000
        </div>

        {error ? (
          <p
            style={{
              marginTop: 10,
              padding: "10px 12px",
              borderRadius: 10,
              background: "rgba(251,113,133,0.12)",
              color: "#FBBFC8",
              fontSize: 13,
            }}
          >
            {error}
          </p>
        ) : null}

        <div style={{ marginTop: 18, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={onClose} disabled={sending}>
            Annuler
          </Button>
          <Button onClick={() => void handleSend()} disabled={sending || !reply.trim()}>
            {sending ? "Envoi…" : "Envoyer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
