// =============================================================================
// MemberNoaly — le chat Noaly du membre BBC, branché sur l'edge `noaly`
// (mode client_chat). L'auth se fait par le token ; TOUT le contexte (carte,
// visites, cœurs, prochain rituel) est chargé côté serveur — le front
// n'envoie jamais de données du membre, il envoie juste la question.
// =============================================================================

import { useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "../../../services/supabaseClient";

interface Turn {
  role: "user" | "assistant";
  content: string;
}

interface MemberNoalyProps {
  token?: string;
  firstName?: string;
  onClose: () => void;
}

const SUGGESTIONS = [
  "une idée de recette",
  "j'ai une fringale",
  "où j'en suis sur ma carte ?",
  "c'est quoi un cœur ?",
];

export function MemberNoaly({ token, firstName, onClose }: MemberNoalyProps) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length, busy]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy || !token) return;
    setError(null);
    const next: Turn[] = [...turns, { role: "user", content: q }];
    setTurns(next);
    setInput("");
    setBusy(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("indisponible");
      const { data, error: err } = await sb.functions.invoke("noaly", {
        body: { mode: "client_chat", client_token: token, messages: next },
      });
      if (err) throw new Error(err.message);
      const msg = (data as { message?: string; error?: string } | null);
      if (msg?.error && !msg?.message) throw new Error(msg.error);
      const reply = String(msg?.message ?? "").trim();
      if (!reply) throw new Error("réponse vide");
      setTurns((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      // Message honnête : on n'invente pas de réponse à la place de Noaly.
      setError(
        e instanceof Error && /cap|429/i.test(e.message)
          ? "Tu as posé beaucoup de questions aujourd'hui 🙂 Noaly revient demain — en attendant, écris à ton coach."
          : "Noaly n'a pas pu répondre. Réessaie, ou écris directement à ton coach.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 75, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "flex-end" }}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bbc-mode"
        style={{
          width: "100%", maxWidth: 460, margin: "0 auto", maxHeight: "86vh", display: "flex", flexDirection: "column",
          background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line2)", borderRadius: "26px 26px 0 0",
          color: "var(--ls-bbc-text)", fontFamily: "var(--ls-bbc-font-body)", overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "16px 18px 13px", borderBottom: "1px solid var(--ls-bbc-line)", flex: "none" }}>
          <div style={{ width: 40, height: 40, borderRadius: 13, background: "linear-gradient(140deg, var(--ls-bbc-teal), var(--ls-bbc-lime))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }} aria-hidden="true">✦</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Noaly</div>
            <div style={{ fontSize: 11, color: "var(--ls-bbc-muted)" }}>ton assistante du club</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" style={{ width: 32, height: 32, borderRadius: 10, background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)", color: "var(--ls-bbc-muted)", cursor: "pointer", fontSize: 15 }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10, minHeight: 120 }}>
          {turns.length === 0 ? (
            <>
              <div style={{ alignSelf: "flex-start", maxWidth: "88%", background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)", borderRadius: "16px 16px 16px 5px", padding: "12px 14px", fontSize: 13.5, lineHeight: 1.5 }}>
                Salut {firstName || "toi"} ! Une question sur ton matin, ta carte, une recette ? Je connais ton club 🙂
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => void ask(s)} style={{ padding: "9px 13px", borderRadius: 999, background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)", color: "var(--ls-bbc-text)", fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "var(--ls-bbc-font-body)" }}>
                    {s}
                  </button>
                ))}
              </div>
            </>
          ) : (
            turns.map((t, i) => (
              <div key={i} style={{ alignSelf: t.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%", background: t.role === "user" ? "var(--ls-bbc-lime)" : "var(--ls-bbc-s2)", color: t.role === "user" ? "var(--ls-bbc-lime-ink)" : "var(--ls-bbc-text)", border: t.role === "user" ? "none" : "1px solid var(--ls-bbc-line)", borderRadius: t.role === "user" ? "16px 16px 5px 16px" : "16px 16px 16px 5px", padding: "12px 14px", fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                {t.content}
              </div>
            ))
          )}
          {busy ? (
            <div style={{ alignSelf: "flex-start", fontSize: 12.5, color: "var(--ls-bbc-muted)", padding: "8px 4px" }}>Noaly réfléchit…</div>
          ) : null}
          {error ? (
            <div role="alert" style={{ fontSize: 12.5, color: "var(--ls-bbc-coral)", background: "rgba(251,113,133,.10)", border: "1px solid rgba(251,113,133,.28)", borderRadius: 12, padding: "10px 12px", lineHeight: 1.45 }}>
              {error}
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "12px 18px calc(18px + env(safe-area-inset-bottom))", borderTop: "1px solid var(--ls-bbc-line)", flex: "none" }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void ask(input); } }}
            disabled={busy}
            placeholder="pose ta question…"
            style={{ flex: 1, height: 46, borderRadius: 13, border: "1px solid var(--ls-bbc-line)", background: "var(--ls-bbc-s2)", color: "var(--ls-bbc-text)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 16, padding: "0 14px", outline: "none" }}
          />
          <button type="button" onClick={() => void ask(input)} disabled={busy || !input.trim()} style={{ width: 46, height: 46, flex: "none", border: 0, borderRadius: 13, background: busy || !input.trim() ? "var(--ls-bbc-s2)" : "var(--ls-bbc-lime)", cursor: busy || !input.trim() ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={busy || !input.trim() ? "var(--ls-bbc-muted)" : "var(--ls-bbc-lime-ink)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
