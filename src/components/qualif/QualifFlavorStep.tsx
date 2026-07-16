// =============================================================================
// QualifFlavorStep — étape « choisis ta saveur » du parcours Qualif (2026-07-16).
//
// Grille de saveurs (registre statique flavorGroups). Le client en choisit une
// → onPick(option) appelle qualif-update mode "flavor" (le coach est notifié).
// Porte de sortie « je choisirai avec mon coach » → onSkip (mode skip_flavor).
// =============================================================================

import { useState } from "react";
import { PUBLIC_FONTS, PUBLIC_TOKENS, publicGradText } from "../public/PublicShell";
import type { FlavorGroup, FlavorOption } from "../../data/flavorGroups";

interface Props {
  firstName: string;
  group: FlavorGroup;
  onPick: (option: FlavorOption) => Promise<void>;
  onSkip: () => Promise<void>;
}

export function QualifFlavorStep({ firstName, group, onPick, onSkip }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(option: FlavorOption) {
    if (busyId) return;
    setBusyId(option.id);
    setError(null);
    try {
      await onPick(option);
    } catch {
      setError("Impossible d'enregistrer ta saveur — réessaie.");
      setBusyId(null);
    }
  }

  async function skip() {
    if (busyId) return;
    setBusyId("__skip__");
    setError(null);
    try {
      await onSkip();
    } catch {
      setError("Réessaie dans un instant.");
      setBusyId(null);
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "56px 22px 90px" }}>
      <div style={eyebrow}>Étape 1 / 4 · Ta saveur</div>
      <h1 style={heading}>
        Choisis ta saveur, <span style={publicGradText}>{firstName || "toi"}</span>
      </h1>
      <p style={sub}>{group.intro}</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 12,
          marginTop: 24,
        }}
      >
        {group.options.map((option) => {
          const busy = busyId === option.id;
          return (
            <button
              key={option.id}
              type="button"
              disabled={Boolean(busyId)}
              onClick={() => void pick(option)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                padding: "18px 12px",
                borderRadius: 16,
                border: `1px solid ${busy ? PUBLIC_TOKENS.teal : "var(--hair)"}`,
                background: busy
                  ? "color-mix(in srgb, " + PUBLIC_TOKENS.teal + " 16%, transparent)"
                  : "color-mix(in srgb, var(--cream) 4%, transparent)",
                color: "var(--cream)",
                cursor: busyId ? "wait" : "pointer",
                opacity: busyId && !busy ? 0.5 : 1,
                transition: "border-color .15s, background .15s, opacity .15s",
              }}
            >
              <span style={{ fontSize: 32 }} aria-hidden="true">
                {option.emoji}
              </span>
              <span style={{ fontFamily: PUBLIC_FONTS.body, fontSize: 13.5, fontWeight: 600, textAlign: "center" }}>
                {busy ? "…" : option.label}
              </span>
            </button>
          );
        })}
      </div>

      {error ? <div style={{ fontSize: 12.5, color: "#FCA5A5", marginTop: 14 }}>{error}</div> : null}

      <button type="button" onClick={() => void skip()} disabled={Boolean(busyId)} style={skipLink}>
        Je choisirai avec mon coach
      </button>
    </div>
  );
}

const eyebrow: React.CSSProperties = {
  fontFamily: PUBLIC_FONTS.display,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 2.5,
  textTransform: "uppercase",
  color: PUBLIC_TOKENS.teal,
  marginBottom: 12,
};
const heading: React.CSSProperties = {
  fontFamily: PUBLIC_FONTS.display,
  fontWeight: 800,
  fontSize: "clamp(26px,5vw,34px)",
  lineHeight: 1.15,
  color: "var(--cream)",
  marginBottom: 10,
};
const sub: React.CSSProperties = {
  fontFamily: PUBLIC_FONTS.body,
  fontSize: 14,
  color: "var(--cream-muted)",
  lineHeight: 1.6,
};
const skipLink: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 24,
  background: "transparent",
  border: "none",
  color: "var(--cream-muted)",
  fontSize: 13,
  textDecoration: "underline",
  cursor: "pointer",
  fontFamily: PUBLIC_FONTS.body,
};
