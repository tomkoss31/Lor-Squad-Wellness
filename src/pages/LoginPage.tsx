// LoginPage V3 — Split-screen premium + floating labels + greeting perso.
// Refonte 2026-04-30 (challenger Thomas) :
//
//  - Layout split desktop (visuel gauche / form droite, ratio 45/55).
//    Sur mobile : visuel devient bandeau header 26vh, form en dessous.
//  - Visuel gauche : mesh gold + teal animes, chip social proof flottant,
//    logo glow pulsant, tagline en Syne.
//  - Form droite : floating labels (style Stripe/Linear), pas d icone
//    dans le champ -> regle definitivement le bug d overlap placeholder.
//  - Greeting personnalise : si l email a deja servi sur ce device
//    (localStorage 'ls_last_login_email'), affiche "Bon retour 👋" +
//    masked hint "th***s@gmail.com" et pre-remplit l email.
//  - Action secondaire : "Recois un lien magique" -> route vers
//    /forgot-password (UX framing, l action s appelle "magic link" et
//    pas "reset password" pour parler au distri).
//  - Convention theme : default = DARK, html.theme-light = LIGHT.
//  - Conserve toute la logique : loginWithCredentials, redirect selon
//    kind coach/client, install PWA prompt en footer discret.

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { useInstallPrompt } from "../context/InstallPromptContext";

