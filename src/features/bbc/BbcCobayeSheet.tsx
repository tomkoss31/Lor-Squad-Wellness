// =============================================================================
// BbcCobayeSheet — le flow « envoyer un cobaye » (chantier BBC Lot 2).
// 3 taps : choisir un script (verrouillé) → prénom → copier + WhatsApp.
// Front-only pour l'instant : incrémente le compteur du jour via onSent.
// La persistance (outreach_messages) viendra avec une migration dédiée.
// =============================================================================

import { useState } from "react";
import { BBC_SCRIPTS, scriptAccentColor } from "./data/bbcScripts";

const OUTREACH = BBC_SCRIPTS.filter((s) => s.outreach);

interface BbcCobayeSheetProps {
  onClose: () => void;
  onSent: () => void;
}

export function BbcCobayeSheet({ onClose, onSent }: BbcCobayeSheetProps) {
  const [sel, setSel] = useState(0);
  const [name, setName] = useState("");
  const who = name.trim() || "[prénom]";
  const body = OUTREACH[sel].body(who);

  function send() {
    try {
      void navigator.clipboard?.writeText(body);
    } catch {
      /* ignore */
    }
    try {
      window.open(`https://wa.me/?text=${encodeURIComponent(body)}`, "_blank", "noopener");
    } catch {
      /* ignore */
    }
    onSent();
    onClose();
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1300,
        background: "rgba(5,6,9,.72)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        className="bbc-mode"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 460,
          maxHeight: "88vh",
          overflowY: "auto",
          background: "var(--ls-bbc-s1)",
          border: "1px solid var(--ls-bbc-line2)",
          borderRadius: "22px 22px 0 0",
          padding: "18px 18px calc(22px + env(safe-area-inset-bottom))",
          color: "var(--ls-bbc-text)",
          fontFamily: "var(--ls-bbc-font-body)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 20 }}>Envoyer un cobaye</div>
          <button type="button" onClick={onClose} aria-label="Fermer" style={{ border: 0, background: "transparent", color: "var(--ls-bbc-muted)", fontSize: 20, cursor: "pointer", padding: "2px 6px" }}>✕</button>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--ls-bbc-muted)", marginBottom: 14 }}>
          Choisis un script (verrouillé), tape le prénom, envoie. Le compteur du jour monte.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {OUTREACH.map((s, i) => {
            const on = i === sel;
            return (
              <button
                key={s.title}
                type="button"
                onClick={() => setSel(i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "11px 12px",
                  border: `1px solid ${on ? scriptAccentColor(s.accent) : "var(--ls-bbc-line)"}`,
                  borderRadius: 12,
                  background: on ? "rgba(197,248,42,.06)" : "transparent",
                  color: "var(--ls-bbc-text)",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "var(--ls-bbc-font-body)",
                }}
              >
                <span style={{ color: on ? "var(--ls-bbc-lime)" : "transparent", fontWeight: 900 }}>✓</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 12.5, fontWeight: 600 }}>{s.title}</span>
                  <span style={{ display: "block", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, color: "var(--ls-bbc-hint)" }}>{s.src}</span>
                </span>
                <span aria-hidden="true" style={{ fontSize: 11, color: "var(--ls-bbc-hint)" }}>🔒</span>
              </button>
            );
          })}
        </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="prénom du contact"
          style={{ width: "100%", height: 46, borderRadius: 12, border: "1px solid var(--ls-bbc-line2)", background: "var(--ls-bbc-s2)", color: "var(--ls-bbc-text)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 16, padding: "0 14px", outline: "none", marginBottom: 12 }}
        />

        <div style={{ background: "var(--ls-bbc-bg)", border: "1px solid var(--ls-bbc-line)", borderRadius: 14, padding: 13, fontSize: 12.5, lineHeight: 1.55, color: "var(--ls-bbc-text)", whiteSpace: "pre-wrap", marginBottom: 14 }}>
          {body}
        </div>

        <button
          type="button"
          onClick={send}
          style={{ width: "100%", height: 52, border: 0, borderRadius: 14, background: "var(--ls-bbc-lime)", color: "var(--ls-bbc-lime-ink)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 15, fontWeight: 700, cursor: "pointer" }}
        >
          📲 Copier + ouvrir WhatsApp
        </button>
      </div>
    </div>
  );
}
