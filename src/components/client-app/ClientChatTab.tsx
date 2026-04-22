// Chantier Messagerie bidirectionnelle (2026-04-22) — commit 4/6.
// Onglet "Mes messages" côté app client. Chat style WhatsApp :
//   - Bulles coach → à gauche, gris
//   - Bulles client → à droite, gold
//   - Timestamps relatifs discrets
//   - Input fixe en bas + bouton envoyer
//
// Lecture via RPC SECURITY DEFINER get_client_messages_by_token() pour
// contourner RLS (app client anon, authentifiée par le token magic-link).
// Écriture via RPC insert_client_message_by_token() pour le même motif
// + marquage sender='client' forcé.
//
// Polling : refresh toutes les 15s pour pêcher les réponses coach. Simple
// et robuste sans WebSocket (roadmap).

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";

interface ChatMessage {
  id: string;
  sender: "client" | "coach";
  message: string | null;
  message_type: string;
  product_name: string | null;
  created_at: string;
}

interface ClientChatTabProps {
  token: string;
  clientFirstName: string;
  coachFirstName: string;
}

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

export function ClientChatTab({ token, clientFirstName, coachFirstName }: ClientChatTabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(async () => {
    try {
      const sb = await getSupabaseClient();
      if (!sb) return;
      const { data, error: rpcErr } = await sb.rpc("get_client_messages_by_token", {
        p_token: token,
      });
      if (rpcErr) {
        setError(rpcErr.message);
        return;
      }
      const rows = (data ?? []) as ChatMessage[];
      setMessages(rows);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Load + polling 15s.
  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 15000);
    return () => window.clearInterval(id);
  }, [refresh]);

  // Auto-scroll en bas à chaque nouveau message.
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length]);

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    setSending(true);
    setError(null);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible");
      const { error: rpcErr } = await sb.rpc("insert_client_message_by_token", {
        p_token: token,
        p_message: text,
        p_message_type: "general",
      });
      if (rpcErr) throw new Error(rpcErr.message);
      setInput("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 180px)",
        maxHeight: 700,
        background: "#F4F2EE",
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          background: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)",
          borderBottom: "1px solid rgba(184,146,42,0.15)",
        }}
      >
        <div
          style={{
            fontFamily: "Syne, sans-serif",
            fontSize: 14,
            fontWeight: 700,
            color: "#111827",
          }}
        >
          Conversation avec {coachFirstName}
        </div>
        <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
          Réponse généralement sous 24h.
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {loading ? (
          <p style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center", marginTop: 40 }}>
            Chargement…
          </p>
        ) : messages.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              marginTop: 40,
              padding: "24px 16px",
              background: "#FFFFFF",
              borderRadius: 14,
              border: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
            <p style={{ fontSize: 14, color: "#111827", fontWeight: 600, marginBottom: 4 }}>
              Écris ton premier message !
            </p>
            <p style={{ fontSize: 12, color: "#6B7280" }}>
              {coachFirstName} te répondra dès qu'elle le pourra.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isCoach = m.sender === "coach";
            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  justifyContent: isCoach ? "flex-start" : "flex-end",
                }}
              >
                <div
                  style={{
                    maxWidth: "78%",
                    padding: "10px 14px",
                    borderRadius: isCoach ? "14px 14px 14px 4px" : "14px 14px 4px 14px",
                    background: isCoach ? "#FFFFFF" : "#B8922A",
                    color: isCoach ? "#111827" : "#FFFFFF",
                    border: isCoach ? "1px solid rgba(0,0,0,0.07)" : "none",
                    fontSize: 14,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {m.product_name ? (
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        opacity: 0.7,
                        marginBottom: 4,
                      }}
                    >
                      {m.product_name}
                    </div>
                  ) : null}
                  {m.message}
                  <div
                    style={{
                      fontSize: 10,
                      marginTop: 6,
                      opacity: 0.7,
                      textAlign: isCoach ? "left" : "right",
                    }}
                  >
                    {formatTime(m.created_at)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {error ? (
        <div
          style={{
            padding: "8px 14px",
            background: "rgba(220,38,38,0.08)",
            color: "#B91C1C",
            fontSize: 12,
          }}
        >
          {error}
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "12px 14px",
          borderTop: "1px solid rgba(0,0,0,0.06)",
          background: "#FFFFFF",
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
          rows={1}
          disabled={sending}
          placeholder={`Écris à ${coachFirstName}…`}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.1)",
            background: "#FAFAFA",
            fontSize: 14,
            fontFamily: "DM Sans, sans-serif",
            color: "#111827",
            outline: "none",
            resize: "none",
            boxSizing: "border-box",
            maxHeight: 120,
          }}
        />
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={sending || !input.trim()}
          style={{
            padding: "0 18px",
            borderRadius: 12,
            background: sending || !input.trim() ? "#D5B880" : "#B8922A",
            color: "#FFFFFF",
            border: "none",
            fontFamily: "Syne, sans-serif",
            fontWeight: 700,
            fontSize: 13,
            cursor: sending || !input.trim() ? "default" : "pointer",
            letterSpacing: 0.3,
          }}
        >
          {sending ? "…" : "Envoyer"}
        </button>
      </div>

      {/* Hint mobile : le prénom du client pour le contexte visuel. */}
      {messages.length > 0 ? (
        <div
          style={{
            fontSize: 10,
            color: "#9CA3AF",
            textAlign: "center",
            padding: "6px 0",
            background: "#FFFFFF",
          }}
        >
          Tu parles en tant que {clientFirstName}
        </div>
      ) : null}
    </div>
  );
}
