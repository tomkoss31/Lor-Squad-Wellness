// Bloc signature : label + signature (image base64 ou Dancing Script
// fallback "En attente") + ligne séparation + caption.

import type { CharterDisplayMode } from "../../types/charter";

interface Props {
  label: string;
  fullName: string;
  caption: string;
  /** Si fourni : on affiche le PNG. Sinon : on affiche le nom en cursive faded. */
  signatureDataUrl?: string | null;
  signedAt?: string | null;
  mode: CharterDisplayMode;
  onSignClick?: () => void;
  cursiveColor?: string; // default teal
}

export function CharterSignatureBlock({
  label,
  fullName,
  caption,
  signatureDataUrl,
  signedAt,
  mode,
  onSignClick,
  cursiveColor = "#1D9E75",
}: Props) {
  const isSigned = !!signatureDataUrl;
  const canSign = mode === "fillable" && !!onSignClick && !isSigned;

  return (
    <div style={{ textAlign: "center", position: "relative" }}>
      <div
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 9.5,
          letterSpacing: 4,
          color: "#8B6F1F",
          textTransform: "uppercase",
          fontWeight: 600,
          marginBottom: 16,
        }}
      >
        ✦ {label} ✦
      </div>

      {isSigned ? (
        <img
          src={signatureDataUrl ?? ""}
          alt={`Signature ${fullName}`}
          style={{
            display: "block",
            margin: "0 auto",
            maxHeight: 70,
            maxWidth: "85%",
            objectFit: "contain",
          }}
        />
      ) : (
        <div
          onClick={canSign ? onSignClick : undefined}
          style={{
            fontFamily: "'Dancing Script', cursive",
            fontSize: 38,
            color: canSign ? cursiveColor : `${cursiveColor}59`,
            fontWeight: 600,
            lineHeight: 1,
            marginBottom: 8,
            cursor: canSign ? "pointer" : "default",
            fontStyle: "italic",
            textDecoration: canSign ? "underline dotted" : "none",
            textUnderlineOffset: 6,
          }}
          role={canSign ? "button" : undefined}
          tabIndex={canSign ? 0 : undefined}
          onKeyDown={
            canSign
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSignClick?.();
                  }
                }
              : undefined
          }
        >
          {fullName.split(/\s+/)[0] || fullName}
        </div>
      )}

      <div
        style={{
          width: "75%",
          height: 1,
          margin: "6px auto 8px",
          background: "#4A3F2A",
          opacity: 0.4,
        }}
      />

      <div
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 11.5,
          color: "#4A3F2A",
          fontStyle: "italic",
        }}
      >
        {isSigned && signedAt
          ? `Signé le ${new Date(signedAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })} · ${caption}`
          : canSign
            ? `Cliquer pour signer · ${caption}`
            : caption}
      </div>
    </div>
  );
}
