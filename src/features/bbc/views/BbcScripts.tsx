// =============================================================================
// BbcScripts — bibliothèque de scripts verbatim (port du design, BBC Lot 2).
// Le prénom s'injecte partout. Scripts verrouillés (règle : on ne modifie pas
// le cœur du message). Données mutualisées → src/features/bbc/data/bbcScripts.
// =============================================================================

import { useState } from "react";
import { BBC_SCRIPTS, BBC_SCRIPT_CATS, scriptAccentBg, scriptAccentColor } from "../data/bbcScripts";

export function BbcScripts() {
  const [name, setName] = useState("");
  const [copied, setCopied] = useState<number>(-1);
  const who = name.trim() || "[prénom]";

  function copy(idx: number, text: string) {
    try {
      void navigator.clipboard?.writeText(text);
    } catch {
      /* clipboard indisponible — ignore */
    }
    setCopied(idx);
    window.setTimeout(() => setCopied((c) => (c === idx ? -1 : c)), 1500);
  }

  let idx = -1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          background: "var(--ls-bbc-s1)",
          border: "1px solid var(--ls-bbc-line)",
          borderRadius: 16,
          padding: "16px 20px",
        }}
      >
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>Le prénom s'injecte partout</div>
          <div style={{ fontSize: 11.5, color: "var(--ls-bbc-muted)", marginTop: 2 }}>
            Tape un prénom, tous les scripts se personnalisent. Règle d'or : on ne modifie jamais le cœur du message.
          </div>
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="prénom du cobaye…"
          style={{
            width: 230,
            height: 44,
            borderRadius: 12,
            border: "1px solid var(--ls-bbc-line2)",
            background: "var(--ls-bbc-s2)",
            color: "var(--ls-bbc-text)",
            fontFamily: "var(--ls-bbc-font-body)",
            fontSize: 16,
            padding: "0 14px",
            outline: "none",
          }}
        />
      </div>

      {BBC_SCRIPT_CATS.map((cat) => (
        <div key={cat}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0 12px 2px" }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-lime)", boxShadow: "0 0 8px var(--ls-bbc-lime)" }} />
            <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-muted)", textTransform: "uppercase" }}>
              {cat}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            {BBC_SCRIPTS.filter((s) => s.cat === cat).map((s) => {
              idx += 1;
              const myIdx = idx;
              const body = s.body(who);
              return (
                <div
                  key={s.title}
                  style={{
                    background: "var(--ls-bbc-s1)",
                    border: "1px solid var(--ls-bbc-line)",
                    borderLeft: `3px solid ${scriptAccentColor(s.accent)}`,
                    borderRadius: 16,
                    padding: "18px 20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{s.title}</div>
                      <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10.5, color: "var(--ls-bbc-hint)", marginTop: 3, letterSpacing: "0.04em" }}>{s.src}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copy(myIdx, body)}
                      style={{
                        flex: "none",
                        border: `1px solid ${scriptAccentColor(s.accent)}`,
                        background: scriptAccentBg(s.accent),
                        color: scriptAccentColor(s.accent),
                        fontFamily: "var(--ls-bbc-font-body)",
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "8px 14px",
                        borderRadius: 10,
                        cursor: "pointer",
                      }}
                    >
                      {copied === myIdx ? "copié ✓" : "copier"}
                    </button>
                  </div>
                  <div style={{ background: "var(--ls-bbc-s2)", borderRadius: 12, padding: "14px 15px", fontSize: 13, lineHeight: 1.55, color: "var(--ls-bbc-text)" }}>{body}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
