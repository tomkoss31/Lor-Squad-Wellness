// =============================================================================
// QualifScanAppStep — étape « installe ton appli » du parcours Qualif
// (2026-07-16). QR code (QRCodeSVG) vers le lien permanent /client/:token de la
// fiche créée + bouton direct « Ouvrir mon espace » (utile s'ils sont déjà sur
// leur propre téléphone). Continuer → onNext (qualif-update mode app_opened).
// =============================================================================

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { PUBLIC_FONTS, PUBLIC_TOKENS, publicGradText } from "../public/PublicShell";

interface Props {
  firstName: string;
  clientToken: string;
  onNext: () => Promise<void>;
}

export function QualifScanAppStep({ firstName, clientToken, onNext }: Props) {
  const [busy, setBusy] = useState(false);
  const appUrl = `${window.location.origin}/client/${clientToken}`;

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
      <div style={eyebrow}>Étape 2 / 4 · Ton appli</div>
      <h1 style={heading}>
        Installe ton espace, <span style={publicGradText}>{firstName || "toi"}</span>
      </h1>
      <p style={sub}>
        Scanne ce QR code avec ton téléphone pour ouvrir ton espace personnel : ton programme, tes
        conseils, ta progression et la messagerie avec ton coach.
      </p>

      {/* QR sur fond blanc (scannabilité garantie même en thème sombre). */}
      <div
        style={{
          display: "inline-flex",
          padding: 18,
          borderRadius: 20,
          background: "#fff",
          margin: "24px auto 0",
          boxShadow: `0 0 0 1px var(--hair), 0 16px 40px color-mix(in srgb, ${PUBLIC_TOKENS.teal} 18%, transparent)`,
        }}
      >
        <QRCodeSVG value={appUrl} size={196} level="M" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 28 }}>
        <a href={appUrl} target="_blank" rel="noreferrer" style={secondaryBtn}>
          Ouvrir mon espace sur ce téléphone →
        </a>
        <button type="button" onClick={() => void next()} disabled={busy} style={primaryBtn}>
          {busy ? "…" : "C'est fait, continuer →"}
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
  textDecoration: "none",
};
