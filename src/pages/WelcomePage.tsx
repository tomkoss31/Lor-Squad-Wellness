// Chantier Welcome Premium Redesign (2026-04-24).
// Porte d'entrée publique "tour de contrôle premium" : mesh gradient
// animé + grain noise + logo glow pulsant + titre gold gradient +
// 3 cards glassmorphism avec hover premium + stagger anims.
//
// Respect prefers-reduced-motion : anims désactivées si user a
// réduit les animations système.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProfileCard } from "../components/welcome/ProfileCard";
import { ClientModal } from "../components/welcome/ClientModal";
import { ProspectFormModal } from "../components/welcome/ProspectFormModal";

export function WelcomePage() {
  const navigate = useNavigate();
  const [clientOpen, setClientOpen] = useState(false);
  const [prospectOpen, setProspectOpen] = useState(false);

  // Safety net : redirection si token dans URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      navigate(`/bienvenue?token=${token}`, { replace: true });
    }
  }, [navigate]);

  return (
    <div className="welcome-root">
      <style>{`
        /* ─── Base layout ───────────────────────────────────────────── */
        .welcome-root {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 20px;
          position: relative;
          overflow: hidden;
          font-family: 'DM Sans', sans-serif;
          background: #F7F5F0;
          color: #0B0D11;
        }
        :root[data-theme="dark"] .welcome-root,
        html.dark .welcome-root {
          background: #0A0D0F;
          color: #F0EDE8;
        }

        /* ─── Mesh gradient animé (blobs en arrière-plan) ─────────────── */
        .welcome-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          opacity: 0.6;
          pointer-events: none;
          will-change: transform;
        }
        .welcome-blob-teal {
          top: -12%;
          right: -10%;
          width: 520px;
          height: 520px;
          background: radial-gradient(circle, #1D9E75 0%, transparent 70%);
          animation: welcome-float-1 28s ease-in-out infinite alternate;
        }
        .welcome-blob-gold {
          bottom: -15%;
          left: -8%;
          width: 460px;
          height: 460px;
          background: radial-gradient(circle, #EF9F27 0%, transparent 70%);
          animation: welcome-float-2 34s ease-in-out infinite alternate;
          opacity: 0.5;
        }
        :root[data-theme="dark"] .welcome-blob-teal,
        html.dark .welcome-blob-teal { opacity: 0.35; }
        :root[data-theme="dark"] .welcome-blob-gold,
        html.dark .welcome-blob-gold { opacity: 0.28; }

        @keyframes welcome-float-1 {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(-60px, 40px) scale(1.1); }
        }
        @keyframes welcome-float-2 {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(80px, -30px) scale(1.15); }
        }

        /* ─── Grain noise (SVG inline) ────────────────────────────────── */
        .welcome-grain {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.035;
          mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
        }
        :root[data-theme="dark"] .welcome-grain,
        html.dark .welcome-grain { opacity: 0.06; }

        /* ─── Contenu central ─────────────────────────────────────────── */
        .welcome-inner {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 520px;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        /* ─── Logo glow pulsant ───────────────────────────────────────── */
        .welcome-logo-wrap {
          display: flex;
          justify-content: center;
          animation: welcome-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .welcome-logo {
          width: 88px;
          height: 88px;
          border-radius: 22px;
          background: linear-gradient(135deg, #EF9F27 0%, #BA7517 100%);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 40px rgba(239, 159, 39, 0.3), 0 8px 24px rgba(186, 117, 23, 0.2);
          animation: welcome-logo-pulse 3s ease-in-out infinite alternate;
          transition: transform 0.3s ease;
        }
        .welcome-logo:hover {
          transform: scale(1.02);
        }
        @keyframes welcome-logo-pulse {
          0%   { box-shadow: 0 0 30px rgba(239,159,39,0.2),  0 8px 24px rgba(186,117,23,0.2); }
          100% { box-shadow: 0 0 60px rgba(239,159,39,0.45), 0 8px 28px rgba(186,117,23,0.25); }
        }

        /* ─── Hero (titre + accroche) ────────────────────────────────── */
        .welcome-hero { text-align: center; }
        .welcome-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(26px, 4.5vw, 36px);
          font-weight: 700;
          line-height: 1.15;
          letter-spacing: -0.02em;
          margin: 0 0 12px;
          animation: welcome-in 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
        }
        .welcome-title-greeting {
          font-weight: 600;
          color: var(--ls-text, #0B0D11);
        }
        :root[data-theme="dark"] .welcome-title-greeting,
        html.dark .welcome-title-greeting { color: #F0EDE8; }
        .welcome-title-brand {
          background: linear-gradient(135deg, #EF9F27 0%, #BA7517 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          font-weight: 800;
        }
        :root[data-theme="dark"] .welcome-title-brand,
        html.dark .welcome-title-brand {
          background: linear-gradient(135deg, #F5B847 0%, #EF9F27 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .welcome-tagline {
          font-size: 16px;
          color: rgba(11, 13, 17, 0.62);
          margin: 0;
          line-height: 1.5;
          font-weight: 400;
          animation: welcome-in 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both;
        }
        :root[data-theme="dark"] .welcome-tagline,
        html.dark .welcome-tagline { color: rgba(240, 237, 232, 0.6); }

        /* ─── Label "Tu es ?" ─────────────────────────────────────────── */
        .welcome-label-wrap {
          text-align: center;
          animation: welcome-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.6s both;
        }
        .welcome-label {
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(11, 13, 17, 0.48);
          font-weight: 700;
          display: block;
          margin-bottom: 8px;
        }
        :root[data-theme="dark"] .welcome-label,
        html.dark .welcome-label { color: rgba(240, 237, 232, 0.4); }
        .welcome-divider {
          width: 32px;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(239,159,39,0.5), transparent);
          border-radius: 999px;
          margin: 0 auto;
        }

        /* ─── Cards container ─────────────────────────────────────────── */
        .welcome-cards {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* ─── Footer ─────────────────────────────────────────────────── */
        .welcome-footer {
          text-align: center;
          font-size: 11px;
          color: rgba(11, 13, 17, 0.42);
          margin-top: 8px;
          animation: welcome-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) 1.3s both;
        }
        :root[data-theme="dark"] .welcome-footer,
        html.dark .welcome-footer { color: rgba(240, 237, 232, 0.34); }

        /* ─── Animation générique fade + slide up ─────────────────────── */
        @keyframes welcome-in {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ─── Reduced motion — tout instantané ────────────────────────── */
        @media (prefers-reduced-motion: reduce) {
          .welcome-logo-wrap,
          .welcome-title,
          .welcome-tagline,
          .welcome-label-wrap,
          .welcome-footer {
            animation: none !important;
          }
          .welcome-blob-teal,
          .welcome-blob-gold,
          .welcome-logo {
            animation: none !important;
          }
        }

        /* ─── Mobile (≤ 480px) ─────────────────────────────────────── */
        @media (max-width: 480px) {
          .welcome-root { padding: 24px 18px; }
          .welcome-inner { gap: 22px; }
          .welcome-logo { width: 72px; height: 72px; border-radius: 18px; }
          .welcome-logo svg { width: 28px; height: 28px; }
          .welcome-blob-teal { width: 360px; height: 360px; }
          .welcome-blob-gold { width: 320px; height: 320px; }
        }
      `}</style>

      {/* Background mesh gradient (blobs flous) */}
      <div aria-hidden="true" className="welcome-blob welcome-blob-teal" />
      <div aria-hidden="true" className="welcome-blob welcome-blob-gold" />
      {/* Grain noise SVG inline */}
      <div aria-hidden="true" className="welcome-grain" />

      {/* Contenu */}
      <div className="welcome-inner">
        {/* Logo avec glow pulsant */}
        <div className="welcome-logo-wrap">
          <div className="welcome-logo" aria-hidden="true">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="#0B0D11">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
        </div>

        {/* Hero : titre + accroche */}
        <div className="welcome-hero">
          <h1 className="welcome-title">
            <span className="welcome-title-greeting">Bienvenue sur</span>
            <br />
            <span className="welcome-title-brand">Lor&apos;Squad Wellness</span>
          </h1>
          <p className="welcome-tagline">Ta transformation commence ici.</p>
        </div>

        {/* Label "Tu es ?" */}
        <div className="welcome-label-wrap">
          <span className="welcome-label">Tu es ?</span>
          <div className="welcome-divider" aria-hidden="true" />
        </div>

        {/* 3 cards profil */}
        <div className="welcome-cards">
          <ProfileCard
            icon="👤"
            title="Client suivi par un coach"
            subtitle="Accès à mon programme perso"
            onClick={() => setClientOpen(true)}
            delayMs={800}
            accent="teal"
          />
          <ProfileCard
            icon="🚀"
            title="Distributeur de l'équipe"
            subtitle="Accès à ma tour de contrôle"
            onClick={() => navigate("/login")}
            delayMs={900}
            accent="gold"
          />
          <ProfileCard
            icon="✨"
            title="Je veux rejoindre l'aventure"
            subtitle="Découvrir le business Lor'Squad"
            onClick={() => setProspectOpen(true)}
            delayMs={1000}
            accent="magenta"
          />
        </div>

        {/* Footer */}
        <div className="welcome-footer">
          Propulsé par Lor&apos;Squad · La Base Verdun
        </div>
      </div>

      <ClientModal open={clientOpen} onClose={() => setClientOpen(false)} />
      <ProspectFormModal open={prospectOpen} onClose={() => setProspectOpen(false)} />
    </div>
  );
}
