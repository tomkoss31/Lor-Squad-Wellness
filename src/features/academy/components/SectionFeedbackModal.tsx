// =============================================================================
// SectionFeedbackModal — feedback post-section (Tier B #9 — 2026-04-28)
// =============================================================================
//
// S affiche apres la completion d une section Academy (et son quiz si
// present), juste avant le retour vers /academy. Capture :
//   - helpful: boolean (👍 / 👎)
//   - comment: string optionnel (texte libre 280 chars max)
//
// Persistance : table academy_section_feedback (RLS self-insert/update).
// UPSERT sur (user, section) : si user re-feedback la meme section, on
// remplace la valeur precedente.
//
// UX : skip discret (croix) toujours possible — feedback non bloquant.
// 100 % var(--ls-*) → suit le toggle clair/dark.
// =============================================================================

import { useState } from "react";
import { useAppContext } from "../../../context/AppContext";
import { useToast } from "../../../context/ToastContext";
import { getSupabaseClient } from "../../../services/supabaseClient";

interface Props {
  sectionId: string;
  sectionTitle: string;
  onClose: () => void;
}

const COMMENT_MAX = 280;

export function SectionFeedbackModal({
  sectionId,
  sectionTitle,
  onClose,
}: Props) {
  const { currentUser } = useAppContext();
  const { push: pushToast } = useToast();
  const [helpful, setHelpful] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (helpful === null || !currentUser) {
      onClose();
      return;
    }
    setSubmitting(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) {
        onClose();
        return;
      }
      // Upsert on conflict (user, section)
      const { error } = await sb
        .from("academy_section_feedback")
        .upsert(
          {
            user_id: currentUser.id,
            section_id: sectionId,
            helpful,
            comment: comment.trim() || null,
          },
          { onConflict: "user_id,section_id" },
        );
      if (error) {
        console.warn("[Feedback] upsert error", error);
        pushToast({
          tone: "warning",
          title: "Feedback non enregistré",
          message: "On garde ta progression mais ton retour n'a pas pu être sauvé.",
        });
      } else {
        pushToast({
          tone: "success",
          title: "Merci pour ton retour 🙏",
          message: helpful
            ? "Ça nous aide à savoir ce qui marche."
            : "On regarde comment améliorer cette section.",
        });
      }
    } catch (err) {
      console.warn("[Feedback] submit failed", err);
    } finally {
      setSubmitting(false);
      onClose();
    }
  }

  function skip() {
    onClose();
  }

  return (
    <div
      role="presentation"
      aria-hidden="true"
      onClick={skip}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10004,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events -- stopPropagation only, dialog role on element */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 460,
          background: "var(--ls-surface)",
          border: "0.5px solid var(--ls-border)",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 16px 50px rgba(0,0,0,0.30)",
          fontFamily: "DM Sans, sans-serif",
          animation: "ls-feedback-enter 240ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      >
        <style>{`
          @keyframes ls-feedback-enter {
            0% { opacity: 0; transform: translateY(12px) scale(0.97); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 8,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--ls-text-hint)",
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Feedback section
            </div>
            <h2
              id="feedback-title"
              style={{
                fontFamily: "Syne, sans-serif",
                fontSize: 18,
                fontWeight: 600,
                color: "var(--ls-text)",
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              Cette section t&apos;a aidé ?
            </h2>
            <p
              style={{
                fontSize: 12,
                color: "var(--ls-text-muted)",
                margin: "4px 0 0",
              }}
            >
              {sectionTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={skip}
            aria-label="Fermer"
            style={{
              background: "transparent",
              border: "none",
              fontSize: 20,
              color: "var(--ls-text-muted)",
              cursor: "pointer",
              lineHeight: 1,
              padding: 4,
            }}
          >
            ×
          </button>
        </div>

        {/* Boutons 👍 / 👎 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            margin: "18px 0 16px",
          }}
        >
          <button
            type="button"
            onClick={() => setHelpful(true)}
            style={{
              padding: "16px 12px",
              background:
                helpful === true
                  ? "color-mix(in srgb, var(--ls-teal) 18%, var(--ls-surface))"
                  : "var(--ls-surface2)",
              border:
                helpful === true
                  ? "1px solid var(--ls-teal)"
                  : "0.5px solid var(--ls-border)",
              borderRadius: 12,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 160ms ease",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 30 }}>👍</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: helpful === true ? "var(--ls-teal)" : "var(--ls-text)",
              }}
            >
              Ça m&apos;a aidé
            </span>
          </button>
          <button
            type="button"
            onClick={() => setHelpful(false)}
            style={{
              padding: "16px 12px",
              background:
                helpful === false
                  ? "color-mix(in srgb, var(--ls-coral) 18%, var(--ls-surface))"
                  : "var(--ls-surface2)",
              border:
                helpful === false
                  ? "1px solid var(--ls-coral)"
                  : "0.5px solid var(--ls-border)",
              borderRadius: 12,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 160ms ease",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 30 }}>👎</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: helpful === false ? "var(--ls-coral)" : "var(--ls-text)",
              }}
            >
              Pas vraiment
            </span>
          </button>
        </div>

        {/* Texte libre (apparait apres choix) */}
        {helpful !== null ? (
          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                fontSize: 11,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--ls-text-hint)",
                fontWeight: 600,
                display: "block",
                marginBottom: 6,
              }}
            >
              {helpful ? "Ce qui t'a marqué (optionnel)" : "Ce qui t'a manqué (optionnel)"}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, COMMENT_MAX))}
              maxLength={COMMENT_MAX}
              rows={3}
              placeholder={
                helpful
                  ? "Ex : J'ai compris la différence sponsor / coach grâce au schéma…"
                  : "Ex : Le step sur le QR code n'était pas clair…"
              }
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "var(--ls-surface2)",
                border: "0.5px solid var(--ls-border)",
                borderRadius: 10,
                fontSize: 13,
                fontFamily: "inherit",
                color: "var(--ls-text)",
                outline: "none",
                resize: "vertical",
                minHeight: 70,
                boxSizing: "border-box",
              }}
            />
            <div
              style={{
                fontSize: 10,
                color: "var(--ls-text-hint)",
                textAlign: "right",
                marginTop: 4,
              }}
            >
              {comment.length} / {COMMENT_MAX}
            </div>
          </div>
        ) : null}

        {/* Boutons action */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
          <button
            type="button"
            onClick={skip}
            disabled={submitting}
            style={{
              padding: "10px 16px",
              background: "transparent",
              border: "0.5px solid var(--ls-border)",
              borderRadius: 10,
              color: "var(--ls-text-muted)",
              fontSize: 13,
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            Plus tard
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={helpful === null || submitting}
            style={{
              padding: "10px 18px",
              background:
                helpful === null
                  ? "var(--ls-surface2)"
                  : "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
              border: "none",
              borderRadius: 10,
              color: helpful === null ? "var(--ls-text-hint)" : "white",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "inherit",
              cursor: helpful === null ? "not-allowed" : submitting ? "wait" : "pointer",
              boxShadow:
                helpful === null
                  ? "none"
                  : "0 2px 8px rgba(186,117,23,0.30)",
            }}
          >
            {submitting ? "Envoi…" : "Envoyer"}
          </button>
        </div>
      </div>
    </div>
  );
}
