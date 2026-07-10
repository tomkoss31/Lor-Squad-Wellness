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
      // Envoi via l'edge send-password-reset (Resend) : contourne le mailer
      // intégré Supabase, bridé et peu fiable (« limite atteinte » / non reçu).
      const { data, error } = await sb.functions.invoke("send-password-reset", {
        body: { email: trimmed, redirect_to: window.location.origin },
      });
      const payload = data as { success?: boolean; error?: string } | null;
      if (error || !payload?.success) {
        const raw = payload?.error ?? "";
        throw new Error(
          raw === "rate_limited"
            ? "Trop de demandes. Patiente quelques minutes avant de réessayer."
            : "L'envoi a échoué. Réessaie dans un instant.",
        );
      }
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
          --dw-bg: #0a0c0a; --dw-card: #14171a; --dw-card-2: #1a1e22;
          --dw-border: rgba(255,255,255,0.10); --dw-text: #F1EFE8;
          --dw-muted: #9AA0A6; --dw-dim: #6b7280; --dw-lime: #c5f82a; --dw-teal: #2DD4BF;
          min-height: 100vh; min-height: 100dvh;
          display: flex; align-items: center; justify-content: center;
          padding: 32px 20px; position: relative; overflow: hidden;
          background: var(--dw-bg); color: var(--dw-text);
          font-family: 'DM Sans', sans-serif;
        }
        .forgot-blob { position: absolute; border-radius: 50%; filter: blur(90px); pointer-events: none; }
        .forgot-blob-teal {
          top: -15%; left: -10%; width: 500px; height: 500px;
          background: radial-gradient(circle, var(--dw-teal) 0%, transparent 70%);
          opacity: 0.15; animation: forgot-f1 32s ease-in-out infinite alternate;
        }
        .forgot-blob-gold {
          bottom: -16%; right: -8%; width: 460px; height: 460px;
          background: radial-gradient(circle, var(--dw-lime) 0%, transparent 70%);
          opacity: 0.16; animation: forgot-f2 36s ease-in-out infinite alternate;
        }
        @keyframes forgot-f1 { to { transform: translate(60px, 40px) scale(1.12); } }
        @keyframes forgot-f2 { to { transform: translate(-70px, -30px) scale(1.1); } }
        .forgot-inner {
          position: relative; z-index: 1; width: 100%; max-width: 440px;
          animation: forgot-in 0.7s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes forgot-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .forgot-back {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 13px; border-radius: 999px;
          border: 1px solid var(--dw-border); color: var(--dw-muted); text-decoration: none;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 11px; font-weight: 600; margin-bottom: 20px;
          transition: color 0.15s, border-color 0.15s;
        }
        .forgot-back:hover { color: var(--dw-text); border-color: var(--dw-lime); }
        .forgot-card {
          background: var(--dw-card); border: 1px solid var(--dw-border);
          border-radius: 20px; padding: 30px 26px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.5);
        }
        .forgot-title {
          font-family: 'Anton', 'Syne', sans-serif; text-transform: uppercase;
          letter-spacing: 0.01em; font-size: 26px; margin: 0 0 8px; color: var(--dw-text);
        }
        .forgot-sub { font-size: 13.5px; color: var(--dw-muted); line-height: 1.55; margin: 0 0 20px; }
        .forgot-label {
          display: block; font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 10px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--dw-muted); margin-bottom: 6px;
        }
        .forgot-input {
          width: 100%; box-sizing: border-box;
          background: var(--dw-card-2); border: 1px solid var(--dw-border);
          border-radius: 12px; padding: 12px 14px; font-size: 14px;
          font-family: 'DM Sans', sans-serif; color: var(--dw-text);
          outline: none; transition: border-color 0.2s;
        }
        .forgot-input:focus { border-color: var(--dw-lime); }
        .forgot-submit {
          width: 100%; margin-top: 16px;
          background: var(--dw-lime); color: #0a0c0a; border: none; border-radius: 12px;
          padding: 14px 16px; font-family: 'Anton', 'Syne', sans-serif;
          text-transform: uppercase; letter-spacing: 0.02em; font-size: 14px; font-weight: 700;
          cursor: pointer; box-shadow: 0 4px 16px rgba(197,248,42,0.28); transition: filter 0.18s;
        }
        .forgot-submit:hover:not(:disabled) { filter: brightness(1.05); }
        .forgot-submit:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
        .forgot-error {
          background: rgba(251,113,133,0.12); border: 1px solid rgba(251,113,133,0.4);
          border-radius: 10px; padding: 10px 12px; font-size: 12.5px; color: #FCA5A5; margin-top: 12px;
        }
        .forgot-success {
          background: color-mix(in srgb, var(--dw-teal) 12%, transparent);
          border: 1px solid color-mix(in srgb, var(--dw-teal) 35%, transparent);
          border-radius: 12px; padding: 14px; font-size: 13px; color: var(--dw-teal); line-height: 1.55; margin-top: 4px;
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
              <strong>Email envoyé !</strong>
              <br />
              Vérifie ta boîte mail (et les spams). Le lien est valable 1h.
              <br />
              <br />
              <Link to="/login" style={{ color: "var(--dw-teal)", fontWeight: 600 }}>
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
