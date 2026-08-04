// =============================================================================
// PareObjectionsPage — « Le pare-objections » (2026-08-04).
//
// 1er outil issu de l'audit Boîte à outils : le contenu est de l'or mais rangé
// dans une bibliothèque qu'on ne visite pas au moment de besoin. Ici, l'inverse :
// on te sort une objection → tu tapes → LA réponse mot-pour-mot apparaît, avec
// « pourquoi ça marche » et un bouton Copier. Simple, un écran, un peu jeu (🎲).
//
// SOURCE UNIQUE = boite-a-outils-content.ts (item « objections-reponses »).
// Thomas édite les objections/réponses là-bas, cet écran suit tout seul.
// Maquette validée : scratchpad/pare-objections.html.
// =============================================================================

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToolkitItemBySlug } from "../data/formation";

const SCRIPTS = getToolkitItemBySlug("objections-reponses")?.scripts ?? [];

/** Retire les crochets [X] / [X/30] des scripts pour un copier propre. */
function cleanForCopy(text: string): string {
  return text.replace(/\[[^\]]*\]/g, "…");
}

export function PareObjectionsPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const current = active !== null ? SCRIPTS[active] : null;

  const pick = (i: number) => {
    setActive(i);
    setCopied(false);
  };

  const random = () => pick(Math.floor(Math.random() * SCRIPTS.length));

  function copy() {
    if (!current) return;
    try {
      void navigator.clipboard?.writeText(cleanForCopy(current.text));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard indispo */
    }
  }

  const rows = useMemo(() => SCRIPTS, []);

  return (
    <div style={wrap}>
      <style>{CSS}</style>
      <button type="button" onClick={() => navigate(-1)} style={back} aria-label="Retour">
        ← Retour
      </button>

      <div style={eyebrow}>🛡️ Boîte à outils · au moment de besoin</div>
      <h1 style={h1}>Le pare-objections</h1>
      <p style={lede}>
        On te sort une objection ? Tape-la — voici quoi répondre, <b style={{ color: "var(--ls-text)" }}>mot pour mot</b>.
      </p>

      {rows.length > 1 ? (
        <button type="button" style={randBtn} onClick={random}>
          🎲 Une au hasard <span style={{ opacity: 0.7, fontWeight: 600 }}>(pour t'entraîner)</span>
        </button>
      ) : null}

      <div style={qLabel}>Qu'est-ce qu'on te sort ?</div>
      <div style={grid}>
        {rows.map((s, i) => (
          <button
            key={s.label}
            type="button"
            onClick={() => pick(i)}
            style={{ ...objBtn, ...(active === i ? objBtnOn : null) }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {current ? (
        <div style={ansCard} key={active}>
          <div style={ansTop}>
            <span style={ansObj}>{current.label}</span>
            <span style={pare}>🛡️ paré</span>
          </div>
          <div style={ansBody}>{current.text}</div>
          {current.note ? (
            <div style={why}>
              <span style={{ color: "var(--ls-lime)", fontWeight: 800 }}>Pourquoi ça marche · </span>
              {current.note}
            </div>
          ) : null}
          <button type="button" style={copyBtn} onClick={copy}>
            {copied ? "✓ Copié" : "Copier la réponse"}
          </button>
        </div>
      ) : (
        <div style={placeholder}>👆 Tape une objection pour voir la réponse.</div>
      )}
    </div>
  );
}

const CSS = `
@keyframes po-pop { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
`;

const wrap: React.CSSProperties = { maxWidth: 560, margin: "0 auto", padding: "10px 16px 48px" };
const back: React.CSSProperties = {
  background: "none", border: "none", color: "var(--ls-text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "6px 0",
};
const eyebrow: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ls-lime)", marginTop: 6,
};
const h1: React.CSSProperties = {
  fontFamily: "Anton, Impact, sans-serif", fontSize: 32, letterSpacing: ".5px", lineHeight: 1, margin: "8px 0 6px", color: "var(--ls-text)",
};
const lede: React.CSSProperties = { fontSize: 14.5, lineHeight: 1.5, color: "var(--ls-text-muted)", margin: "0 0 16px" };
const randBtn: React.CSSProperties = {
  width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
  border: "1px solid color-mix(in srgb, var(--ls-lime) 40%, transparent)",
  background: "color-mix(in srgb, var(--ls-lime) 10%, var(--ls-surface))",
  color: "var(--ls-lime)", fontWeight: 800, fontSize: 14, borderRadius: 14, padding: 13, cursor: "pointer", marginBottom: 18,
};
const qLabel: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ls-text-muted)", margin: "0 0 10px",
};
const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 };
const objBtn: React.CSSProperties = {
  textAlign: "left", background: "var(--ls-surface)", border: "1px solid var(--ls-border)", borderRadius: 13,
  padding: "12px 12px", cursor: "pointer", color: "var(--ls-text)", fontFamily: "inherit", fontSize: 13, fontWeight: 600, lineHeight: 1.3, transition: ".15s",
};
const objBtnOn: React.CSSProperties = {
  borderColor: "var(--ls-teal)", background: "color-mix(in srgb, var(--ls-teal) 12%, var(--ls-surface))",
};
const ansCard: React.CSSProperties = {
  marginTop: 16, borderRadius: 18, overflow: "hidden", border: "1px solid color-mix(in srgb, var(--ls-teal) 34%, transparent)",
  background: "linear-gradient(160deg, color-mix(in srgb, var(--ls-teal) 10%, var(--ls-surface)), var(--ls-surface))",
  animation: "po-pop .22s ease",
};
const ansTop: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, padding: "14px 16px 4px" };
const ansObj: React.CSSProperties = { fontSize: 15.5, fontWeight: 800, color: "var(--ls-text)" };
const pare: React.CSSProperties = {
  marginLeft: "auto", fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ls-lime)", flexShrink: 0,
};
const ansBody: React.CSSProperties = { padding: "8px 16px 4px", fontSize: 14.5, lineHeight: 1.55, color: "var(--ls-text)", whiteSpace: "pre-wrap" };
const why: React.CSSProperties = {
  margin: "12px 16px 0", padding: "10px 12px", borderLeft: "3px solid var(--ls-lime)",
  background: "color-mix(in srgb, var(--ls-lime) 7%, transparent)", borderRadius: "0 10px 10px 0", fontSize: 12.5, lineHeight: 1.5, color: "var(--ls-text-muted)",
};
const copyBtn: React.CSSProperties = {
  margin: "14px 16px 16px", width: "calc(100% - 32px)", background: "var(--ls-teal)", color: "var(--ls-teal-contrast)",
  border: 0, borderRadius: 12, padding: 14, fontWeight: 800, fontSize: 15, cursor: "pointer",
};
const placeholder: React.CSSProperties = {
  marginTop: 16, border: "1px dashed var(--ls-border)", borderRadius: 16, padding: "28px 18px", textAlign: "center", color: "var(--ls-text-hint)", fontSize: 13,
};
