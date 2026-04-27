// Chantier Academy direction 6 (2026-04-28).
// Page certificat de formation Lor'Squad Academy. Mode beta — design
// premium avec print stylesheet pour export PDF natif (Ctrl+P).
//
// Visible uniquement si view.isCompleted === true. Sinon redirect
// vers /academy.

import { useNavigate } from "react-router-dom";
import { useAcademyProgress } from "../features/academy/hooks/useAcademyProgress";
import { useAppContext } from "../context/AppContext";

export function AcademyCertificatePage() {
  const navigate = useNavigate();
  const { view } = useAcademyProgress();
  const { currentUser } = useAppContext();

  if (!view.loaded) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#6B6B62" }}>
        Chargement…
      </div>
    );
  }

  if (!view.isCompleted) {
    // Pas encore complete -> renvoie vers overview
    navigate("/academy", { replace: true });
    return null;
  }

  const name = currentUser?.name ?? "Distributeur Lor'Squad";
  // V1 : on prend la date du jour comme date de delivrance. Sera
  // enrichie avec view.completedAt en chantier futur si on expose le
  // timestamp dans useAcademyProgress.
  const completedAt = new Date();
  const dateLabel = completedAt.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F5EFDC",
        padding: "32px 16px 60px",
        fontFamily: "var(--ls-font-sans, system-ui, sans-serif)",
      }}
    >
      <style>{`
        @media print {
          body, html { background: white !important; }
          .ls-cert-header, .ls-cert-actions { display: none !important; }
          .ls-cert-page { box-shadow: none !important; margin: 0 !important; padding: 60px !important; border: none !important; }
          @page { size: A4; margin: 0; }
        }
      `}</style>

      {/* Bandeau navigation + actions (caché à l'impression) */}
      <div
        className="ls-cert-header"
        style={{
          maxWidth: 800,
          margin: "0 auto 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/academy")}
          style={{
            background: "transparent",
            border: "0.5px solid #C9C2AB",
            color: "#5F5E5A",
            padding: "8px 14px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          ← Retour à l&apos;Academy
        </button>
        <span
          style={{
            background: "rgba(216,90,48,0.15)",
            color: "#993556",
            padding: "4px 10px",
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          🚧 Mode beta
        </span>
      </div>

      {/* Page certificat A4 ratio */}
      <div
        className="ls-cert-page"
        style={{
          maxWidth: 800,
          margin: "0 auto",
          background: "white",
          borderRadius: 6,
          padding: "60px 50px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(184,146,42,0.12)",
          position: "relative",
          aspectRatio: "1 / 1.414",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* Border ornamental gold double-line */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            right: 16,
            bottom: 16,
            border: "2px solid #B8922A",
            borderRadius: 4,
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 22,
            left: 22,
            right: 22,
            bottom: 22,
            border: "0.5px solid rgba(184,146,42,0.4)",
            borderRadius: 2,
            pointerEvents: "none",
          }}
        />

        {/* Header */}
        <div style={{ textAlign: "center", marginTop: 20 }}>
          {/* Logo / sceau gold */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #EF9F27 0%, #B8922A 60%, #8B6F1F 100%)",
              margin: "0 auto 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(184,146,42,0.35)",
              border: "2px solid white",
            }}
          >
            <span style={{ fontFamily: "Syne, serif", fontSize: 34, fontWeight: 700, color: "white" }}>
              L
            </span>
          </div>
          <p
            style={{
              fontSize: 11,
              color: "#5C4A0F",
              textTransform: "uppercase",
              letterSpacing: "0.4em",
              margin: 0,
              fontWeight: 600,
            }}
          >
            Lor&apos;Squad Wellness
          </p>
          <h1
            style={{
              fontFamily: "Syne, serif",
              fontSize: 38,
              fontWeight: 500,
              color: "#2C2C2A",
              margin: "14px 0 0",
              letterSpacing: "0.02em",
            }}
          >
            Certificat de formation
          </h1>
          <div
            style={{
              width: 80,
              height: 2,
              background: "#B8922A",
              margin: "16px auto 0",
              borderRadius: 1,
            }}
          />
        </div>

        {/* Body */}
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <p
            style={{
              fontSize: 14,
              color: "#5F5E5A",
              fontStyle: "italic",
              margin: "0 0 18px",
              letterSpacing: "0.02em",
            }}
          >
            Décerné à
          </p>
          <p
            style={{
              fontFamily: "Syne, serif",
              fontSize: 36,
              fontWeight: 500,
              color: "#2C2C2A",
              margin: 0,
              letterSpacing: "0.01em",
            }}
          >
            {name}
          </p>
          <p
            style={{
              fontSize: 14,
              color: "#5F5E5A",
              margin: "20px auto 0",
              maxWidth: 480,
              lineHeight: 1.7,
            }}
          >
            qui a complété avec succès l&apos;intégralité du parcours{" "}
            <strong style={{ color: "#B8922A", fontWeight: 600 }}>Lor&apos;Squad Academy</strong> —
            les 8 sections de formation au métier de distributeur Herbalife,
            au programme client et à la gestion d&apos;activité.
          </p>
          <p
            style={{
              fontSize: 13,
              color: "#888780",
              margin: "16px 0 0",
            }}
          >
            Délivré le <strong style={{ color: "#5C4A0F" }}>{dateLabel}</strong>
          </p>
        </div>

        {/* Badges miniatures */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 16,
            margin: "10px 0",
          }}
        >
          {["🌱", "⛰️", "🏃", "🎓"].map((emoji, i) => (
            <span
              key={i}
              style={{
                fontSize: 22,
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "#FAF6E8",
                border: "1px solid rgba(184,146,42,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {emoji}
            </span>
          ))}
        </div>

        {/* Footer signatures */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            alignItems: "flex-end",
            paddingTop: 18,
            borderTop: "1px solid rgba(184,146,42,0.2)",
            marginTop: 18,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                fontFamily: "Syne, serif",
                fontSize: 16,
                color: "#5C4A0F",
                margin: 0,
                fontWeight: 500,
                fontStyle: "italic",
              }}
            >
              Thomas Korber
            </p>
            <p
              style={{
                fontSize: 10,
                color: "#888780",
                margin: "4px 0 0",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Co-fondateur
            </p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                fontFamily: "Syne, serif",
                fontSize: 16,
                color: "#5C4A0F",
                margin: 0,
                fontWeight: 500,
                fontStyle: "italic",
              }}
            >
              Mélanie Schmidt
            </p>
            <p
              style={{
                fontSize: 10,
                color: "#888780",
                margin: "4px 0 0",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Co-fondatrice
            </p>
          </div>
        </div>
      </div>

      {/* Bouton imprimer (caché à l'impression) */}
      <div
        className="ls-cert-actions"
        style={{
          maxWidth: 800,
          margin: "20px auto 0",
          display: "flex",
          justifyContent: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => window.print()}
          style={{
            background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
            color: "white",
            border: "none",
            padding: "12px 22px",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "DM Sans, sans-serif",
            boxShadow: "0 4px 12px rgba(186,117,23,0.30)",
          }}
        >
          🖨️ Imprimer / Exporter PDF
        </button>
        <button
          type="button"
          onClick={() => navigate("/academy")}
          style={{
            background: "white",
            color: "#5F5E5A",
            border: "0.5px solid #C9C2AB",
            padding: "12px 22px",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          Retour à l&apos;Academy
        </button>
      </div>
    </div>
  );
}
