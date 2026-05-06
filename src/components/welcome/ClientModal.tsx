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
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: 20,
          maxWidth: 440,
          width: "100%",
          padding: 28,
          boxShadow: "0 24px 64px rgba(15,23,42,0.18), 0 4px 16px rgba(16,185,129,0.06)",
          fontFamily: "Inter, system-ui, sans-serif",
          color: "#0F172A",
        }}
      >
        {!noLink ? (
          <>
            <h3
              style={{
                fontFamily: "Sora, system-ui, sans-serif",
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: "-0.015em",
                margin: 0,
                marginBottom: 10,
                color: "#0F172A",
              }}
            >
              Tu as un lien d&apos;invitation de ton coach ?
            </h3>
            <p style={{ fontSize: 13.5, color: "#475569", marginBottom: 18, lineHeight: 1.55 }}>
              Ton coach t&apos;a envoyé un lien par WhatsApp ou SMS. Utilise-le pour créer ton
              compte en 30 secondes.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                type="button"
                onClick={() => navigate("/login")}
                style={{
                  width: "100%",
                  padding: "14px 14px",
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%)",
                  border: "none",
                  color: "#FFFFFF",
                  cursor: "pointer",
                  fontSize: 13.5,
                  fontWeight: 600,
                  fontFamily: "Sora, system-ui, sans-serif",
                  boxShadow: "0 4px 16px rgba(16,185,129,0.30)",
                }}
              >
                Oui, je me connecte
              </button>
              <button
                type="button"
                onClick={() => setNoLink(true)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "transparent",
                  border: "1px solid #E2E8F0",
                  color: "#475569",
                  cursor: "pointer",
                  fontSize: 12.5,
                  fontFamily: "Inter, system-ui, sans-serif",
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
                fontFamily: "Sora, system-ui, sans-serif",
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: "-0.015em",
                margin: 0,
                marginBottom: 10,
                color: "#0F172A",
              }}
            >
              Contacte ton coach 💬
            </h3>
            <p style={{ fontSize: 13.5, color: "#475569", marginBottom: 16, lineHeight: 1.55 }}>
              Ton coach doit te générer un lien d&apos;invitation personnalisé depuis son espace
              pro. Redemande-le par WhatsApp ou SMS — il te l&apos;envoie en 10 secondes.
            </p>
            <div
              style={{
                padding: "12px 14px",
                background: "linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(6,182,212,0.06) 100%)",
                border: "1px solid rgba(16,185,129,0.20)",
                borderRadius: 12,
                fontSize: 12.5,
                color: "#0F172A",
                lineHeight: 1.55,
                marginBottom: 16,
              }}
            >
              💡 Si tu veux contacter Thomas Houbert (créateur La Base 360), écris-lui sur
              WhatsApp : il te connectera à un coach de son équipe proche de chez toi.
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 12,
                background: "transparent",
                border: "1px solid #E2E8F0",
                color: "#475569",
                cursor: "pointer",
                fontSize: 12.5,
                fontFamily: "Inter, system-ui, sans-serif",
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
