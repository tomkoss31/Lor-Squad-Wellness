// Chantier Password Reset (2026-04-24).
// Route publique /forgot-password : l'utilisateur saisit son email,
// on envoie un lien de reset via Supabase Auth.
//
// Utilise supabase.auth.resetPasswordForEmail. Le lien que Supabase
// envoie redirige vers /reset-password avec les tokens dans l'URL hash.

import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { getSupabaseClient } from "../services/supabaseClient";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg("");
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/.+@.+\..+/.test(trimmed)) {
      setErrorMsg("Adresse email invalide.");
      return;
    }
    setPhase("sending");
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await sb.auth.resetPasswordForEmail(trimmed, { redirectTo });
      if (error) throw error;
      setPhase("sent");
    } catch (err) {
      setPhase("error");
      setErrorMsg(err instanceof Error ? err.message : "Erreur inconnue.");
    }
  }

  return (
    <div className="forgot-root">
      <style>{`
        .forgot-root {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 20px;
          position: relative;
          overflow: hidden;
          background: #0A0D0F;
          color: #F0EDE8;
          font-family: 'DM Sans', sans-serif;
        }
        html.theme-light .forgot-root { background: #F7F5F0; color: #0B0D11; }
        .forgot-blob {
          position: absolute; border-radius: 50%;
          filter: blur(90px); pointer-events: none; will-change: transform;
        }
        .forgot-blob-teal {
          top: -15%; left: -10%;
          width: 500px; height: 500px;
          background: radial-gradient(circle, #1D9E75 0%, transparent 70%);
          opacity: 0.35;
          animation: forgot-f1 32s ease-in-out infinite alternate;
        }
        .forgot-blob-gold {
          bottom: -16%; right: -8%;
          width: 460px; height: 460px;
          background: radial-gradient(circle, #EF9F27 0%, transparent 70%);
          opacity: 0.3;
          animation: forgot-f2 36s ease-in-out infinite alternate;
        }
        :root:not(.theme-light) .forgot-blob-teal,
        html:not(.theme-light) .forgot-blob-teal { opacity: 0.3; }
        :root:not(.theme-light) .forgot-blob-gold,
        html:not(.theme-light) .forgot-blob-gold { opacity: 0.26; }
        @keyframes forgot-f1 {
          0% { transform: translate(0,0) scale(1); }
          100% { transform: translate(60px, 40px) scale(1.12); }
        }
        @keyframes forgot-f2 {
          0% { transform: translate(0,0) scale(1); }
          100% { transform: translate(-70px, -30px) scale(1.1); }
        }
        .forgot-inner {
          position: relative; z-index: 1;
          width: 100%; max-width: 440px;
          animation: forgot-in 0.7s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes forgot-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .forgot-back {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 10px; border-radius: 8px;
          color: rgba(11,13,17,0.58); text-decoration: none;
          font-size: 13px; font-weight: 500;
          margin-bottom: 20px;
          transition: color 0.15s, transform 0.15s;
        }
        :root:not(.theme-light) .forgot-back,
        html:not(.theme-light) .forgot-back { color: rgba(240,237,232,0.5); }
        .forgot-back:hover { color: #EF9F27; transform: translateX(-2px); }
        .forgot-card {
          background: rgba(255,255,255,0.78);
          backdrop-filter: blur(14px) saturate(140%);
          -webkit-backdrop-filter: blur(14px) saturate(140%);
          border: 1px solid rgba(239,159,39,0.15);
          border-radius: 20px;
          padding: 28px 24px;
          box-shadow: 0 1px 2px rgba(11,13,17,0.04), 0 8px 24px rgba(11,13,17,0.04);
        }
        :root:not(.theme-light) .forgot-card,
        html:not(.theme-light) .forgot-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 4px 24px rgba(0,0,0,0.2);
        }
        .forgot-title {
          font-family: 'Syne', sans-serif;
          font-size: 22px;
          font-weight: 700;
          margin: 0 0 8px;
          letter-spacing: -0.01em;
        }
        .forgot-sub {
          font-size: 13.5px;
          color: rgba(11,13,17,0.6);
          line-height: 1.55;
          margin: 0 0 20px;
        }
        :root:not(.theme-light) .forgot-sub,
        html:not(.theme-light) .forgot-sub { color: rgba(240,237,232,0.6); }
        .forgot-label {
          display: block; font-size: 11px; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: rgba(11,13,17,0.52); margin-bottom: 6px;
        }
        :root:not(.theme-light) .forgot-label,
        html:not(.theme-light) .forgot-label { color: rgba(240,237,232,0.5); }
        .forgot-input {
          width: 100%; box-sizing: border-box;
          background: rgba(255,255,255,0.6);
          border: 1px solid rgba(11,13,17,0.08);
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          color: inherit;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        :root:not(.theme-light) .forgot-input,
        html:not(.theme-light) .forgot-input {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .forgot-input:focus {
          border-color: rgba(239,159,39,0.6);
          box-shadow: 0 0 0 4px rgba(239,159,39,0.12);
        }
        .forgot-submit {
          width: 100%;
          margin-top: 16px;
          background: linear-gradient(135deg, #EF9F27, #BA7517);
          color: #fff; border: none; border-radius: 12px;
          padding: 13px 16px;
          font-family: 'Syne', sans-serif;
          font-size: 14px; font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(186,117,23,0.28);
          transition: transform 0.18s, box-shadow 0.18s, filter 0.18s;
        }
        .forgot-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(186,117,23,0.38);
          filter: brightness(1.05);
        }
        .forgot-submit:disabled { opacity: 0.55; cursor: not-allowed; }
        .forgot-error {
          background: #FCEBEB; border: 1px solid #E24B4A;
          border-radius: 10px; padding: 10px 12px;
          font-size: 12.5px; color: #501313;
          margin-top: 12px;
        }
        .forgot-success {
          background: rgba(29,158,117,0.12);
          border: 1px solid rgba(29,158,117,0.35);
          border-radius: 12px; padding: 14px;
          font-size: 13px; color: #0F6E56; line-height: 1.55;
          margin-top: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .forgot-blob-teal, .forgot-blob-gold, .forgot-inner { animation: none !important; }
        }
      `}</style>

      <div aria-hidden="true" className="forgot-blob forgot-blob-teal" />
      <div aria-hidden="true" className="forgot-blob forgot-blob-gold" />

      <div className="forgot-inner">
        <Link to="/login" className="forgot-back">← Retour à la connexion</Link>

        <div className="forgot-card">
          <h1 className="forgot-title">Mot de passe oublié ?</h1>
          <p className="forgot-sub">
            Pas de panique. Saisis ton email et on t&apos;envoie un lien pour en choisir un
            nouveau.
          </p>

          {phase === "sent" ? (
            <div className="forgot-success">
              ✅ <strong>Email envoyé !</strong>
              <br />
              Vérifie ta boîte mail (et les spams). Le lien est valable 1h.
              <br />
              <br />
              <Link to="/login" style={{ color: "#0F6E56", fontWeight: 600 }}>
                Revenir à la connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label htmlFor="forgot-email" className="forgot-label">Email</label>
              <input
                id="forgot-email"
                type="email"
                className="forgot-input"
                placeholder="ton.email@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                required
              />
              {errorMsg ? <div className="forgot-error">{errorMsg}</div> : null}
              <button type="submit" className="forgot-submit" disabled={phase === "sending"}>
                {phase === "sending" ? "Envoi en cours…" : "Envoyer le lien de réinitialisation"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
