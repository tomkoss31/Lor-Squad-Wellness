// =============================================================================
// MemberMessages — onglet Messages de l'app membre BBC. Chat coach↔membre RÉEL
// (mêmes RPC que la PWA standard : get_client_messages_by_token /
// insert_client_message_by_token, polling 15s), habillé BBC.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "../../../services/supabaseClient";

interface ChatMessage {
  id: string;
  sender: "client" | "coach";
  message: string | null;
  message_type: string;
  product_name: string | null;
  created_at: string;
}

interface MemberMessagesProps {
  token: string;
  coachName?: string;
}

export function MemberMessages({ token, coachName }: MemberMessagesProps) {
  const coach = (coachName ?? "").split(/\s+/)[0] || "ton coach";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const sb = await getSupabaseClient();
      if (!sb) return;
      const { data } = await sb.rpc("get_client_messages_by_token", { p_token: token });
      setMessages((data ?? []) as ChatMessage[]);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 15000);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function send() {
    const text = input.trim();
    if (!text || sending || !token) return;
    setSending(true);
    try {
      const sb = await getSupabaseClient();
      if (sb) {
        await sb.rpc("insert_client_message_by_token", { p_token: token, p_message: text, p_message_type: "general" });
      }
      setInput("");
      await refresh();
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ textAlign: "center", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, letterSpacing: "0.14em", color: "var(--ls-bbc-hint)", textTransform: "uppercase", padding: "4px 0" }}>
        conversation avec {coach}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "var(--ls-bbc-muted)", fontSize: 13, marginTop: 20 }}>chargement…</div>
      ) : messages.length === 0 ? (
        <div style={{ textAlign: "center", marginTop: 20, padding: "24px 16px", background: "var(--ls-bbc-s1)", borderRadius: 16, border: "1px solid var(--ls-bbc-line)" }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>écris ton premier message !</div>
          <div style={{ fontSize: 12.5, color: "var(--ls-bbc-muted)", marginTop: 4 }}>{coach} te répondra dès que possible.</div>
        </div>
      ) : (
        messages.map((m) => {
          const isCoach = m.sender === "coach";
          return (
            <div key={m.id} style={{ alignSelf: isCoach ? "flex-start" : "flex-end", maxWidth: "82%", background: isCoach ? "var(--ls-bbc-s1)" : "var(--ls-bbc-lime)", border: `1px solid ${isCoach ? "var(--ls-bbc-line)" : "transparent"}`, color: isCoach ? "var(--ls-bbc-text)" : "var(--ls-bbc-lime-ink)", borderRadius: isCoach ? "16px 16px 16px 5px" : "16px 16px 5px 16px", padding: "12px 14px" }}>
              {isCoach ? <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ls-bbc-teal)", marginBottom: 5 }}>{coach} · coach</div> : null}
              {m.product_name ? <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 9, fontWeight: 600, textTransform: "uppercase", color: isCoach ? "var(--ls-bbc-muted)" : "var(--ls-bbc-lime-ink)", marginBottom: 4 }}>{m.product_name}</div> : null}
              <div style={{ fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.message}</div>
            </div>
          );
        })
      )}
      <div ref={bottomRef} />

      <div style={{ display: "flex", alignItems: "center", gap: 9, background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 14, padding: "7px 8px 7px 15px", marginTop: 6 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
          disabled={sending}
          placeholder={`écris à ${coach}…`}
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--ls-bbc-text)", fontSize: 16, fontFamily: "var(--ls-bbc-font-body)" }}
        />
        <button type="button" onClick={() => void send()} disabled={sending || !input.trim()} style={{ width: 40, height: 40, flex: "none", borderRadius: 11, border: "none", background: sending || !input.trim() ? "var(--ls-bbc-s2)" : "var(--ls-bbc-lime)", cursor: sending || !input.trim() ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={sending || !input.trim() ? "var(--ls-bbc-muted)" : "var(--ls-bbc-lime-ink)"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" /></svg>
        </button>
      </div>
    </div>
  );
}
