// =============================================================================
// QualifTelegramStep — étape « rejoins la communauté » du parcours Qualif
// (2026-07-16). Bouton vers le groupe Telegram unique (src/lib/telegram.ts) +
// « j'ai rejoint » (self-reported, fail-open comme le reste du parcours →
// qualif-update mode telegram).
// =============================================================================

import { useState } from "react";
import { PUBLIC_FONTS, PUBLIC_TOKENS, publicGradText } from "../public/PublicShell";
import { TELEGRAM_GROUP_URL } from "../../lib/telegram";

interface Props {
  firstName: string;
  onNext: () => Promise<void>;
}

export function QualifTelegramStep({ firstName, onNext }: Props) {
  const [busy, setBusy] = useState(false);
  const [opened, setOpened] = useState(false);

  async function next() {
    if (busy) return;
    setBusy(true);
    try {
      await onNext();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "56px 22px 90px", textAlign: "center" }}>
      <div style={eyebrow}>Étape 4 / 4 · La communauté</div>
      <h1 style={heading}>
        Rejoins la communauté, <span style={publicGradText}>{firstName || "toi"}</span>
      </h1>
      <p style={sub}>
        Le groupe Telegram La Base 360, c'est ta dose de motivation quotidienne : recettes, défis,
        entraide et coups de pouce. On t'y attend !
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 28 }}>
        <a
          href={TELEGRAM_GROUP_URL}
          target="_blank"
          rel="noreferrer"
          onClick={() => setOpened(true)}
          style={primaryBtn}
        >
          💬 Rejoindre le groupe Telegram
        </a>
        <button type="button" onClick={() => void next()} disabled={busy} style={secondaryBtn}>
          {busy ? "…" : opened ? "J'ai rejoint, continuer →" : "Plus tard, continuer →"}
        </button>
      </div>
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
const primaryBtn: React.CSSProperties = {
  padding: "14px 16px",
  borderRadius: 12,
  border: "none",
  background: PUBLIC_TOKENS.gradCta,
  color: "#06241f",
  fontFamily: PUBLIC_FONTS.display,
  fontWeight: 800,
  fontSize: 15,
  cursor: "pointer",
  textDecoration: "none",
};
const secondaryBtn: React.CSSProperties = {
  padding: "13px 16px",
  borderRadius: 12,
  border: "1px solid var(--hair)",
  background: "transparent",
  color: "var(--cream)",
  fontFamily: PUBLIC_FONTS.body,
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
};
