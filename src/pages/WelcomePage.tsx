// =============================================================================
// WelcomePage — Porte d'entree publique La Base 360 (Rebrand 2026-05-05)
//
// Refonte complete avec identite G3 Vital Fusion :
//   - Logo "patience" (orbe + B + Since 2022 + tagline) au centre
//   - Mesh gradient G3 (emerald, cyan, violet) au lieu de gold/teal
//   - Sora 700 pour titre + Inter pour body
//   - Heritage badge "★ Since 2022 ★"
//   - Cards glassmorphism gardent leur structure (anims stagger)
//   - prefers-reduced-motion respecte
// =============================================================================

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
          font-family: 'Inter', system-ui, sans-serif;
          background: #FFFFFF;
          color: #0F172A;
        }

        /* ─── Mesh G3 (Emerald + Cyan + Violet, blobs flous) ────────── */
        .welcome-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(110px);
          opacity: 0.55;
          pointer-events: none;
          will-change: transform;
        }
        .welcome-blob-emerald {
          top: -10%;
          left: -8%;
          width: 540px;
          height: 540px;
          background: radial-gradient(circle, #10B981 0%, transparent 70%);
          animation: welcome-float-1 28s ease-in-out infinite alternate;
        }
        .welcome-blob-cyan {
          top: 20%;
          right: -12%;
          width: 480px;
          height: 480px;
          background: radial-gradient(circle, #06B6D4 0%, transparent 70%);
          animation: welcome-float-2 32s ease-in-out infinite alternate;
          opacity: 0.45;
        }
        .welcome-blob-violet {
          bottom: -15%;
          left: 30%;
          width: 460px;
          height: 460px;
          background: radial-gradient(circle, #8B5CF6 0%, transparent 70%);
          animation: welcome-float-3 36s ease-in-out infinite alternate;
          opacity: 0.40;
        }

        @keyframes welcome-float-1 {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(-50px, 40px) scale(1.1); }
        }
        @keyframes welcome-float-2 {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(60px, -30px) scale(1.12); }
        }
        @keyframes welcome-float-3 {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(40px, -50px) scale(1.08); }
        }

        /* ─── Grain noise (SVG inline, leger) ─────────────────────── */
        .welcome-grain {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.025;
          mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
        }

        /* ─── Contenu central ─────────────────────────────────────── */
        .welcome-inner {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 540px;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        /* ─── Logo orbe (app-icon SVG) avec glow pulse G3 ────────── */
        .welcome-logo-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          animation: welcome-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .welcome-logo-ring {
          position: relative;
          width: 116px;
          height: 116px;
        }
        .welcome-logo-ring::before {
          content: '';
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          background: conic-gradient(from 0deg, transparent 0%, rgba(16,185,129,0.4) 25%, rgba(6,182,212,0.5) 50%, rgba(139,92,246,0.4) 75%, transparent 100%);
          animation: welcome-ring-rotate 6s linear infinite;
          opacity: 0.7;
        }
        .welcome-logo-ring::after {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          background: white;
        }
        .welcome-logo {
          position: relative;
          z-index: 1;
          width: 116px;
          height: 116px;
          border-radius: 28px;
          object-fit: contain;
          animation: welcome-logo-breathe 3.5s ease-in-out infinite alternate;
          filter: drop-shadow(0 0 28px rgba(16,185,129,0.35)) drop-shadow(0 12px 32px rgba(6,182,212,0.20));
          will-change: transform, filter;
        }
        @keyframes welcome-logo-breathe {
          0%   { transform: scale(1); filter: drop-shadow(0 0 24px rgba(16,185,129,0.30)) drop-shadow(0 12px 32px rgba(6,182,212,0.18)); }
          100% { transform: scale(1.04); filter: drop-shadow(0 0 36px rgba(16,185,129,0.50)) drop-shadow(0 16px 36px rgba(139,92,246,0.30)); }
        }
        @keyframes welcome-ring-rotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        /* ─── Heritage badge ★ Since 2022 ★ ──────────────────────── */
        .welcome-heritage {
          padding: 6px 18px;
          border-radius: 100px;
          background: rgba(16,185,129,0.06);
          border: 0.5px solid rgba(16,185,129,0.18);
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          color: #475569;
          backdrop-filter: blur(8px);
        }

        /* ─── Hero (titre + accroche) ─────────────────────────────── */
        .welcome-hero { text-align: center; }
        .welcome-title {
          font-family: 'Sora', system-ui, sans-serif;
          font-size: clamp(34px, 6vw, 48px);
          font-weight: 700;
          line-height: 1.05;
          letter-spacing: -0.025em;
          margin: 0 0 14px;
          color: #0F172A;
          animation: welcome-in 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
        }
        .welcome-title-greeting {
          font-weight: 500;
          color: #475569;
          font-size: 0.55em;
          display: block;
          margin-bottom: 6px;
          letter-spacing: 0.02em;
        }
        .welcome-title-brand {
          font-weight: 700;
          color: #0F172A;
        }
        .welcome-title-360 {
          font-style: italic;
          font-weight: 400;
          background: linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          display: inline-block;
          padding-right: 6px;
        }
        .welcome-tagline {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 16px;
          color: #475569;
          margin: 0;
          line-height: 1.5;
          font-weight: 400;
          animation: welcome-in 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both;
        }
        .welcome-tagline-en {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 12px;
          color: #94A3B8;
          margin: 6px 0 0;
          line-height: 1.5;
          font-weight: 400;
          letter-spacing: 0.02em;
          animation: welcome-in 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.5s both;
        }

        /* ─── Label "Tu es ?" ─────────────────────────────────────── */
        .welcome-label-wrap {
          text-align: center;
          animation: welcome-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.6s both;
        }
        .welcome-label {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #94A3B8;
          font-weight: 700;
          display: block;
          margin-bottom: 10px;
        }
        .welcome-divider {
          width: 36px;
          height: 2px;
          background: linear-gradient(90deg, transparent 0%, #10B981 30%, #06B6D4 50%, #8B5CF6 70%, transparent 100%);
          border-radius: 999px;
          margin: 0 auto;
        }

        /* ─── Cards container ─────────────────────────────────────── */
        .welcome-cards {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* ─── Footer ─────────────────────────────────────────────── */
        .welcome-footer {
          text-align: center;
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 11px;
          color: #94A3B8;
          margin-top: 8px;
          animation: welcome-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) 1.3s both;
        }
        .welcome-footer-brand {
          font-weight: 600;
          background: linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* ─── Animation generique fade + slide up ─────────────────── */
        @keyframes welcome-in {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ─── Reduced motion ──────────────────────────────────────── */
        @media (prefers-reduced-motion: reduce) {
          .welcome-logo-wrap,
          .welcome-title,
          .welcome-tagline,
          .welcome-tagline-en,
          .welcome-label-wrap,
          .welcome-footer {
            animation: none !important;
          }
          .welcome-blob-emerald,
          .welcome-blob-cyan,
          .welcome-blob-violet,
          .welcome-logo,
          .welcome-logo-ring::before {
            animation: none !important;
          }
        }

        /* ─── Mobile (≤ 480px) ────────────────────────────────────── */
        @media (max-width: 480px) {
          .welcome-root { padding: 24px 18px; }
          .welcome-inner { gap: 22px; }
          .welcome-logo-ring { width: 96px; height: 96px; }
          .welcome-logo { width: 96px; height: 96px; border-radius: 22px; }
          .welcome-blob { filter: blur(80px); }
          .welcome-blob-emerald { width: 380px; height: 380px; }
          .welcome-blob-cyan { width: 340px; height: 340px; }
          .welcome-blob-violet { width: 320px; height: 320px; }
        }
      `}</style>

      {/* Background mesh G3 (3 blobs flous emerald/cyan/violet) */}
      <div aria-hidden="true" className="welcome-blob welcome-blob-emerald" />
      <div aria-hidden="true" className="welcome-blob welcome-blob-cyan" />
      <div aria-hidden="true" className="welcome-blob welcome-blob-violet" />
      {/* Grain noise SVG inline */}
      <div aria-hidden="true" className="welcome-grain" />

      {/* Contenu */}
      <div className="welcome-inner">
        {/* Logo orbe + heritage badge */}
        <div className="welcome-logo-wrap">
          <div className="welcome-logo-ring" aria-hidden="true">
            <img
              src="/brand/labase360/app-icon-512.svg"
              alt="La Base 360"
              className="welcome-logo"
            />
          </div>
          <span className="welcome-heritage">★ Since 2022 ★</span>
        </div>

        {/* Hero : titre + accroche */}
        <div className="welcome-hero">
          <h1 className="welcome-title">
            <span className="welcome-title-greeting">Bienvenue sur</span>
            <span className="welcome-title-brand">La Base </span>
            <span className="welcome-title-360">360</span>
          </h1>
          <p className="welcome-tagline">Ta transformation commence ici.</p>
          <p className="welcome-tagline-en">The wellness nutrition club</p>
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
            subtitle="Découvrir le business La Base 360"
            // Page d'accueil publique → tunnel recrutement /rejoindre avec
            // attribution au coach par défaut (Thomas, owner). Le ?ref est
            // préservé jusqu'au questionnaire (cf. RejoindreOpportunitePage).
            onClick={() => navigate("/rejoindre?ref=656dcf35-4859-4a70-9d20-990104813423")}
            delayMs={1000}
            accent="magenta"
          />
        </div>

        {/* Footer */}
        <div className="welcome-footer">
          Propulsé par <span className="welcome-footer-brand">La Base 360</span> · Verdun · France
        </div>
      </div>

      <ClientModal open={clientOpen} onClose={() => setClientOpen(false)} />
      <ProspectFormModal open={prospectOpen} onClose={() => setProspectOpen(false)} />
    </div>
  );
}
