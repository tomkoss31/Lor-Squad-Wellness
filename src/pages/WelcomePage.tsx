// Chantier Welcome Page + Magic Links (2026-04-24).
// Route publique "/" quand aucune session active. Identifie le profil
// du visiteur (Client / Distributeur / Prospect) et le redirige vers
// le bon flow :
// - Client → modale "Tu as un lien ?" → /login ou message conseil
// - Distributeur → direct /login
// - Prospect → modale formulaire → insert prospect_leads

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProfileCard } from "../components/welcome/ProfileCard";
import { ClientModal } from "../components/welcome/ClientModal";
import { ProspectFormModal } from "../components/welcome/ProspectFormModal";

export function WelcomePage() {
  const navigate = useNavigate();
  const [clientOpen, setClientOpen] = useState(false);
  const [prospectOpen, setProspectOpen] = useState(false);

  // Safety net : si l'URL contient déjà un token d'invitation, on
  // redirige direct vers le bon flow (le visiteur n'aurait pas dû
  // atterrir ici, mais ça peut arriver si un bookmark / partage
  // incomplet).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      navigate(`/bienvenue?token=${token}`, { replace: true });
    }
  }, [navigate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, var(--ls-surface) 0%, var(--ls-bg, #0B0D11) 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      <style>{`
        @keyframes welcome-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ width: "100%", maxWidth: 480 }}>
        {/* Header */}
        <div
          style={{
            textAlign: "center",
            marginBottom: 28,
            animation: "welcome-fade-in 0.5s ease-out 200ms both",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "linear-gradient(135deg, #C9A84C, #BA7517)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
              boxShadow: "0 4px 16px rgba(186,117,23,0.3)",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#0B0D11">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <h1
            style={{
              fontFamily: "Syne, sans-serif",
              fontSize: 24,
              fontWeight: 800,
              color: "var(--ls-text)",
              margin: 0,
              marginBottom: 6,
              letterSpacing: "-0.01em",
            }}
          >
            Bienvenue sur{" "}
            <span style={{ color: "#C9A84C" }}>Lor&apos;Squad Wellness</span>
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "var(--ls-text-muted)",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Ta tour de contrôle pour une meilleure forme.
          </p>
        </div>

        {/* Question */}
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ls-text-hint)",
            fontWeight: 700,
            marginBottom: 10,
            textAlign: "center",
            animation: "welcome-fade-in 0.5s ease-out 300ms both",
          }}
        >
          Tu es ?
        </div>

        {/* Les 3 cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
          <ProfileCard
            icon="👤"
            title="Client suivi par un coach"
            subtitle="Accès à mon programme perso"
            onClick={() => setClientOpen(true)}
            delayMs={400}
          />
          <ProfileCard
            icon="🚀"
            title="Distributeur de l'équipe"
            subtitle="Accès à ma tour de contrôle"
            onClick={() => navigate("/login")}
            delayMs={500}
          />
          <ProfileCard
            icon="✨"
            title="Je veux rejoindre l'aventure"
            subtitle="Découvrir le business Lor'Squad"
            onClick={() => setProspectOpen(true)}
            delayMs={600}
          />
        </div>

        {/* Footer */}
        <div
          style={{
            textAlign: "center",
            fontSize: 11,
            color: "var(--ls-text-hint)",
            marginTop: 14,
            animation: "welcome-fade-in 0.5s ease-out 700ms both",
          }}
        >
          Propulsé par Lor&apos;Squad · La Base Verdun
        </div>
      </div>

      <ClientModal open={clientOpen} onClose={() => setClientOpen(false)} />
      <ProspectFormModal open={prospectOpen} onClose={() => setProspectOpen(false)} />
    </div>
  );
}
