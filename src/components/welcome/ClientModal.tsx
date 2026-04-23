// Chantier Welcome Page + Magic Links (2026-04-24).
// Modale contextuelle "Tu as un lien d'invitation de ton coach ?"
// 2 branches : oui (→ /login) / non (message + conseil).

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ClientModal({ open, onClose }: Props) {
  const navigate = useNavigate();
  const [noLink, setNoLink] = useState(false);

  useEffect(() => {
    if (!open) {
      setNoLink(false);
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Fermer"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Client suivi par un coach"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        style={{
          background: "var(--ls-surface)",
          border: "1px solid rgba(239,159,39,0.18)",
          borderRadius: 20,
          maxWidth: 420,
          width: "100%",
          padding: 26,
          boxShadow: "0 24px 64px rgba(0,0,0,0.4), 0 4px 16px rgba(239,159,39,0.08)",
          fontFamily: "DM Sans, sans-serif",
          color: "var(--ls-text)",
        }}
      >
        {!noLink ? (
          <>
            <h3
              style={{
                fontFamily: "Syne, sans-serif",
                fontSize: 18,
                fontWeight: 700,
                margin: 0,
                marginBottom: 8,
              }}
            >
              Tu as un lien d&apos;invitation de ton coach ?
            </h3>
            <p style={{ fontSize: 13, color: "var(--ls-text-muted)", marginBottom: 16, lineHeight: 1.5 }}>
              Ton coach t&apos;a envoyé un lien par WhatsApp ou SMS. Utilise-le pour créer ton
              compte en 30 secondes.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                type="button"
                onClick={() => navigate("/login")}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
                  border: "none",
                  color: "#FFFFFF",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Oui, je me connecte
              </button>
              <button
                type="button"
                onClick={() => setNoLink(true)}
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: 10,
                  background: "transparent",
                  border: "1px solid var(--ls-border)",
                  color: "var(--ls-text-muted)",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                Non, je n&apos;ai pas de lien
              </button>
            </div>
          </>
        ) : (
          <>
            <h3
              style={{
                fontFamily: "Syne, sans-serif",
                fontSize: 18,
                fontWeight: 700,
                margin: 0,
                marginBottom: 8,
              }}
            >
              Contacte ton coach 💬
            </h3>
            <p style={{ fontSize: 13, color: "var(--ls-text-muted)", marginBottom: 14, lineHeight: 1.55 }}>
              Ton coach doit te générer un lien d&apos;invitation personnalisé depuis son espace
              pro. Redemande-le par WhatsApp ou SMS — il te l&apos;envoie en 10 secondes.
            </p>
            <div
              style={{
                padding: "10px 12px",
                background: "rgba(239,159,39,0.08)",
                border: "1px solid rgba(239,159,39,0.25)",
                borderRadius: 10,
                fontSize: 12,
                color: "var(--ls-text)",
                lineHeight: 1.5,
                marginBottom: 14,
              }}
            >
              💡 Si tu veux contacter Thomas Houbert (créateur Lor&apos;Squad), écris-lui sur
              WhatsApp : il te connectera à un coach de son équipe proche de chez toi.
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 10,
                background: "transparent",
                border: "1px solid var(--ls-border)",
                color: "var(--ls-text-muted)",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Fermer
            </button>
          </>
        )}
      </div>
    </div>
  );
}
