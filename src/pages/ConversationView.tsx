// Chantier Messagerie finalisée (2026-04-23) — commit 4/5.
//
// Vue conversation fil WhatsApp coach ↔ client. Route
// /messagerie/conversation/:messageId : on résout le client_id du message
// parent puis on affiche TOUS les messages client_messages liés à ce
// client_id, triés chronologiquement. Scroll auto en bas + input fixe
// pour répondre.
//
// Au chargement, tous les messages sender='client' non lus passent
// automatiquement en read + read_at=now (accusé de lecture implicite).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useAppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { useMessageActions } from "../hooks/useMessageActions";
import { getSupabaseClient } from "../services/supabaseClient";
import type { ClientMessage } from "../types/domain";

const DRAFT_KEY_PREFIX = "lor-squad-conversation-draft-";

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ConversationView() {
  const { messageId } = useParams<{ messageId: string }>();
  const { currentUser, clientMessages, getClientById } = useAppContext();
  const { push: pushToast } = useToast();
  const navigate = useNavigate();
  const actions = useMessageActions();

  // Résolution du client_id depuis le message initial.
  const parentMsg = useMemo(
    () => clientMessages.find((m) => m.id === messageId) ?? null,
    [clientMessages, messageId],
  );
  const clientId = parentMsg?.client_id ?? "";
  const client = clientId ? getClientById(clientId) : undefined;
  const clientName = useMemo(() => {
    if (client) return `${client.firstName} ${client.lastName}`.trim();
    return parentMsg?.client_name ?? "Client";
  }, [client, parentMsg]);

  const thread = useMemo(() => {
    if (!clientId) return [];
    return [...clientMessages]
      .filter((m) => m.client_id === clientId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [clientMessages, clientId]);

  // ─── Accusé de lecture auto ───────────────────────────────────────────────
  useEffect(() => {
    const unreadIds = thread
      .filter((m) => (m.sender ?? "client") === "client" && !m.read)
      .map((m) => m.id);
    if (unreadIds.length > 0) {
      void actions.markReadMany(unreadIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, thread.length]);

  // ─── Scroll auto en bas ───────────────────────────────────────────────────
  const bottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [thread.length]);

  // ─── Draft localStorage ───────────────────────────────────────────────────
  const draftKey = clientId ? `${DRAFT_KEY_PREFIX}${clientId}` : null;
  const [input, setInput] = useState(() => {
    if (!draftKey || typeof window === "undefined") return "";
    return window.localStorage.getItem(draftKey) ?? "";
  });
  useEffect(() => {
    if (!draftKey || typeof window === "undefined") return;
    if (input.trim()) {
      window.localStorage.setItem(draftKey, input);
    } else {
      window.localStorage.removeItem(draftKey);
    }
  }, [input, draftKey]);

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MAX_CHARS = 1000;
  const remaining = MAX_CHARS - input.length;

  const handleSend = useCallback(async () => {
    setError(null);
    const text = input.trim();
    if (!text) return;
    if (text.length > MAX_CHARS) {
      setError(`Message trop long (${text.length}/${MAX_CHARS} caractères).`);
      return;
    }
    if (!currentUser || !parentMsg) {
      setError("Contexte manquant — re-charge la page.");
      return;
    }
    setSending(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");

      const { error: insertErr } = await sb.from("client_messages").insert({
        client_id: parentMsg.client_id,
        client_name: parentMsg.client_name,
        distributor_id: currentUser.id,
        message_type: "coach_reply",
        message: text,
        sender: "coach",
        sender_id: currentUser.id,
      });
      if (insertErr) throw new Error(insertErr.message);

      setInput("");
      if (draftKey && typeof window !== "undefined") {
        window.localStorage.removeItem(draftKey);
      }
      pushToast({
        tone: "success",
        title: "Message envoyé",
        message: `${clientName} recevra une notification.`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setSending(false);
    }
  }, [currentUser, parentMsg, input, draftKey, clientName, pushToast]);

  if (!parentMsg) {
    return (
      <div className="space-y-4">
        <Card>
          <p style={{ fontSize: 14, color: "var(--ls-text-muted)" }}>
            Message introuvable.{" "}
            <Link to="/messages" style={{ color: "var(--ls-gold)" }}>
              Retour à la messagerie
            </Link>
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4" style={{ height: "calc(100vh - 140px)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          background: "var(--ls-surface)",
          border: "1px solid var(--ls-border)",
          borderRadius: 14,
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/messages")}
          aria-label="Retour"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "transparent",
            border: "1px solid var(--ls-border)",
            color: "var(--ls-text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          ←
        </button>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #C9A84C, #2DD4BF)",
            color: "#0B0D11",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Syne, sans-serif",
            fontWeight: 700,
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          {clientName
            .split(/\s+/)
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ls-text)" }}>{clientName}</div>
          <div style={{ fontSize: 11, color: "var(--ls-text-hint)" }}>
            {thread.length} message{thread.length > 1 ? "s" : ""} dans la conversation
          </div>
        </div>
        {clientId ? (
          <Link
            to={`/clients/${clientId}`}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              background: "var(--ls-surface2)",
              border: "1px solid var(--ls-border)",
              color: "var(--ls-text-muted)",
              textDecoration: "none",
              fontSize: 12,
              fontFamily: "DM Sans, sans-serif",
              flexShrink: 0,
            }}
          >
            Voir fiche
          </Link>
        ) : null}
      </div>

      {/* Thread scroll */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "14px 16px",
          background: "var(--ls-surface2)",
          border: "1px solid var(--ls-border)",
          borderRadius: 14,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {thread.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ls-text-muted)", textAlign: "center", marginTop: 40 }}>
            Aucun message pour ce client pour l'instant.
          </p>
        ) : (
          thread.map((m) => <Bubble key={m.id} msg={m} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input fixe bas */}
      <div
        style={{
          flexShrink: 0,
          padding: "12px 14px",
          background: "var(--ls-surface)",
          border: "1px solid var(--ls-border)",
          borderRadius: 14,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {error ? (
          <div
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              background: "rgba(251,113,133,0.12)",
              color: "#FBBFC8",
              fontSize: 12,
            }}
          >
            {error}
          </div>
        ) : null}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            rows={2}
            disabled={sending}
            placeholder={`Écris à ${clientName}… (Entrée pour envoyer, Shift+Entrée pour sauter une ligne)`}
            maxLength={MAX_CHARS + 200}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid var(--ls-border)",
              background: "var(--ls-surface2)",
              color: "var(--ls-text)",
              fontSize: 14,
              fontFamily: "DM Sans, sans-serif",
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
              minHeight: 44,
              maxHeight: 200,
            }}
          />
          <Button onClick={() => void handleSend()} disabled={sending || !input.trim()}>
            {sending ? "…" : "Envoyer"}
          </Button>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10,
            color: remaining < 100 ? (remaining < 0 ? "#FB7185" : "#C9A84C") : "var(--ls-text-hint)",
          }}
        >
          <span>
            {input.trim() && draftKey ? "💾 Brouillon sauvegardé" : ""}
          </span>
          <span>{input.length} / {MAX_CHARS}</span>
        </div>
      </div>
    </div>
  );
}

function Bubble({ msg }: { msg: ClientMessage }) {
  const isCoach = (msg.sender ?? "client") === "coach";
  return (
    <div style={{ display: "flex", justifyContent: isCoach ? "flex-end" : "flex-start" }}>
      <div
        style={{
          maxWidth: "72%",
          padding: "10px 14px",
          borderRadius: isCoach ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
          background: isCoach ? "#FAEEDA" : "var(--ls-surface)",
          color: isCoach ? "#633806" : "var(--ls-text)",
          border: isCoach ? "1px solid rgba(201,168,76,0.3)" : "1px solid var(--ls-border)",
          fontSize: 14,
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {msg.product_name ? (
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              opacity: 0.7,
              marginBottom: 4,
            }}
          >
            {msg.product_name}
          </div>
        ) : null}
        {msg.message}
        <div
          style={{
            fontSize: 10,
            marginTop: 6,
            opacity: 0.65,
            textAlign: isCoach ? "right" : "left",
          }}
        >
          {formatTime(msg.created_at)}
        </div>
      </div>
    </div>
  );
}
