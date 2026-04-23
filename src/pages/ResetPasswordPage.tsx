// Chantier Password Reset (2026-04-24).
// Route publique /reset-password : l'utilisateur arrive ici depuis
// l'email Supabase (qui pose des tokens dans l'URL hash).
// Supabase les intercepte automatiquement et crée une session
// "recovery" → on peut appeler auth.updateUser({password}) direct.

import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { getSupabaseClient } from "../services/supabaseClient";

type Phase = "checking" | "ready" | "updating" | "success" | "error";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Vérifier qu'on a bien une session "recovery" au montage
  useEffect(() => {
    void (async () => {
      const sb = await getSupabaseClient();
      if (!sb) {
        setPhase("error");
        setErrorMsg("Service indisponible.");
        return;
      }
      // Laisse Supabase traiter le hash URL (auto via detectSessionInUrl)
      const { data } = await sb.auth.getSession();
      if (data?.session) {
        setPhase("ready");
      } else {
        setPhase("error");
        setErrorMsg("Lien expiré ou invalide. Redemande un nouveau lien.");
      }
    })();
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg("");
    if (password.length < 8) {
      setErrorMsg("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setErrorMsg("Les 2 mots de passe ne sont pas identiques.");
      return;
    }
    setPhase("updating");
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");
      const { error } = await sb.auth.updateUser({ password });
      if (error) throw error;
      setPhase("success");
      window.setTimeout(() => navigate("/login", { replace: true }), 2500);
    } catch (err) {
      setPhase("error");
      setErrorMsg(err instanceof Error ? err.message : "Erreur inconnue.");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0A0D0F",
        color: "#F0EDE8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "DM Sans, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes reset-blob-1 { 0%{transform:translate(0,0) scale(1)}100%{transform:translate(60px,40px) scale(1.1)} }
        @keyframes reset-blob-2 { 0%{transform:translate(0,0) scale(1)}100%{transform:translate(-70px,-30px) scale(1.1)} }
        @keyframes reset-in { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "-14%", left: "-10%",
          width: 480, height: 480,
          borderRadius: "50%",
          background: "radial-gradient(circle, #1D9E75 0%, transparent 70%)",
          filter: "blur(90px)",
          opacity: 0.3,
          pointerEvents: "none",
          animation: "reset-blob-1 32s ease-in-out infinite alternate",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: "-16%", right: "-8%",
          width: 460, height: 460,
          borderRadius: "50%",
          background: "radial-gradient(circle, #EF9F27 0%, transparent 70%)",
          filter: "blur(90px)",
          opacity: 0.26,
          pointerEvents: "none",
          animation: "reset-blob-2 36s ease-in-out infinite alternate",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 420,
          width: "100%",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20,
          padding: 28,
          boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
          animation: "reset-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) both",
        }}
      >
        <h1
          style={{
            fontFamily: "Syne, sans-serif",
            fontSize: 22,
            fontWeight: 700,
            margin: 0,
            marginBottom: 8,
            letterSpacing: "-0.01em",
          }}
        >
          Nouveau mot de passe
        </h1>

        {phase === "checking" ? (
          <p style={{ fontSize: 13, color: "rgba(240,237,232,0.6)" }}>Vérification du lien…</p>
        ) : null}

        {phase === "success" ? (
          <div
            style={{
              background: "rgba(29,158,117,0.14)",
              border: "1px solid rgba(29,158,117,0.4)",
              borderRadius: 12,
              padding: 14,
              fontSize: 13,
              color: "#1D9E75",
              lineHeight: 1.55,
            }}
          >
            ✅ <strong>Mot de passe mis à jour !</strong>
            <br />
            Redirection vers la connexion…
          </div>
        ) : null}

        {phase === "ready" || phase === "updating" || (phase === "error" && !errorMsg.includes("expiré")) ? (
          <>
            <p style={{ fontSize: 13, color: "rgba(240,237,232,0.6)", marginBottom: 18, lineHeight: 1.55 }}>
              Choisis ton nouveau mot de passe. Minimum 8 caractères.
            </p>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(240,237,232,0.5)" }}>
                  Nouveau mot de passe
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Au moins 8 caractères"
                  autoComplete="new-password"
                  required
                  style={{
                    display: "block",
                    width: "100%",
                    marginTop: 6,
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.04)",
                    color: "#F0EDE8",
                    fontSize: 14,
                    fontFamily: "DM Sans, sans-serif",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </label>
              <label>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(240,237,232,0.5)" }}>
                  Confirmer
                </span>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Retape le mot de passe"
                  autoComplete="new-password"
                  required
                  style={{
                    display: "block",
                    width: "100%",
                    marginTop: 6,
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.04)",
                    color: "#F0EDE8",
                    fontSize: 14,
                    fontFamily: "DM Sans, sans-serif",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </label>
              {errorMsg && !errorMsg.includes("expiré") ? (
                <div
                  style={{
                    background: "#FCEBEB",
                    border: "1px solid #E24B4A",
                    borderRadius: 10,
                    padding: "10px 12px",
                    fontSize: 12.5,
                    color: "#501313",
                  }}
                >
                  {errorMsg}
                </div>
              ) : null}
              <button
                type="submit"
                disabled={phase === "updating"}
                style={{
                  background: "linear-gradient(135deg, #EF9F27, #BA7517)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  padding: "13px 16px",
                  fontFamily: "Syne, sans-serif",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: phase === "updating" ? "wait" : "pointer",
                  marginTop: 4,
                  boxShadow: "0 4px 14px rgba(186,117,23,0.28)",
                }}
              >
                {phase === "updating" ? "Mise à jour…" : "Mettre à jour le mot de passe"}
              </button>
            </form>
          </>
        ) : null}

        {phase === "error" && errorMsg.includes("expiré") ? (
          <div
            style={{
              background: "#FCEBEB",
              border: "1px solid #E24B4A",
              borderRadius: 12,
              padding: 14,
              fontSize: 13,
              color: "#501313",
              lineHeight: 1.55,
            }}
          >
            {errorMsg}
            <br />
            <br />
            <a href="/forgot-password" style={{ color: "#BA7517", fontWeight: 600, textDecoration: "none" }}>
              → Demander un nouveau lien
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
