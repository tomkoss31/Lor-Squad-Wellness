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

  // Vérifier qu'on a bien une session "recovery" au montage.
  //
  // Robustesse (2026-07-02) : l'ancien code faisait UN seul `getSession()`
  // immédiat → il ratait la session quand Supabase traitait encore le hash de
  // l'URL de façon asynchrone (race), et ne gérait que le format implicite
  // (`#access_token`). Résultat : « Lien expiré ou invalide » alors que le lien
  // était bon (bug signalé sur la cliente Maeva). On gère désormais les 3
  // formats de lien recovery + on attend l'event auth avant de déclarer l'échec.
  useEffect(() => {
    let settled = false;
    let unsub: (() => void) | undefined;

    // Délai de grâce : on ne déclare « expiré » qu'après avoir laissé Supabase
    // traiter l'URL et émettre son event (sinon faux négatif immédiat).
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      setPhase("error");
      setErrorMsg("Lien expiré ou invalide. Redemande un nouveau lien.");
    }, 4500);

    const markReady = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      setPhase("ready");
    };

    void (async () => {
      const sb = await getSupabaseClient();
      if (!sb) {
        settled = true;
        window.clearTimeout(timer);
        setPhase("error");
        setErrorMsg("Service indisponible.");
        return;
      }

      // 1) Écoute l'event recovery — Supabase traite le hash de manière async
      //    et émet PASSWORD_RECOVERY / SIGNED_IN quand la session est prête.
      const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
        if (
          session &&
          (event === "PASSWORD_RECOVERY" ||
            event === "SIGNED_IN" ||
            event === "TOKEN_REFRESHED" ||
            event === "INITIAL_SESSION")
        ) {
          markReady();
        }
      });
      unsub = () => sub.subscription.unsubscribe();

      // 2) Formats de lien alternatifs selon la config du projet Supabase :
      //    - PKCE : `?code=…` → exchangeCodeForSession
      //    - OTP  : `?token_hash=…&type=recovery` → verifyOtp
      //    (le format implicite `#access_token` est géré par detectSessionInUrl
      //     + le listener ci-dessus.)
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const tokenHash = url.searchParams.get("token_hash");
        const type = url.searchParams.get("type");
        if (code) {
          await sb.auth.exchangeCodeForSession(code);
        } else if (tokenHash && type === "recovery") {
          await sb.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
        }
      } catch {
        /* lien déjà consommé / invalide → on retombe sur le timeout d'erreur */
      }

      // 3) Session déjà établie (refresh de page, hash déjà traité) ?
      const { data } = await sb.auth.getSession();
      if (data?.session) markReady();
    })();

    return () => {
      window.clearTimeout(timer);
      unsub?.();
    };
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
      // Pas de redirection forcée vers /login (= connexion COACH) : un CLIENT
      // accède à son app via son lien /client/<token> ou l'icône PWA, pas par
      // /login → ça le perdait (bug de redirection signalé). On laisse le choix.
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
              padding: 16,
              fontSize: 13,
              color: "#1D9E75",
              lineHeight: 1.55,
            }}
          >
            ✅ <strong>Mot de passe mis à jour !</strong>
            <div style={{ color: "rgba(240,237,232,0.75)", marginTop: 10 }}>
              <strong style={{ color: "#F0EDE8" }}>Client ?</strong> Rouvre simplement
              ton app <strong>La Base 360</strong> (l'icône sur ton écran d'accueil, ou
              le lien que ton coach t'a envoyé).
            </div>
            <button
              type="button"
              onClick={() => navigate("/login", { replace: true })}
              style={{
                marginTop: 14,
                width: "100%",
                background: "linear-gradient(135deg, #EF9F27, #BA7517)",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                padding: "12px 16px",
                fontFamily: "Syne, sans-serif",
                fontSize: 13.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Je suis coach → me connecter
            </button>
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
