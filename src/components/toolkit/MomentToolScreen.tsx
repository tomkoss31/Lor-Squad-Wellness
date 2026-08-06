// =============================================================================
// MomentToolScreen — l'écran générique d'un « outil du moment » (chantier Boîte
// à outils, 2026-08-06).
//
// Généralise PareObjectionsPage : on te sort une situation → tu tapes → LE
// script mot-pour-mot apparaît, avec « pourquoi ça marche » + Copier. Un écran,
// un peu de jeu (🎲). Piloté par une MomentToolDef (src/data/momentTools.ts) ;
// le contenu vient de boite-a-outils-content.ts via le slug. Aucune duplication.
//
// Contexte client : si l'URL porte ?client=<id> (barre 1-tap de la fiche), on
// affiche « pour [Prénom] » et on garde l'id pour la personnalisation Noaly.
// =============================================================================

import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { getSupabaseClient } from "../../services/supabaseClient";
import { getToolkitItemBySlug } from "../../data/formation";
import type { MomentToolDef } from "../../data/momentTools";

/** Retire les crochets [X] / [X/30] des scripts pour un copier propre. */
function cleanForCopy(text: string): string {
  return text.replace(/\[[^\]]*\]/g, "…");
}

/** Rend une accroche avec **gras** inline (segments impairs = gras). */
function renderLede(lede: string) {
  return lede.split("**").map((part, i) =>
    i % 2 === 1 ? (
      <b key={i} style={{ color: "var(--ls-text)" }}>
        {part}
      </b>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function MomentToolScreen({ def }: { def: MomentToolDef }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { clients, currentUser } = useAppContext();

  const scripts = useMemo(() => getToolkitItemBySlug(def.slug)?.scripts ?? [], [def.slug]);

  const clientId = params.get("client");
  const client = useMemo(
    () => (clientId ? (clients ?? []).find((c) => c.id === clientId) ?? null : null),
    [clientId, clients],
  );

  // Contexte transmis à Noaly quand l'écran est ouvert depuis une fiche client.
  const clientContext = useMemo(() => {
    if (!client) return "";
    const name = `${client.firstName} ${client.lastName ?? ""}`.trim();
    const bits = [
      client.objective ? `objectif ${client.objective}` : null,
      client.lifecycleStatus ? `statut ${client.lifecycleStatus}` : null,
    ].filter(Boolean);
    return bits.length ? `${name} (${bits.join(", ")})` : name;
  }, [client]);

  const [active, setActive] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // État Noaly (personnalisation IA du script courant).
  const [noalyText, setNoalyText] = useState<string | null>(null);
  const [noalyLoading, setNoalyLoading] = useState(false);
  const [noalyError, setNoalyError] = useState<string | null>(null);
  const [noalyCopied, setNoalyCopied] = useState(false);

  const current = active !== null ? scripts[active] : null;

  const resetNoaly = () => {
    setNoalyText(null);
    setNoalyError(null);
    setNoalyCopied(false);
  };

  const pick = (i: number) => {
    setActive(i);
    setCopied(false);
    resetNoaly();
  };
  const random = () => pick(Math.floor(Math.random() * scripts.length));

  async function personalize() {
    if (!current || noalyLoading) return;
    setNoalyLoading(true);
    setNoalyError(null);
    setNoalyText(null);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");
      const { data, error } = await sb.functions.invoke("noaly", {
        body: {
          mode: "personalize_script",
          coachUserId: currentUser?.id,
          coachFirstName: (currentUser?.name ?? "").split(/\s+/)[0],
          toolTitle: def.title,
          script: current.text,
          clientContext,
        },
      });
      const payload = data as { message?: string; error?: string } | null;
      if (error || payload?.error || !payload?.message) {
        setNoalyError(payload?.message ?? "Noaly est indisponible un instant — réessaie 🌿");
        return;
      }
      setNoalyText(payload.message.trim());
    } catch (e) {
      setNoalyError(e instanceof Error ? e.message : "Erreur — réessaie.");
    } finally {
      setNoalyLoading(false);
    }
  }

  function copyNoaly() {
    if (!noalyText) return;
    try {
      void navigator.clipboard?.writeText(noalyText);
      setNoalyCopied(true);
      window.setTimeout(() => setNoalyCopied(false), 1600);
    } catch {
      /* clipboard indispo */
    }
  }

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

  return (
    <div style={wrap}>
      <style>{CSS}</style>
      <button type="button" onClick={() => navigate(-1)} style={back} aria-label="Retour">
        ← Retour
      </button>

      <div style={eyebrow}>{def.eyebrow}</div>
      <h1 style={h1}>{def.title}</h1>
      <p style={lede}>{renderLede(def.lede)}</p>

      {client ? (
        <div style={clientChip}>
          <span aria-hidden="true">🎯</span> pour&nbsp;
          <b style={{ color: "var(--ls-text)" }}>{client.firstName}</b>
        </div>
      ) : null}

      {scripts.length > 1 ? (
        <button type="button" style={randBtn} onClick={random}>
          🎲 Une au hasard <span style={{ opacity: 0.7, fontWeight: 600 }}>(pour t'entraîner)</span>
        </button>
      ) : null}

      <div style={qLabel}>{def.pickLabel}</div>
      <div style={def.columns === 1 ? gridOne : gridTwo}>
        {scripts.map((s, i) => (
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
            <span style={badge}>
              {def.icon} {def.badge}
            </span>
          </div>
          <div style={ansBody}>{current.text}</div>
          {current.note ? (
            <div style={why}>
              <span style={{ color: "var(--ls-lime)", fontWeight: 800 }}>Pourquoi ça marche · </span>
              {current.note}
            </div>
          ) : null}
          <button type="button" style={copyBtn} onClick={copy}>
            {copied ? "✓ Copié" : def.copyLabel}
          </button>
        </div>
      ) : (
        <div style={placeholder}>👆 Choisis une situation pour voir le script.</div>
      )}

      {current ? (
        <div style={noalyBlock}>
          {!noalyText ? (
            <button type="button" style={noalyBtn} onClick={personalize} disabled={noalyLoading}>
              {noalyLoading ? "✨ Noaly personnalise…" : "✨ Personnaliser avec Noaly"}
            </button>
          ) : null}
          {!noalyText ? (
            <div style={noalyHint}>
              {client
                ? `Noaly adapte ce script à ${client.firstName}.`
                : "Noaly adapte le ton et remplace les [crochets]."}
            </div>
          ) : null}
          {noalyError ? <div style={noalyErr}>{noalyError}</div> : null}
          {noalyText ? (
            <div style={noalyCard}>
              <div style={noalyLbl}>✨ Noaly{client ? ` · adapté à ${client.firstName}` : ""}</div>
              <div style={noalyMsg}>{noalyText}</div>
              <div style={noalyActions}>
                <button type="button" style={noalyCopyBtn} onClick={copyNoaly}>
                  {noalyCopied ? "✓ Copié" : "Copier"}
                </button>
                <button type="button" style={noalyRetry} onClick={personalize} disabled={noalyLoading}>
                  {noalyLoading ? "…" : "↻ Autre version"}
                </button>
              </div>
              <div style={noalyEdit}>Relis et édite avant d'envoyer — tu gardes la main.</div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const CSS = `
@keyframes mt-pop { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
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
const lede: React.CSSProperties = { fontSize: 14.5, lineHeight: 1.5, color: "var(--ls-text-muted)", margin: "0 0 14px" };
const clientChip: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5,
  color: "var(--ls-text-muted)", background: "color-mix(in srgb, var(--ls-teal) 12%, var(--ls-surface))",
  border: "1px solid color-mix(in srgb, var(--ls-teal) 30%, transparent)", borderRadius: 999, padding: "5px 12px", marginBottom: 16,
};
const randBtn: React.CSSProperties = {
  width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
  border: "1px solid color-mix(in srgb, var(--ls-lime) 40%, transparent)",
  background: "color-mix(in srgb, var(--ls-lime) 10%, var(--ls-surface))",
  color: "var(--ls-lime)", fontWeight: 800, fontSize: 14, borderRadius: 14, padding: 13, cursor: "pointer", marginBottom: 18,
};
const qLabel: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ls-text-muted)", margin: "0 0 10px",
};
const gridTwo: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 };
const gridOne: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr", gap: 9 };
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
  animation: "mt-pop .22s ease",
};
const ansTop: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, padding: "14px 16px 4px" };
const ansObj: React.CSSProperties = { fontSize: 15.5, fontWeight: 800, color: "var(--ls-text)" };
const badge: React.CSSProperties = {
  marginLeft: "auto", fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ls-lime)", flexShrink: 0, whiteSpace: "nowrap",
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

// ─── Noaly (personnalisation IA) — violet, l'identité de l'assistante ────────
const noalyBlock: React.CSSProperties = { marginTop: 12 };
const noalyBtn: React.CSSProperties = {
  width: "100%", border: "1px solid color-mix(in srgb, var(--ls-purple) 55%, transparent)",
  background: "color-mix(in srgb, var(--ls-purple) 10%, var(--ls-surface))",
  color: "var(--ls-purple)", fontWeight: 800, fontSize: 14, borderRadius: 14, padding: 13, cursor: "pointer",
};
const noalyHint: React.CSSProperties = {
  fontSize: 11.5, color: "var(--ls-text-hint)", textAlign: "center", margin: "8px 0 0", lineHeight: 1.4,
};
const noalyErr: React.CSSProperties = {
  marginTop: 10, fontSize: 12.5, color: "var(--ls-text-muted)",
  background: "color-mix(in srgb, var(--ls-purple) 7%, transparent)",
  border: "1px solid color-mix(in srgb, var(--ls-purple) 22%, transparent)", borderRadius: 12, padding: "10px 12px", lineHeight: 1.45,
};
const noalyCard: React.CSSProperties = {
  marginTop: 10, background: "color-mix(in srgb, var(--ls-purple) 8%, var(--ls-surface))",
  border: "1px solid color-mix(in srgb, var(--ls-purple) 28%, transparent)", borderLeft: "3px solid var(--ls-purple)",
  borderRadius: 14, padding: 14, animation: "mt-pop .22s ease",
};
const noalyLbl: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ls-purple)", marginBottom: 8,
};
const noalyMsg: React.CSSProperties = { fontSize: 14, lineHeight: 1.55, color: "var(--ls-text)", whiteSpace: "pre-wrap" };
const noalyActions: React.CSSProperties = { display: "flex", gap: 8, marginTop: 12 };
const noalyCopyBtn: React.CSSProperties = {
  flex: 1, background: "var(--ls-purple)", color: "#fff", border: 0, borderRadius: 10, padding: 11, fontWeight: 800, fontSize: 13.5, cursor: "pointer",
};
const noalyRetry: React.CSSProperties = {
  background: "transparent", border: "1px solid var(--ls-border)", color: "var(--ls-text-muted)", borderRadius: 10, padding: "11px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer",
};
const noalyEdit: React.CSSProperties = {
  fontSize: 11, color: "var(--ls-text-hint)", marginTop: 10, fontStyle: "italic", lineHeight: 1.4,
};
