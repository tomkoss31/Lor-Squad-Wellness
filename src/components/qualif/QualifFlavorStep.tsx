// =============================================================================
// QualifFlavorStep — étape « choisis tes saveurs » du parcours Qualif
// (2026-07-16). Un programme contient plusieurs produits à saveur (Formula 1,
// Thé, Aloé) : une SECTION par produit, une saveur à choisir dans chacune.
// « Continuer » actif quand toutes les sections ont un choix → onSubmit(choices).
// Porte de sortie « je choisirai avec mon coach » → onSkip (mode skip_flavor).
// =============================================================================

import { useState } from "react";
import { PUBLIC_FONTS, PUBLIC_TOKENS, publicGradText } from "../public/PublicShell";
import type { FlavorGroup } from "../../data/flavorGroups";

interface Props {
  firstName: string;
  groups: FlavorGroup[];
  /** choices = { [group.key]: option.id }. */
  onSubmit: (choices: Record<string, string>) => Promise<void>;
  onSkip: () => Promise<void>;
}

export function QualifFlavorStep({ firstName, groups, onSubmit, onSkip }: Props) {
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<"submit" | "skip" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allChosen = groups.every((g) => choices[g.key]);

  async function submit() {
    if (busy || !allChosen) return;
    setBusy("submit");
    setError(null);
    try {
      await onSubmit(choices);
    } catch {
      setError("Impossible d'enregistrer tes saveurs — réessaie.");
      setBusy(null);
    }
  }

  async function skip() {
    if (busy) return;
    setBusy("skip");
    setError(null);
    try {
      await onSkip();
    } catch {
      setError("Réessaie dans un instant.");
      setBusy(null);
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "56px 22px 90px" }}>
      <div style={eyebrow}>Étape 1 / 4 · Tes saveurs</div>
      <h1 style={heading}>
        Choisis tes saveurs, <span style={publicGradText}>{firstName || "toi"}</span>
      </h1>
      <p style={sub}>
        Tes produits existent en plusieurs saveurs. Choisis celle qui te fait envie pour chacun — tu
        pourras en changer à ta prochaine commande.
      </p>

      {groups.map((group) => (
        <section key={group.key} style={{ marginTop: 28 }}>
          <div style={sectionTitle}>{group.productName}</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))",
              gap: 10,
              marginTop: 12,
            }}
          >
            {group.options.map((option) => {
              const selected = choices[group.key] === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => setChoices((c) => ({ ...c, [group.key]: option.id }))}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 7,
                    padding: "16px 10px",
                    borderRadius: 14,
                    border: `1px solid ${selected ? PUBLIC_TOKENS.teal : "var(--hair)"}`,
                    background: selected
                      ? "color-mix(in srgb, " + PUBLIC_TOKENS.teal + " 16%, transparent)"
                      : "color-mix(in srgb, var(--cream) 4%, transparent)",
                    color: "var(--cream)",
                    cursor: busy ? "wait" : "pointer",
                    transition: "border-color .15s, background .15s",
                  }}
                >
                  <span style={{ fontSize: 28 }} aria-hidden="true">
                    {option.emoji}
                  </span>
                  <span
                    style={{
                      fontFamily: PUBLIC_FONTS.body,
                      fontSize: 12.5,
                      fontWeight: 600,
                      textAlign: "center",
                      lineHeight: 1.3,
                    }}
                  >
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {error ? <div style={{ fontSize: 12.5, color: "#FCA5A5", marginTop: 16 }}>{error}</div> : null}

      <button
        type="button"
        onClick={() => void submit()}
        disabled={Boolean(busy) || !allChosen}
        style={{
          ...ctaPrimary,
          marginTop: 28,
          width: "100%",
          opacity: !allChosen || busy === "submit" ? 0.55 : 1,
          cursor: !allChosen ? "not-allowed" : busy ? "wait" : "pointer",
        }}
      >
        {busy === "submit" ? "Enregistrement…" : allChosen ? "Continuer →" : "Choisis une saveur par produit"}
      </button>

      <button type="button" onClick={() => void skip()} disabled={Boolean(busy)} style={skipLink}>
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
const sectionTitle: React.CSSProperties = {
  fontFamily: PUBLIC_FONTS.display,
  fontWeight: 700,
  fontSize: 15,
  color: "var(--cream)",
};
const ctaPrimary: React.CSSProperties = {
  padding: "14px 16px",
  borderRadius: 12,
  border: "none",
  background: PUBLIC_TOKENS.gradCta,
  color: "#06241f",
  fontFamily: PUBLIC_FONTS.display,
  fontWeight: 800,
  fontSize: 15,
};
const skipLink: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 18,
  background: "transparent",
  border: "none",
  color: "var(--cream-muted)",
  fontSize: 13,
  textDecoration: "underline",
  cursor: "pointer",
  fontFamily: PUBLIC_FONTS.body,
};
