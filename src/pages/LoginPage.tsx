// LoginPage V5 — refonte identité v2 « premium performance » (2026-07).
//
// Passe de l'ancienne charte « Vital Fusion » (claire, emerald/cyan/violet,
// Sora/Inter) à l'identité v2 sombre : fond #0a0c0a, accent lime #c5f82a,
// titres Anton, labels JetBrains Mono, corps DM Sans — cohérent avec
// /bienvenue-distri et la Salle des Opérations.
//
// Sobriété demandée par Thomas : compteur « X coachs en ligne » simulé,
// greeting selon l'heure et emojis retirés. On garde toute la logique auth :
// loginWithCredentials, redirect selon rôle, reconnaissance « returning user ».
//
// Convention thème : cette page est volontairement TOUJOURS sombre (écran
// d'entrée signature), palette locale --dw-* (comme BienvenueDistriPage).

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

const LAST_EMAIL_KEY = "ls_last_login_email";
const LAST_FIRSTNAME_KEY = "ls_last_login_firstname";
const LAST_AVATAR_KEY = "ls_last_login_avatar";

export function LoginPage() {
  const { authReady, currentUser, loginWithCredentials } = useAppContext();
  const navigate = useNavigate();

  // Restore last identity (returning user UX)
  const [initialLastEmail, initialLastFirstName] = useMemo(() => {
    if (typeof window === "undefined") return ["", null] as const;
    try {
      return [
        window.localStorage.getItem(LAST_EMAIL_KEY) ?? "",
        window.localStorage.getItem(LAST_FIRSTNAME_KEY),
      ] as const;
    } catch {
      return ["", null] as const;
    }
  }, []);

  const [email, setEmail] = useState(initialLastEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isReturning = Boolean(initialLastEmail);
  const knownFirstName = initialLastFirstName;

  // Capture currentUser dans localStorage dès qu'il est dispo (après login OU
  // si user déjà loggué revient sur /login).
  useEffect(() => {
    if (!currentUser) return;
    try {
      if (currentUser.email) {
        window.localStorage.setItem(LAST_EMAIL_KEY, currentUser.email);
      }
      const firstName = (currentUser.name ?? "").trim().split(/\s+/)[0];
      if (firstName) {
        window.localStorage.setItem(LAST_FIRSTNAME_KEY, firstName);
      }
      if (currentUser.avatarUrl) {
        window.localStorage.setItem(LAST_AVATAR_KEY, currentUser.avatarUrl);
      } else {
        window.localStorage.removeItem(LAST_AVATAR_KEY);
      }
    } catch { /* quota / private mode */ }
  }, [currentUser]);

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
      try { window.localStorage.setItem(LAST_EMAIL_KEY, cleanEmail); }
      catch { /* */ }
      setError("");
      navigate(result.redirectTo);
    } catch (submitError) {
      console.error("Soumission du login impossible.", submitError);
      setError("La connexion sécurisée ne répond pas correctement pour le moment.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleNotMe() {
    try {
      window.localStorage.removeItem(LAST_EMAIL_KEY);
      window.localStorage.removeItem(LAST_FIRSTNAME_KEY);
      window.localStorage.removeItem(LAST_AVATAR_KEY);
    } catch { /* */ }
    window.location.href = "/welcome";
  }

  const title =
    isReturning && knownFirstName
      ? `Content de te revoir, ${knownFirstName}`
      : "Ton espace t'attend";

  return (
    <div className="lp-root">
      <style>{`
        .lp-root {
          --dw-bg: #0a0c0a;
          --dw-card: #14171a;
          --dw-card-2: #1a1e22;
          --dw-border: rgba(255,255,255,0.10);
          --dw-text: #F1EFE8;
          --dw-muted: #9AA0A6;
          --dw-dim: #6b7280;
          --dw-lime: #c5f82a;
          --dw-teal: #2DD4BF;
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          background: var(--dw-bg);
          color: var(--dw-text);
          font-family: 'DM Sans', sans-serif;
          position: relative;
          overflow: hidden;
        }
        .lp-back {
          position: absolute;
          top: 20px;
          left: 22px;
          z-index: 5;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 13px;
          border-radius: 999px;
          border: 1px solid var(--dw-border);
          background: color-mix(in srgb, var(--dw-card) 70%, transparent);
          color: var(--dw-muted);
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
          cursor: pointer;
          text-decoration: none;
          transition: border-color .15s, color .15s;
        }
        .lp-back:hover { border-color: var(--dw-lime); color: var(--dw-text); }

        /* ─── Panneau visuel gauche (brand) ─── */
        .lp-visual {
          flex: 0 0 44%;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          border-right: 1px solid var(--dw-border);
        }
        .lp-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          pointer-events: none;
          will-change: transform;
        }
        .lp-blob-lime {
          top: -12%; left: -10%; width: 460px; height: 460px;
          background: radial-gradient(circle, var(--dw-lime) 0%, transparent 70%);
          opacity: 0.16;
          animation: lp-float-1 34s ease-in-out infinite alternate;
        }
        .lp-blob-teal {
          bottom: -16%; right: -8%; width: 420px; height: 420px;
          background: radial-gradient(circle, var(--dw-teal) 0%, transparent 70%);
          opacity: 0.14;
          animation: lp-float-2 40s ease-in-out infinite alternate;
        }
        @keyframes lp-float-1 { to { transform: translate(50px, 40px) scale(1.1); } }
        @keyframes lp-float-2 { to { transform: translate(-40px, -30px) scale(1.12); } }
        .lp-grain {
          position: absolute; inset: 0; pointer-events: none;
          opacity: 0.05; mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
        }
        .lp-visual-inner { position: relative; z-index: 1; text-align: center; max-width: 360px; }
        .lp-eyebrow {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 10px; font-weight: 600; letter-spacing: 0.22em;
          text-transform: uppercase; color: var(--dw-lime);
          display: inline-flex; align-items: center; gap: 8px;
          margin-bottom: 22px;
        }
        .lp-eyebrow::before {
          content: ""; width: 7px; height: 7px; border-radius: 999px;
          background: var(--dw-lime); box-shadow: 0 0 8px var(--dw-lime);
        }
        .lp-wordmark {
          font-family: 'Anton', 'Syne', sans-serif;
          text-transform: uppercase;
          font-size: clamp(40px, 6vw, 62px);
          line-height: 0.92;
          letter-spacing: 0.01em;
          margin: 0;
          color: var(--dw-text);
        }
        .lp-wordmark span { color: var(--dw-lime); }
        .lp-tagline {
          margin: 18px 0 0;
          font-size: 14px;
          line-height: 1.6;
          color: var(--dw-muted);
        }

        /* ─── Formulaire droite ─── */
        .lp-form-side {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 28px;
        }
        .lp-form-inner { width: 100%; max-width: 380px; }
        .lp-form-eyebrow {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 10px; font-weight: 600; letter-spacing: 0.18em;
          text-transform: uppercase; color: var(--dw-muted);
          margin-bottom: 12px;
        }
        .lp-title {
          font-family: 'Anton', 'Syne', sans-serif;
          text-transform: uppercase; letter-spacing: 0.01em;
          font-size: 30px; line-height: 1.02; margin: 0 0 8px; color: var(--dw-text);
        }
        .lp-sub { margin: 0 0 26px; font-size: 14px; color: var(--dw-muted); line-height: 1.55; }

        .lp-field { position: relative; }
        .lp-input {
          width: 100%; box-sizing: border-box;
          padding: 20px 14px 8px;
          border-radius: 12px;
          border: 1px solid var(--dw-border);
          background: var(--dw-card-2);
          color: var(--dw-text);
          font-size: 15px; font-family: 'DM Sans', sans-serif;
          outline: none; transition: border-color .15s;
        }
        .lp-input:focus { border-color: var(--dw-lime); }
        .lp-input:-webkit-autofill { -webkit-text-fill-color: var(--dw-text); -webkit-box-shadow: 0 0 0 40px var(--dw-card-2) inset; }
        .lp-label {
          position: absolute; left: 14px; top: 15px;
          color: var(--dw-muted); font-size: 14px; pointer-events: none;
          transition: all .15s; font-family: 'DM Sans', sans-serif;
        }
        .lp-input:focus + .lp-label,
        .lp-input:not(:placeholder-shown) + .lp-label {
          top: 7px; font-size: 9.5px; letter-spacing: 0.12em;
          text-transform: uppercase; color: var(--dw-lime);
          font-family: 'JetBrains Mono', ui-monospace, monospace;
        }
        .lp-pw-eye {
          position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: var(--dw-dim);
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.08em;
          text-transform: uppercase; padding: 6px 8px;
        }
        .lp-pw-eye:hover { color: var(--dw-lime); }

        .lp-error {
          padding: 10px 12px; border-radius: 10px;
          background: rgba(251,113,133,0.12); color: #FCA5A5;
          font-size: 13px; line-height: 1.5;
          animation: lp-shake .3s;
        }
        @keyframes lp-shake {
          0%,100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }

        .lp-submit {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%; min-height: 50px; padding: 14px 20px;
          border-radius: 12px; border: none; cursor: pointer;
          background: var(--dw-lime); color: #0a0c0a;
          font-family: 'Anton', 'Syne', sans-serif;
          text-transform: uppercase; letter-spacing: 0.02em;
          font-size: 15px; font-weight: 700;
          box-shadow: 0 4px 16px rgba(197,248,42,0.28);
          transition: filter .15s;
        }
        .lp-submit:hover:not(:disabled) { filter: brightness(1.05); }
        .lp-submit:disabled { background: rgba(197,248,42,0.22); color: var(--dw-dim); cursor: default; box-shadow: none; }

        .lp-magic-link {
          display: block; width: 100%; margin-top: 16px;
          background: none; border: none; cursor: pointer;
          color: var(--dw-muted);
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 11px; letter-spacing: 0.04em; text-align: center;
        }
        .lp-magic-link:hover { color: var(--dw-lime); }
        .lp-magic-link strong { color: var(--dw-text); font-weight: 600; }

        .lp-trust {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          margin-top: 24px; font-size: 11px; color: var(--dw-dim);
          font-family: 'JetBrains Mono', ui-monospace, monospace; letter-spacing: 0.03em;
        }

        @media (prefers-reduced-motion: reduce) {
          .lp-blob, .lp-error { animation: none !important; }
        }
        @media (max-width: 880px) {
          .lp-root { flex-direction: column; }
          .lp-visual { flex: 0 0 auto; border-right: none; border-bottom: 1px solid var(--dw-border); padding: 64px 28px 32px; }
          .lp-wordmark { font-size: 44px; }
          .lp-tagline { display: none; }
          .lp-form-side { padding: 28px 24px 48px; }
        }
      `}</style>

      {/* Bouton retour / "Pas Prénom ?" */}
      {isReturning && knownFirstName ? (
        <button type="button" className="lp-back" onClick={handleNotMe}>
          ← Pas {knownFirstName} ?
        </button>
      ) : (
        <a href="/welcome" className="lp-back" aria-label="Retour à l'accueil">
          ← Accueil
        </a>
      )}

      {/* ─── Visuel gauche (brand) ─── */}
      <div className="lp-visual" aria-hidden="true">
        <div className="lp-blob lp-blob-lime" />
        <div className="lp-blob lp-blob-teal" />
        <div className="lp-grain" />
        <div className="lp-visual-inner">
          <span className="lp-eyebrow">Depuis 2022</span>
          <h1 className="lp-wordmark">
            La Base<br /><span>360</span>
          </h1>
          <p className="lp-tagline">
            Le club performance nutrition. Ton cockpit coach, tes clients, ton plan — au même endroit.
          </p>
        </div>
      </div>

      {/* ─── Formulaire droite ─── */}
      <div className="lp-form-side">
        <div className="lp-form-inner">
          <div className="lp-form-eyebrow">Connexion</div>
          <h1 className="lp-title">{title}</h1>
          <p className="lp-sub">Identifie-toi pour ouvrir ton espace.</p>

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
                style={{ paddingRight: 82 }}
              />
              <label htmlFor="lp-password" className="lp-label">Mot de passe</label>
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="lp-pw-eye"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? "Masquer" : "Afficher"}
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

          <button
            type="button"
            onClick={() => navigate("/forgot-password")}
            className="lp-magic-link"
          >
            Mot de passe oublié ? <strong>Recevoir un lien</strong>
          </button>

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
