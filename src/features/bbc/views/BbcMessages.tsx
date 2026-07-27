// =============================================================================
// BbcMessages — messagerie coach ↔ membres BBC, DONNÉES RÉELLES.
// Lit/écrit `client_messages` (même table que la messagerie classique, donc
// une conversation reste continue entre les deux modes). Fils limités aux
// membres BBC du coach. Envoi avec message_type 'coach_reply' (valeur de
// l'union domain.ts — un type hors union rendrait le message invisible).
// =============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseClient } from "../../../services/supabaseClient";

interface Msg {
  id: string;
  clientId: string;
  clientName: string;
  message: string | null;
  productName: string | null;
  sender: string;
  read: boolean;
  createdAt: string;
}

interface BbcMessagesProps {
  userId?: string;
  coachName?: string;
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function BbcMessages({ userId }: BbcMessagesProps) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [members, setMembers] = useState<Array<{ id: string; name: string }>>([]);
  const [active, setActive] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const sb = await getSupabaseClient();
      if (!sb) return;
      const { data: clients } = await sb
        .from("clients")
        .select("id, first_name, last_name")
        .eq("distributor_id", userId)
        .eq("ebe_bbc", true);
      const list = (clients ?? []).map((c: Record<string, unknown>) => ({
        id: String(c.id),
        name: `${String(c.first_name ?? "").trim()} ${String(c.last_name ?? "").trim()}`.trim() || "—",
      }));
      setMembers(list);
      if (list.length === 0) {
        setMessages([]);
        return;
      }
      const { data: msgs } = await sb
        .from("client_messages")
        .select("id, client_id, client_name, message, product_name, sender, read, created_at")
        .eq("distributor_id", userId)
        .in("client_id", list.map((m) => m.id))
        .order("created_at", { ascending: true })
        .limit(500);
      if (Array.isArray(msgs)) {
        setMessages(
          (msgs as Array<Record<string, unknown>>).map((m) => ({
            id: String(m.id),
            clientId: String(m.client_id),
            clientName: String(m.client_name ?? ""),
            message: (m.message as string | null) ?? null,
            productName: (m.product_name as string | null) ?? null,
            sender: String(m.sender ?? "client"),
            read: Boolean(m.read),
            createdAt: String(m.created_at),
          })),
        );
      }
    } catch {
      // silent-fail
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 20000);
    return () => window.clearInterval(id);
  }, [refresh]);

  // Fils : un par membre BBC, trié par dernier message.
  const threads = useMemo(() => {
    return members
      .map((m) => {
        const msgs = messages.filter((x) => x.clientId === m.id);
        const last = msgs[msgs.length - 1];
        return {
          ...m,
          last,
          unread: msgs.filter((x) => x.sender !== "coach" && !x.read).length,
          count: msgs.length,
        };
      })
      .sort((a, b) => {
        const ta = a.last ? new Date(a.last.createdAt).getTime() : 0;
        const tb = b.last ? new Date(b.last.createdAt).getTime() : 0;
        return tb - ta;
      });
  }, [members, messages]);

  const activeId = active ?? threads[0]?.id ?? null;
  const activeThread = threads.find((t) => t.id === activeId) ?? null;
  const chat = useMemo(() => messages.filter((m) => m.clientId === activeId), [messages, activeId]);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat.length, activeId]);

  async function send() {
    const text = input.trim();
    if (!text || sending || !activeThread || !userId) return;
    setSending(true);
    try {
      const sb = await getSupabaseClient();
      if (sb) {
        await sb.from("client_messages").insert({
          client_id: activeThread.id,
          client_name: activeThread.name,
          distributor_id: userId,
          message_type: "coach_reply",
          message: text,
          sender: "coach",
        });
      }
      setInput("");
      await refresh();
    } catch {
      // silent-fail
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <div style={{ fontSize: 12.5, color: "var(--ls-bbc-hint)" }}>chargement…</div>;
  }

  if (members.length === 0) {
    return (
      <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 20, padding: 24, fontSize: 13, color: "var(--ls-bbc-muted)", lineHeight: 1.6 }}>
        Aucun membre BBC pour l'instant — la messagerie s'ouvrira quand tu auras passé un client en membre BBC (fiche client → Actions).
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 320px) minmax(0, 1fr)", gap: 20, height: 600 }}>
      {/* fils */}
      <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 20, padding: 14, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ls-bbc-muted)", padding: "4px 6px 10px" }}>
          mes membres · {threads.length}
        </div>
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {threads.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", border: 0, cursor: "pointer", textAlign: "left", padding: 12, borderRadius: 13, marginBottom: 3, background: t.id === activeId ? "var(--ls-bbc-s2)" : "transparent", color: "var(--ls-bbc-text)" }}
            >
              <span style={{ width: 40, height: 40, borderRadius: 999, flex: "none", background: "var(--ls-bbc-s3)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 13, fontWeight: 700, color: t.unread ? "var(--ls-bbc-lime-text)" : "var(--ls-bbc-teal)" }}>
                {t.name[0]?.toUpperCase() ?? "?"}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{t.name}</span>
                  {t.last ? <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10.5, color: "var(--ls-bbc-hint)" }}>{timeLabel(t.last.createdAt)}</span> : null}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: "var(--ls-bbc-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.last?.message ?? "pas encore de message"}
                  </span>
                  {t.unread ? (
                    <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, fontWeight: 700, color: "var(--ls-bbc-lime-ink)", background: "var(--ls-bbc-lime)", minWidth: 18, height: 18, padding: "0 5px", borderRadius: 999, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{t.unread}</span>
                  ) : null}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* conversation */}
      <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 20, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 22px", borderBottom: "1px solid var(--ls-bbc-line)", flex: "none" }}>
          <span style={{ width: 40, height: 40, borderRadius: 999, background: "var(--ls-bbc-s3)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 13, fontWeight: 700, color: "var(--ls-bbc-teal)" }}>
            {activeThread?.name[0]?.toUpperCase() ?? "?"}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{activeThread?.name ?? "—"}</div>
            <div style={{ fontSize: 11.5, color: "var(--ls-bbc-teal)" }}>membre du club</div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 22, display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
          {chat.length === 0 ? (
            <div style={{ textAlign: "center", marginTop: 30, fontSize: 13, color: "var(--ls-bbc-muted)" }}>
              Aucun message pour l'instant — écris le premier.
            </div>
          ) : (
            chat.map((m) => {
              const isCoach = m.sender === "coach";
              return (
                <div key={m.id} style={{ alignSelf: isCoach ? "flex-end" : "flex-start", maxWidth: "72%", background: isCoach ? "var(--ls-bbc-lime)" : "var(--ls-bbc-s2)", color: isCoach ? "var(--ls-bbc-lime-ink)" : "var(--ls-bbc-text)", border: `1px solid ${isCoach ? "transparent" : "var(--ls-bbc-line)"}`, borderRadius: isCoach ? "16px 16px 5px 16px" : "16px 16px 16px 5px", padding: "12px 15px" }}>
                  {m.productName ? (
                    <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 9, fontWeight: 600, textTransform: "uppercase", opacity: 0.7, marginBottom: 4 }}>{m.productName}</div>
                  ) : null}
                  <div style={{ fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.message}</div>
                  <span style={{ display: "block", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, opacity: 0.6, marginTop: 5 }}>{timeLabel(m.createdAt)}</span>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 22px", borderTop: "1px solid var(--ls-bbc-line)", flex: "none" }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
            disabled={sending || !activeThread}
            placeholder={activeThread ? `écris à ${activeThread.name}…` : "…"}
            style={{ flex: 1, height: 48, borderRadius: 13, border: "1px solid var(--ls-bbc-line)", background: "var(--ls-bbc-s2)", color: "var(--ls-bbc-text)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 15, padding: "0 16px", outline: "none" }}
          />
          <button type="button" onClick={() => void send()} disabled={sending || !input.trim()} style={{ width: 48, height: 48, border: 0, borderRadius: 13, background: sending || !input.trim() ? "var(--ls-bbc-s2)" : "var(--ls-bbc-lime)", cursor: sending || !input.trim() ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={sending || !input.trim() ? "var(--ls-bbc-muted)" : "var(--ls-bbc-lime-ink)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
