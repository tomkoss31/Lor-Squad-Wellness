// =============================================================================
// ReviewThreadPanel — discussion sponsor↔distri↔admin (Phase C)
//
// Liste les messages chronologique avec bulle style WhatsApp light.
// Permet d ajouter un message libre (kind='feedback') sans changer
// le status de la progression.
// =============================================================================

import { useEffect, useRef, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import {
  useFormationActions,
  useFormationReviewThread,
} from "../../features/formation";
import type { FormationThreadKind } from "../../features/formation/types-db";

interface Props {
  progressId: string;
  /** Compact = pas d input, juste affichage (pour la modale validation). */
  compact?: boolean;
}

const KIND_META: Record<FormationThreadKind, { label: string; color: string }> = {
  question: { label: "Question", color: "var(--ls-gold)" },
  answer: { label: "Réponse", color: "var(--ls-teal)" },
  validation_decision: { label: "Décision", color: "var(--ls-purple)" },
  feedback: { label: "Message", color: "var(--ls-text-muted)" },
};

export function ReviewThreadPanel({ progressId, compact = false }: Props) {
  const { messages, loading, reload } = useFormationReviewThread(progressId);
  const { addThreadMessage, busy } = useFormationActions();
  const { currentUser, users } = useAppContext();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll en bas quand nouveaux messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  async function handleSend() {
    if (!draft.trim()) return;
    const row = await addThreadMessage({
      progressId,
      content: draft.trim(),
      kind: "feedback",
    });
    if (row) {
      setDraft("");
      void reload();
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        ref={scrollRef}
        style={{
          maxHeight: compact ? 180 : 320,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: "8px 4px",
        }}
      >
        {loading && messages.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--ls-text-muted)", textAlign: "center", padding: 12 }}>
            Chargement…
          </div>
        ) : messages.length === 0 ? (
          <div
            style={{
              fontSize: 12,
              color: "var(--ls-text-hint)",
              textAlign: "center",
              padding: 16,
              fontStyle: "italic",
            }}
          >
            Pas encore de message dans ce fil.
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUser?.id;
            const sender = users?.find((u) => u.id === msg.sender_id);
            const senderName = sender?.name ?? "Inconnu";
            const meta = KIND_META[msg.kind];
            return (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isMe ? "flex-end" : "flex-start",
                  gap: 2,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--ls-text-hint)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ color: meta.color, fontWeight: 700 }}>{meta.label}</span>
                  <span>·</span>
                  <span>{senderName}</span>
                  <span>·</span>
                  <span>{formatTime(msg.created_at)}</span>
                </div>
                <div
                  style={{
                    maxWidth: "85%",
                    padding: "8px 12px",
                    borderRadius: 12,
                    background: isMe
                      ? `color-mix(in srgb, ${meta.color} 14%, var(--ls-surface2))`
                      : "var(--ls-surface2)",
                    border: `0.5px solid ${isMe ? `color-mix(in srgb, ${meta.color} 30%, transparent)` : "var(--ls-border)"}`,
                    fontSize: 13,
                    color: "var(--ls-text)",
                    fontFamily: "DM Sans, sans-serif",
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
      </div>

      {!compact ? (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Écris un message…"
            rows={2}
            style={{
              flex: 1,
              boxSizing: "border-box",
              padding: "10px 12px",
              background: "var(--ls-surface2)",
              border: "0.5px solid var(--ls-border)",
              borderRadius: 12,
              color: "var(--ls-text)",
              fontFamily: "DM Sans, sans-serif",
              fontSize: 13,
              resize: "vertical",
              outline: "none",
            }}
          />
          <button
            type="button"
            disabled={busy || !draft.trim()}
            onClick={() => void handleSend()}
            style={{
              padding: "10px 16px",
              borderRadius: 999,
              border: "none",
              background:
                "linear-gradient(135deg, var(--ls-gold) 0%, color-mix(in srgb, var(--ls-gold) 70%, #000) 100%)",
              color: "white",
              fontFamily: "Syne, serif",
              fontWeight: 700,
              fontSize: 13,
              cursor: busy || !draft.trim() ? "not-allowed" : "pointer",
              opacity: busy || !draft.trim() ? 0.5 : 1,
            }}
          >
            ↑
          </button>
        </div>
      ) : null}
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}