const LAST_EMAIL_KEY = "ls_last_login_email";

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local[0]}${"*".repeat(Math.min(local.length - 2, 4))}${local.slice(-1)}@${domain}`;
}

export function LoginPage() {
  const { authReady, loginWithCredentials } = useAppContext();
  const { canPromptInstall, isIos, isMobile, isStandalone, promptInstall } = useInstallPrompt();
  const navigate = useNavigate();

  // Restore last email (returning user UX)
  const initialLastEmail = useMemo(() => {
    if (typeof window === "undefined") return "";
    try { return window.localStorage.getItem(LAST_EMAIL_KEY) ?? ""; }
    catch { return ""; }
  }, []);

  const [email, setEmail] = useState(initialLastEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isReturning = Boolean(initialLastEmail);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authReady || submitting) return;

    setSubmitting(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const result = await loginWithCredentials({
        email: cleanEmail,
        password: password.trim(),
      });
      if (!result.ok) {
        const raw = result.error ?? "";
        const friendly =
          /invalid login credentials/i.test(raw) || /invalid_credentials/i.test(raw)
            ? "Email ou mot de passe incorrect."
            : raw;
        setError(friendly || "Email ou mot de passe incorrect.");
        return;
      }
      // Store last email pour greeting perso au prochain login
      try { window.localStorage.setItem(LAST_EMAIL_KEY, cleanEmail); }
      catch { /* quota / private mode */ }
      setError("");
      navigate(result.redirectTo);
    } catch (submitError) {
      console.error("Soumission du login impossible.", submitError);
      setError("La connexion sécurisée ne répond pas correctement pour le moment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleInstallClick() {
    await promptInstall();
  }

  // Reset l indicateur "returning" si l user efface l email manuellement
  useEffect(() => {
    if (isReturning && email && email !== initialLastEmail) {
      // user is editing — c est ok, on garde le greeting tant qu il y a un email
    }
  }, [email, initialLastEmail, isReturning]);

  return (
    <div className="lp-root">
      <style>{`
        /* ─── Base / theme convention ───────────────────────────── */
        .lp-root {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          font-family: 'DM Sans', sans-serif;
          background: #0A0D0F;
          color: #F0EDE8;
          overflow: hidden;
          position: relative;
        }
        html.theme-light .lp-root {
          background: #F7F5F0;
          color: #0B0D11;
        }

        /* ─── Layout split ─────────────────────────────────────── */
        .lp-visual {
          flex: 0 0 45%;
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #0A0D0F 0%, #131A1E 50%, #0A0D0F 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 36px;
        }
        html.theme-light .lp-visual {
          background: linear-gradient(135deg, #F0E9DA 0%, #F7F0E0 50%, #EDE3CC 100%);
        }
        .lp-form-side {
          flex: 1 1 55%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 36px;
          position: relative;
          z-index: 2;
        }

        /* ─── Visuel gauche : mesh blobs + grain ───────────────── */
        .lp-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          will-change: transform;
        }
        .lp-blob-gold {
          top: -10%; left: -8%;
          width: 380px; height: 380px;
          background: radial-gradient(circle, #EF9F27 0%, transparent 70%);
          opacity: 0.45;
          animation: lp-float-1 32s ease-in-out infinite alternate;
        }
        .lp-blob-teal {
          bottom: -12%; right: -10%;
          width: 360px; height: 360px;
          background: radial-gradient(circle, #1D9E75 0%, transparent 70%);
          opacity: 0.4;
          animation: lp-float-2 38s ease-in-out infinite alternate;
        }
        html.theme-light .lp-blob-gold { opacity: 0.6; }
        html.theme-light .lp-blob-teal { opacity: 0.55; }
        @keyframes lp-float-1 {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(50px, 40px) scale(1.15); }
        }
        @keyframes lp-float-2 {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(-60px, -30px) scale(1.12); }
        }
        .lp-grain {
          position: absolute; inset: 0; pointer-events: none;
          opacity: 0.07; mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
        }
        html.theme-light .lp-grain { opacity: 0.04; }

        /* ─── Visuel center : logo + tagline + social proof ───── */
        .lp-visual-inner {
          position: relative;
          z-index: 2;
          text-align: center;
          max-width: 360px;
          animation: lp-in 0.9s cubic-bezier(0.16,1,0.3,1) both;
        }
        .lp-logo {
          width: 84px; height: 84px;
          border-radius: 22px;
          background: linear-gradient(135deg, #EF9F27 0%, #BA7517 100%);
          display: inline-flex; align-items: center; justify-content: center;
          box-shadow: 0 0 60px rgba(239,159,39,0.4), 0 12px 32px rgba(186,117,23,0.3);
          margin-bottom: 28px;
          animation: lp-logo-pulse 3s ease-in-out infinite alternate;
        }
        @keyframes lp-logo-pulse {
          0%   { box-shadow: 0 0 36px rgba(239,159,39,0.25), 0 12px 32px rgba(186,117,23,0.25); transform: scale(1); }
          100% { box-shadow: 0 0 70px rgba(239,159,39,0.5), 0 14px 38px rgba(186,117,23,0.32); transform: scale(1.04); }
        }
        .lp-tagline {
          font-family: 'Syne', sans-serif;
          font-size: 26px;
          font-weight: 700;
          line-height: 1.18;
          letter-spacing: -0.02em;
          margin: 0 0 14px;
        }
        .lp-tagline-accent {
          background: linear-gradient(135deg, #F5B847 0%, #EF9F27 100%);
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; color: transparent;
        }
        .lp-tagline-sub {
          font-size: 14px;
          color: rgba(240,237,232,0.65);
          line-height: 1.55;
          margin: 0 0 28px;
        }
        html.theme-light .lp-tagline-sub { color: rgba(11,13,17,0.62); }

        /* ─── Social proof chip flottant ─────────────────────── */
        .lp-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(239,159,39,0.25);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          font-size: 12px;
          font-weight: 500;
          color: rgba(240,237,232,0.85);
          font-family: 'DM Sans', sans-serif;
          animation: lp-in 1s cubic-bezier(0.16,1,0.3,1) 0.3s both;
        }
        html.theme-light .lp-chip {
          background: rgba(255,255,255,0.7);
          border: 1px solid rgba(186,117,23,0.3);
          color: rgba(11,13,17,0.78);
        }
        .lp-chip-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #1D9E75;
          box-shadow: 0 0 8px #1D9E75;
          animation: lp-dot-pulse 2s ease-in-out infinite;
        }
        @keyframes lp-dot-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.6; transform: scale(0.85); }
        }

        /* ─── Form right ──────────────────────────────────────── */
        .lp-form-inner {
          width: 100%;
          max-width: 400px;
          display: flex;
          flex-direction: column;
          gap: 22px;
          animation: lp-in 0.9s cubic-bezier(0.16,1,0.3,1) 0.15s both;
        }
        .lp-greeting {
          font-family: 'Syne', sans-serif;
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.02em;
          line-height: 1.18;
          margin: 0 0 6px;
        }
        .lp-greeting-hint {
          font-size: 13.5px;
          color: rgba(240,237,232,0.55);
          line-height: 1.5;
          margin: 0;
        }
        html.theme-light .lp-greeting-hint { color: rgba(11,13,17,0.55); }
        .lp-greeting-mask {
          font-family: 'DM Mono', 'Courier New', monospace;
          color: rgba(239,159,39,0.95);
          font-weight: 600;
        }

        /* ─── Floating label inputs (Stripe-style) ─────────────── */
        .lp-field {
          position: relative;
          display: flex;
          flex-direction: column;
        }
        .lp-input {
          width: 100%;
          box-sizing: border-box;
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 22px 16px 8px;
          font-size: 15px;
          font-family: 'DM Sans', sans-serif;
          color: #F0EDE8;
          outline: none;
          transition: border-color 0.18s, background 0.18s, box-shadow 0.18s;
          -webkit-text-fill-color: #F0EDE8; /* fix iOS autofill */
        }
        html.theme-light .lp-input {
          background: rgba(255,255,255,0.85);
          border: 1.5px solid rgba(11,13,17,0.1);
          color: #0B0D11;
          -webkit-text-fill-color: #0B0D11;
        }
        .lp-input:focus {
          border-color: rgba(239,159,39,0.7);
          background: rgba(255,255,255,0.06);
          box-shadow: 0 0 0 4px rgba(239,159,39,0.12);
        }
        html.theme-light .lp-input:focus {
          background: #FFFFFF;
        }
        .lp-input::placeholder { color: transparent; }
        .lp-label {
          position: absolute;
          top: 16px; left: 16px;
          font-size: 14px;
          font-weight: 500;
          color: rgba(240,237,232,0.5);
          pointer-events: none;
          transition: top 0.15s ease, font-size 0.15s ease, color 0.15s ease;
          font-family: 'DM Sans', sans-serif;
          background: transparent;
          padding: 0;
        }
        html.theme-light .lp-label { color: rgba(11,13,17,0.5); }
        .lp-input:focus + .lp-label,
        .lp-input:not(:placeholder-shown) + .lp-label {
          top: 6px;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(239,159,39,0.95);
        }

        /* Bouton afficher mdp en absolu dans l input password */
        .lp-pw-eye {
          position: absolute;
          right: 12px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          cursor: pointer;
          padding: 6px;
          color: rgba(240,237,232,0.55);
          font-size: 16px;
          line-height: 1;
          border-radius: 8px;
          transition: color 0.15s, background 0.15s;
        }
        html.theme-light .lp-pw-eye { color: rgba(11,13,17,0.55); }
        .lp-pw-eye:hover {
          color: #EF9F27;
          background: rgba(239,159,39,0.1);
        }

        /* ─── Error ─────────────────────────────────────────── */
        .lp-error {
          background: rgba(226,75,74,0.12);
          border: 1px solid rgba(226,75,74,0.5);
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 13px;
          color: #FCA5A5;
          line-height: 1.5;
          animation: lp-shake 0.3s ease-out;
        }
        html.theme-light .lp-error {
          background: #FCEBEB;
          border: 1px solid #E24B4A;
          color: #501313;
        }
        @keyframes lp-shake {
          0%, 100% { transform: translateX(0); }
          25%      { transform: translateX(-4px); }
          75%      { transform: translateX(4px); }
        }

        /* ─── Submit + secondary ─────────────────────────────── */
        .lp-submit {
          width: 100%;
          background: linear-gradient(135deg, #EF9F27 0%, #BA7517 100%);
          color: #FFFFFF;
          border: none;
          border-radius: 12px;
          padding: 15px 16px;
          font-family: 'Syne', sans-serif;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.01em;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 6px 18px rgba(186,117,23,0.32), inset 0 1px 0 rgba(255,255,255,0.18);
          transition: transform 0.18s, box-shadow 0.18s, filter 0.18s;
        }
        .lp-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(186,117,23,0.42), inset 0 1px 0 rgba(255,255,255,0.22);
          filter: brightness(1.06);
        }
        .lp-submit:disabled { opacity: 0.55; cursor: not-allowed; }

        .lp-secondary-row {
          display: flex; flex-direction: column; gap: 10px;
        }
        .lp-magic-btn {
          width: 100%;
          background: rgba(29,158,117,0.1);
          color: #2DD4BF;
          border: 1.5px solid rgba(29,158,117,0.35);
          border-radius: 12px;
          padding: 12px 16px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: background 0.15s, border-color 0.15s, transform 0.15s;
        }
        html.theme-light .lp-magic-btn {
          background: rgba(13,148,136,0.08);
          color: #0D9488;
          border-color: rgba(13,148,136,0.3);
        }
        .lp-magic-btn:hover {
          background: rgba(29,158,117,0.18);
          border-color: rgba(29,158,117,0.6);
          transform: translateY(-1px);
        }

        .lp-divider-row {
          display: flex; align-items: center; gap: 10px;
          font-size: 11px;
          color: rgba(240,237,232,0.35);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 600;
        }
        html.theme-light .lp-divider-row { color: rgba(11,13,17,0.35); }
        .lp-divider-row::before, .lp-divider-row::after {
          content: ""; flex: 1; height: 1px;
          background: rgba(240,237,232,0.1);
        }
        html.theme-light .lp-divider-row::before,
        html.theme-light .lp-divider-row::after {
          background: rgba(11,13,17,0.1);
        }

        /* ─── PWA install + footer trust ──────────────────────── */
        .lp-pwa-card {
          background: rgba(239,159,39,0.08);
          border: 1px solid rgba(239,159,39,0.2);
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 12.5px;
          line-height: 1.5;
          color: rgba(240,237,232,0.78);
        }
        html.theme-light .lp-pwa-card { color: rgba(11,13,17,0.72); }
        .lp-pwa-head {
          font-size: 10.5px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 700;
          color: #F5B847;
          margin-bottom: 4px;
        }
        html.theme-light .lp-pwa-head { color: #BA7517; }
        .lp-pwa-btn {
          margin-top: 8px;
          background: rgba(239,159,39,0.18);
          border: 1px solid rgba(239,159,39,0.4);
          color: #F5B847;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        html.theme-light .lp-pwa-btn { color: #BA7517; }
        .lp-pwa-btn:hover {
          background: rgba(239,159,39,0.3);
          border-color: rgba(239,159,39,0.6);
        }

        .lp-trust {
          margin-top: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 11px;
          color: rgba(240,237,232,0.4);
        }
        html.theme-light .lp-trust { color: rgba(11,13,17,0.45); }

        /* ─── Bouton retour minimal ──────────────────────────── */
        .lp-back {
          position: fixed;
          top: 18px; left: 18px;
          z-index: 20;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.06);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(240,237,232,0.65);
          font-size: 12px;
          font-weight: 500;
          font-family: 'DM Sans', sans-serif;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: all 0.15s;
        }
        html.theme-light .lp-back {
          background: rgba(255,255,255,0.7);
          border-color: rgba(11,13,17,0.1);
          color: rgba(11,13,17,0.65);
        }
        .lp-back:hover {
          color: #EF9F27;
          border-color: rgba(239,159,39,0.4);
          transform: translateX(-2px);
        }

        /* ─── Animations ─────────────────────────────────────── */
        @keyframes lp-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .lp-blob-gold, .lp-blob-teal, .lp-logo, .lp-chip-dot,
          .lp-visual-inner, .lp-form-inner { animation: none !important; }
          .lp-error { animation: none !important; }
        }

        /* ─── Mobile : visuel devient bandeau header ────────── */
        @media (max-width: 880px) {
          .lp-root { flex-direction: column; }
          .lp-visual {
            flex: 0 0 auto;
            min-height: 28vh;
            padding: 32px 24px 24px;
          }
          .lp-form-side {
            flex: 1;
            padding: 28px 24px 32px;
          }
          .lp-logo { width: 64px; height: 64px; border-radius: 18px; margin-bottom: 18px; }
          .lp-tagline { font-size: 22px; }
          .lp-tagline-sub { font-size: 13px; margin-bottom: 18px; }
          .lp-greeting { font-size: 24px; }
          .lp-back { top: 12px; left: 12px; }
        }
        @media (max-width: 480px) {
          .lp-visual { min-height: 24vh; padding: 28px 20px 18px; }
          .lp-form-side { padding: 24px 20px 28px; }
          .lp-tagline { font-size: 20px; }
          .lp-blob-gold, .lp-blob-teal { width: 280px; height: 280px; }
        }
      `}</style>

      {/* Bouton retour minimal global */}
      <a href="/welcome" className="lp-back" aria-label="Retour à l'accueil">
        ← Accueil
      </a>

      {/* ─── Visuel gauche ──────────────────────────────── */}
      <div className="lp-visual" aria-hidden="true">
        <div className="lp-blob lp-blob-gold" />
        <div className="lp-blob lp-blob-teal" />
        <div className="lp-grain" />
        <div className="lp-visual-inner">
          <div className="lp-logo">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="#0B0D11">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <h2 className="lp-tagline">
            Ton cockpit{" "}
            <span className="lp-tagline-accent">bien-être</span>{" "}
            t'attend.
          </h2>
          <p className="lp-tagline-sub">
            Une plateforme pensée pour les coachs qui veulent transformer leur
            club en machine de précision.
          </p>
          <div className="lp-chip">
            <span className="lp-chip-dot" />
            Plateforme de coachs Herbalife · données chiffrées
          </div>
        </div>
      </div>

      {/* ─── Form droite ────────────────────────────────── */}
      <div className="lp-form-side">
        <div className="lp-form-inner">
          {/* Greeting perso si returning */}
          {isReturning ? (
            <div>
              <h1 className="lp-greeting">Bon retour 👋</h1>
              <p className="lp-greeting-hint">
                Tu t'étais connecté avec{" "}
                <span className="lp-greeting-mask">{maskEmail(initialLastEmail)}</span>
              </p>
            </div>
          ) : (
            <div>
              <h1 className="lp-greeting">
                Connexion à <span className="lp-tagline-accent">Lor'Squad</span>
              </h1>
              <p className="lp-greeting-hint">
                Identifie-toi avec ton email + mot de passe.
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="lp-field">
              <input
                id="lp-email"
                type="email"
                className="lp-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" "
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
                inputMode="email"
                spellCheck={false}
                required
              />
              <label htmlFor="lp-email" className="lp-label">Adresse email</label>
            </div>

            <div className="lp-field">
              <input
                id="lp-password"
                type={showPassword ? "text" : "password"}
                className="lp-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                style={{ paddingRight: 44 }}
              />
              <label htmlFor="lp-password" className="lp-label">Mot de passe</label>
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="lp-pw-eye"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>

            {error ? <div className="lp-error">{error}</div> : null}

            <button
              type="submit"
              className="lp-submit"
              disabled={!authReady || submitting}
            >
              {submitting ? "Connexion…" : "Ouvrir mon espace"}
              {!submitting ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              ) : null}
            </button>
          </form>

          {/* Divider + actions secondaires */}
          <div className="lp-secondary-row">
            <div className="lp-divider-row">ou</div>
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="lp-magic-btn"
            >
              ✨ Recevoir un lien magique par email
            </button>
          </div>

          {/* PWA install (discret) */}
          {!isStandalone ? (
            <div className="lp-pwa-card">
              <div className="lp-pwa-head">📱 Installer l'app</div>
              <div>
                Ajoute Lor'Squad à ton écran d'accueil — ouverture en 1 clic, hors connexion.
                {canPromptInstall ? (
                  <div>
                    <button type="button" onClick={() => void handleInstallClick()} className="lp-pwa-btn">
                      Installer maintenant
                    </button>
                  </div>
                ) : isIos ? (
                  <div style={{ marginTop: 4, fontSize: 12 }}>
                    Safari → <strong>Partager</strong> → <strong>Sur l'écran d'accueil</strong>
                  </div>
                ) : isMobile ? (
                  <div style={{ marginTop: 4, fontSize: 12 }}>
                    Chrome → menu <strong>⋮</strong> → <strong>Installer l'app</strong>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Trust footer */}
          <div className="lp-trust">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Connexion sécurisée · données chiffrées
          </div>
        </div>
      </div>
    </div>
  );
}
