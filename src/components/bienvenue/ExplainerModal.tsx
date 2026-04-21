// Chantier Lien d'invitation client app (2026-04-21) — commit 4/5.
// Modale d'explication affichée au cas B (fiche client sans email) avant
// le formulaire de création de compte.

import { useEffect } from "react";

export function ExplainerModal({
  firstName,
  onClose,
}: {
  firstName: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Comment créer ton compte"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(5, 10, 20, 0.8)",
        backdropFilter: "blur(6px)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "linear-gradient(160deg, #1A2335 0%, #0D131F 100%)",
          borderRadius: 22,
          maxWidth: 460,
          width: "100%",
          padding: 28,
          border: "1px solid rgba(201,168,76,0.35)",
          boxShadow: "0 24px 70px rgba(0,0,0,0.55)",
          color: "#F4E9CF",
        }}
      >
        <p
          style={{
            fontFamily: "Syne, sans-serif",
            fontSize: 26,
            fontWeight: 700,
            color: "#FDECC0",
            margin: 0,
          }}
        >
          🎉 Bienvenue {firstName} !
        </p>

        <p
          style={{
            marginTop: 14,
            fontSize: 15,
            lineHeight: 1.6,
            color: "rgba(244,233,207,0.92)",
          }}
        >
          Pour accéder à ton espace, on va créer ton compte ensemble. C'est
          ultra simple :
        </p>

        <ol
          style={{
            marginTop: 16,
            paddingLeft: 22,
            fontSize: 15,
            lineHeight: 1.9,
            color: "rgba(244,233,207,0.95)",
          }}
        >
          <li>
            Tape ton <strong>email</strong> (celui que tu utilises tous les
            jours)
          </li>
          <li>
            Choisis un <strong>mot de passe</strong> que tu retiens bien
          </li>
          <li>
            Clique sur <strong>« Créer mon accès »</strong>
          </li>
        </ol>

        <p
          style={{
            marginTop: 14,
            fontSize: 15,
            color: "rgba(244,233,207,0.9)",
          }}
        >
          C'est tout ! 💪
        </p>

        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 22,
            width: "100%",
            padding: "16px 20px",
            borderRadius: 14,
            background: "linear-gradient(135deg, #D4B460, #C9A84C)",
            color: "#0B0D11",
            border: "none",
            fontFamily: "Syne, sans-serif",
            fontWeight: 700,
            fontSize: 16,
            cursor: "pointer",
            letterSpacing: 0.3,
            boxShadow: "0 8px 24px rgba(201,168,76,0.35)",
          }}
        >
          J'ai compris, c'est parti !
        </button>
      </div>
    </div>
  );
}
