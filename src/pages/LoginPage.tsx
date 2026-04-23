// Chantier Login Premium Redesign (2026-04-24).
// Refonte alignée sur WelcomePage : mesh gradient animé + grain noise +
// logo glow pulsant + titre gold gradient + card formulaire glassmorphism
// + bouton gold premium avec hover soigné + micro-animations stagger.
//
// Conserve toute la logique existante (loginWithCredentials, redirect
// selon kind coach/client, install PWA, lien retour).

import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { useInstallPrompt } from "../context/InstallPromptContext";

export function LoginPage() {
  const { authReady, loginWithCredentials } = useAppContext();
  const { canPromptInstall, isIos, isMobile, isStandalone, promptInstall } = useInstallPrompt();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authReady || submitting) return;

    setSubmitting(true);
    try {
      const result = await loginWithCredentials({
        email: email.trim().toLowerCase(),
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

  return (
    <div className="login-root">
      <style>{`
        /* ─── Base layout ───────────────────────────────────────────── */
        .login-root {
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
        :root[data-theme="dark"] .login-root,
        html.dark .login-root {
          background: #0A0D0F;
          color: #F0EDE8;
        }

        /* ─── Mesh gradient animé (cohérence avec Welcome) ────────────── */
        .login-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          opacity: 0.55;
          pointer-events: none;
          will-change: transform;
        }
        .login-blob-teal {
          top: -15%;
          left: -10%;
          width: 540px;
          height: 540px;
          background: radial-gradient(circle, #1D9E75 0%, transparent 70%);
          animation: login-float-1 32s ease-in-out infinite alternate;
        }
        .login-blob-gold {
          bottom: -18%;
          right: -8%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, #EF9F27 0%, transparent 70%);
          animation: login-float-2 38s ease-in-out infinite alternate;
          opacity: 0.48;
        }
        :root[data-theme="dark"] .login-blob-teal,
        html.dark .login-blob-teal { opacity: 0.35; }
        :root[data-theme="dark"] .login-blob-gold,
        html.dark .login-blob-gold { opacity: 0.26; }

        @keyframes login-float-1 {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(70px, 50px) scale(1.12); }
        }
        @keyframes login-float-2 {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(-80px, -40px) scale(1.1); }
        }

        /* ─── Grain noise ────────────────────────────────────────────── */
        .login-grain {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.035;
          mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
        }
        :root[data-theme="dark"] .login-grain,
        html.dark .login-grain { opacity: 0.06; }

        /* ─── Bouton retour minimal ──────────────────────────────────── */
        .login-back-home {
          position: fixed;
          top: 20px;
          left: 20px;
          z-index: 20;
          padding: 6px 10px;
          border-radius: 8px;
          background: transparent;
          border: none;
          color: rgba(11, 13, 17, 0.58);
          text-decoration: none;
          font-size: 13px;
          font-family: 'DM Sans', sans-serif;
          font-weight: 500;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: color 0.15s ease, transform 0.15s ease;
          animation: login-in 0.5s ease-out 0.1s both;
        }
        :root[data-theme="dark"] .login-back-home,
        html.dark .login-back-home { color: rgba(240, 237, 232, 0.45); }
        .login-back-home:hover {
          color: #EF9F27;
          transform: translateX(-3px);
        }
        .login-back-home::before {
          content: "←";
          font-size: 16px;
          line-height: 1;
        }

        /* ─── Contenu central ─────────────────────────────────────────── */
        .login-inner {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 460px;
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        /* ─── Logo glow pulsant ───────────────────────────────────────── */
        .login-logo-wrap {
          display: flex;
          justify-content: center;
          animation: login-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .login-logo {
          width: 76px;
          height: 76px;
          border-radius: 20px;
          background: linear-gradient(135deg, #EF9F27 0%, #BA7517 100%);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 40px rgba(239, 159, 39, 0.3), 0 8px 24px rgba(186, 117, 23, 0.2);
          animation: login-logo-pulse 3s ease-in-out infinite alternate;
        }
        @keyframes login-logo-pulse {
          0%   { box-shadow: 0 0 28px rgba(239,159,39,0.2),  0 8px 24px rgba(186,117,23,0.2); }
          100% { box-shadow: 0 0 54px rgba(239,159,39,0.45), 0 8px 28px rgba(186,117,23,0.25); }
        }

        /* ─── Hero ────────────────────────────────────────────────────── */
        .login-hero { text-align: center; animation: login-in 0.9s cubic-bezier(0.16,1,0.3,1) 0.2s both; }
        .login-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(24px, 4vw, 32px);
          font-weight: 700;
          line-height: 1.18;
          letter-spacing: -0.02em;
          margin: 0 0 8px;
        }
        .login-title-greeting {
          color: #0B0D11;
          font-weight: 600;
        }
        :root[data-theme="dark"] .login-title-greeting,
        html.dark .login-title-greeting { color: #F0EDE8; }
        .login-title-brand {
          background: linear-gradient(135deg, #EF9F27 0%, #BA7517 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          font-weight: 800;
        }
        :root[data-theme="dark"] .login-title-brand,
        html.dark .login-title-brand {
          background: linear-gradient(135deg, #F5B847 0%, #EF9F27 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .login-tagline {
          font-size: 15px;
          color: rgba(11, 13, 17, 0.6);
          margin: 0;
          line-height: 1.5;
          animation: login-in 0.9s cubic-bezier(0.16,1,0.3,1) 0.3s both;
        }
        :root[data-theme="dark"] .login-tagline,
        html.dark .login-tagline { color: rgba(240, 237, 232, 0.6); }

        /* ─── Form card (glassmorphism) ────────────────────────────────── */
        .login-card {
          background: rgba(255, 255, 255, 0.78);
          backdrop-filter: blur(14px) saturate(140%);
          -webkit-backdrop-filter: blur(14px) saturate(140%);
          border: 1px solid rgba(239, 159, 39, 0.15);
          border-radius: 20px;
          padding: 26px 24px;
          box-shadow: 0 1px 2px rgba(11,13,17,0.04), 0 8px 24px rgba(11,13,17,0.04);
          animation: login-in 0.9s cubic-bezier(0.16,1,0.3,1) 0.4s both;
        }
        :root[data-theme="dark"] .login-card,
        html.dark .login-card {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 4px 24px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.15);
        }

        /* ─── Form fields ─────────────────────────────────────────────── */
        .login-field { display: flex; flex-direction: column; gap: 6px; }
        .login-label {
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 700;
          color: rgba(11, 13, 17, 0.52);
        }
        :root[data-theme="dark"] .login-label,
        html.dark .login-label { color: rgba(240, 237, 232, 0.5); }

        .login-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .login-input-icon {
          position: absolute;
          left: 14px;
          pointer-events: none;
          color: rgba(11, 13, 17, 0.38);
        }
        :root[data-theme="dark"] .login-input-icon,
        html.dark .login-input-icon { color: rgba(240, 237, 232, 0.36); }

        .login-input {
          width: 100%;
          box-sizing: border-box;
          background: rgba(255, 255, 255, 0.6);
          border: 1px solid rgba(11, 13, 17, 0.08);
          border-radius: 12px;
          padding: 13px 14px 13px 42px;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          color: #0B0D11;
          outline: none;
          transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
        }
        :root[data-theme="dark"] .login-input,
        html.dark .login-input {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #F0EDE8;
        }
        .login-input:focus {
          border-color: rgba(239, 159, 39, 0.6);
          box-shadow: 0 0 0 4px rgba(239, 159, 39, 0.12);
          background: rgba(255, 255, 255, 0.85);
        }
        :root[data-theme="dark"] .login-input:focus,
        html.dark .login-input:focus {
          background: rgba(255, 255, 255, 0.06);
        }
        .login-input::placeholder { color: rgba(11,13,17,0.35); }
        :root[data-theme="dark"] .login-input::placeholder,
        html.dark .login-input::placeholder { color: rgba(240,237,232,0.32); }

        .login-password-toggle {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 11px;
          color: rgba(11, 13, 17, 0.55);
          font-family: 'DM Sans', sans-serif;
          padding: 0;
          margin-top: 2px;
          text-align: left;
          transition: color 0.15s;
          align-self: flex-start;
        }
        :root[data-theme="dark"] .login-password-toggle,
        html.dark .login-password-toggle { color: rgba(240, 237, 232, 0.5); }
        .login-password-toggle:hover { color: #EF9F27; }

        /* ─── Error ─────────────────────────────────────────────────── */
        .login-error {
          background: #FCEBEB;
          border: 1px solid #E24B4A;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 12.5px;
          color: #501313;
          line-height: 1.5;
        }

        /* ─── Submit button ─────────────────────────────────────────── */
        .login-submit {
          width: 100%;
          background: linear-gradient(135deg, #EF9F27 0%, #BA7517 100%);
          color: #FFFFFF;
          border: none;
          border-radius: 12px;
          padding: 14px 16px;
          font-family: 'Syne', sans-serif;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.02em;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 14px rgba(186, 117, 23, 0.28);
          transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
        }
        .login-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(186, 117, 23, 0.38);
          filter: brightness(1.05);
        }
        .login-submit:active:not(:disabled) {
          transform: translateY(0);
        }
        .login-submit:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        /* ─── Secondary info ────────────────────────────────────────── */
        .login-secondary {
          text-align: center;
          font-size: 12.5px;
          color: rgba(11, 13, 17, 0.55);
          line-height: 1.6;
          animation: login-in 0.8s cubic-bezier(0.16,1,0.3,1) 0.6s both;
        }
        :root[data-theme="dark"] .login-secondary,
        html.dark .login-secondary { color: rgba(240, 237, 232, 0.5); }
        .login-secondary a { color: #BA7517; text-decoration: none; font-weight: 600; }
        :root[data-theme="dark"] .login-secondary a,
        html.dark .login-secondary a { color: #F5B847; }
        .login-secondary a:hover { text-decoration: underline; }

        .login-pwa-card {
          background: rgba(239, 159, 39, 0.08);
          border: 1px solid rgba(239, 159, 39, 0.25);
          border-radius: 14px;
          padding: 14px 16px;
          font-family: 'DM Sans', sans-serif;
          animation: login-in 0.8s cubic-bezier(0.16,1,0.3,1) 0.7s both;
        }
        .login-pwa-head {
          font-size: 11px;
          color: #BA7517;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 700;
          margin-bottom: 6px;
        }
        :root[data-theme="dark"] .login-pwa-head,
        html.dark .login-pwa-head { color: #F5B847; }
        .login-pwa-body {
          font-size: 13px;
          color: rgba(11, 13, 17, 0.72);
          line-height: 1.5;
        }
        :root[data-theme="dark"] .login-pwa-body,
        html.dark .login-pwa-body { color: rgba(240, 237, 232, 0.7); }
        .login-pwa-btn {
          margin-top: 10px;
          background: #FFFFFF;
          border: 1px solid rgba(11, 13, 17, 0.1);
          color: #BA7517;
          padding: 8px 14px;
          border-radius: 10px;
          font-size: 12.5px;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        :root[data-theme="dark"] .login-pwa-btn,
        html.dark .login-pwa-btn {
          background: rgba(255, 255, 255, 0.08);
          color: #F5B847;
          border-color: rgba(255,255,255,0.1);
        }
        .login-pwa-btn:hover {
          background: #EF9F27;
          color: #FFFFFF;
          border-color: #EF9F27;
        }

        /* ─── Trust footer ─────────────────────────────────────────── */
        .login-trust {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 11px;
          color: rgba(11, 13, 17, 0.42);
          animation: login-in 0.8s cubic-bezier(0.16,1,0.3,1) 0.8s both;
        }
        :root[data-theme="dark"] .login-trust,
        html.dark .login-trust { color: rgba(240, 237, 232, 0.35); }

        /* ─── Animation fade + slide up ─────────────────────────────── */
        @keyframes login-in {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ─── Reduced motion ────────────────────────────────────────── */
        @media (prefers-reduced-motion: reduce) {
          .login-back-home,
          .login-logo-wrap,
          .login-hero,
          .login-tagline,
          .login-card,
          .login-secondary,
          .login-pwa-card,
          .login-trust { animation: none !important; }
          .login-blob-teal,
          .login-blob-gold,
          .login-logo { animation: none !important; }
          .login-submit:hover { transform: none !important; }
        }

        /* ─── Mobile ─────────────────────────────────────────────── */
        @media (max-width: 480px) {
          .login-root { padding: 24px 18px; }
          .login-inner { gap: 20px; }
          .login-logo { width: 64px; height: 64px; border-radius: 16px; }
          .login-logo svg { width: 26px; height: 26px; }
          .login-blob-teal { width: 360px; height: 360px; }
          .login-blob-gold { width: 340px; height: 340px; }
          .login-card { padding: 22px 18px; }
          .login-back-home { top: 14px; left: 14px; }
        }
      `}</style>

      {/* Bouton retour minimal */}
      <a href="/welcome" className="login-back-home">Retour à l&apos;accueil</a>

      {/* Mesh gradient background */}
      <div aria-hidden="true" className="login-blob login-blob-teal" />
      <div aria-hidden="true" className="login-blob login-blob-gold" />
      <div aria-hidden="true" className="login-grain" />

      <div className="login-inner">
        {/* Logo glow */}
        <div className="login-logo-wrap">
          <div className="login-logo" aria-hidden="true">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="#0B0D11">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
        </div>

        {/* Hero */}
        <div className="login-hero">
          <h1 className="login-title">
            <span className="login-title-greeting">Bon retour sur</span>
            <br />
            <span className="login-title-brand">Lor&apos;Squad Wellness</span>
          </h1>
          <p className="login-tagline">Ton cockpit bien-être t&apos;attend.</p>
        </div>

        {/* Form card */}
        <form onSubmit={handleSubmit} className="login-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="login-field">
            <label className="login-label" htmlFor="login-email">Email</label>
            <div className="login-input-wrap">
              <svg className="login-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <input
                id="login-email"
                type="email"
                className="login-input"
                placeholder="ton.email@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
                inputMode="email"
                spellCheck={false}
                required
              />
            </div>
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="login-password">Mot de passe</label>
            <div className="login-input-wrap">
              <svg className="login-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                className="login-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
              />
            </div>
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="login-password-toggle"
            >
              {showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            </button>
          </div>

          {error ? <div className="login-error">{error}</div> : null}

          <button
            type="submit"
            className="login-submit"
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

        {/* Info secondaire */}
        <div className="login-secondary">
          Pas encore d&apos;accès ? <a href="/welcome">Retour à l&apos;accueil</a> pour choisir ton profil.
        </div>

        {/* PWA install (discret) */}
        {!isStandalone ? (
          <div className="login-pwa-card">
            <div className="login-pwa-head">📱 Installer l&apos;app</div>
            <div className="login-pwa-body">
              Ajoute Lor&apos;Squad à ton écran d&apos;accueil pour un accès rapide.
              {canPromptInstall ? (
                <div style={{ marginTop: 8 }}>
                  <button type="button" onClick={() => void handleInstallClick()} className="login-pwa-btn">
                    Installer maintenant
                  </button>
                </div>
              ) : isIos ? (
                <div style={{ marginTop: 6, fontSize: 12 }}>
                  Safari → <strong>Partager</strong> → <strong>Sur l&apos;écran d&apos;accueil</strong>
                </div>
              ) : isMobile ? (
                <div style={{ marginTop: 6, fontSize: 12 }}>
                  Chrome → <strong>Installer l&apos;app</strong>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Trust badge */}
        <div className="login-trust">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Connexion sécurisée · données chiffrées
        </div>
      </div>
    </div>
  );
}
