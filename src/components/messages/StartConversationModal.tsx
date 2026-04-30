// Chantier Academy refonte premium - vague finale (2026-04-27).
// Modale compose pour demarrer une conversation avec un client.
// Pattern aligne sur ReplyMessageModal : insert dans client_messages
// avec message_type="coach_reply", sender="coach" (pas de notion de
// thread parent — schema flat).

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import { getSupabaseClient } from "../../services/supabaseClient";
import type { Client } from "../../types/domain";

interface Props {
  onClose: () => void;
}

export function StartConversationModal({ onClose }: Props) {
  const { currentUser, clients } = useAppContext();
  const { push: pushToast } = useToast();
  const navigate = useNavigate();
  const [clientId, setClientId] = useState<string>("");
  const [text, setText] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleClients = useMemo(
    () =>
      clients
        .filter((c: Client) => c.lifecycleStatus !== "stopped" && c.lifecycleStatus !== "lost")
        .sort((a, b) => a.firstName.localeCompare(b.firstName)),
    [clients],
  );

  const selectedClient = useMemo(
    () => visibleClients.find((c) => c.id === clientId) ?? null,
    [visibleClients, clientId],
  );

  const handleSend = async () => {
    if (!selectedClient || !currentUser) return;
    const trimmed = text.trim();
    if (!trimmed) {
      setError("Le message ne peut pas être vide.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Supabase indisponible.");
      const { error: insertErr } = await sb.from("client_messages").insert({
        client_id: selectedClient.id,
        client_name: `${selectedClient.firstName} ${selectedClient.lastName}`.trim(),
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
        message: `${selectedClient.firstName} va recevoir une notification.`,
      });
      onClose();
      navigate("/messages");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'envoi.");
    } finally {
      setSending(false);
    }
  };

  return (
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
        zIndex: 1000,
        padding: 16,
      }}
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events -- stopPropagation only, dialog role on element */}
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        data-tour-id="messages-compose-modal"
        style={{
          background: "white",
          borderRadius: 16,
          maxWidth: 480,
          width: "100%",
          padding: 24,
          fontFamily: "var(--ls-font-sans, system-ui, sans-serif)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <h2 style={{ fontFamily: "Syne, serif", fontSize: 20, fontWeight: 500, margin: 0, color: "#2C2C2A" }}>
            Démarrer une conversation
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{ background: "transparent", border: "none", fontSize: 22, color: "#888780", cursor: "pointer", padding: 0, lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: "#888780", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
            Client
          </label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            disabled={sending}
            data-tour-id="messages-compose-client-select"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #E5DFCF",
              background: "white",
              color: "#2C2C2A",
              fontSize: 14,
              fontFamily: "DM Sans, sans-serif",
              outline: "none",
            }}
          >
            <option value="">— Choisis un client —</option>
            {visibleClients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: "#888780", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
            Message
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={sending}
            rows={4}
            placeholder={selectedClient ? `Bonjour ${selectedClient.firstName}, …` : "Écris ton message…"}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #E5DFCF",
              background: "white",
              color: "#2C2C2A",
              fontSize: 14,
              fontFamily: "DM Sans, sans-serif",
              outline: "none",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </div>

        {error ? (
          <div style={{ fontSize: 12, color: "#993556", marginBottom: 12 }}>{error}</div>
        ) : null}

        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={sending || !clientId || !text.trim()}
          style={{
            width: "100%",
            background: sending || !clientId || !text.trim() ? "#888" : "#B8922A",
            color: "white",
            border: "none",
            padding: "12px",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 500,
            cursor: sending || !clientId || !text.trim() ? "not-allowed" : "pointer",
          }}
        >
          {sending ? "Envoi…" : "Envoyer"}
        </button>
      </div>
    </div>
  );
}
