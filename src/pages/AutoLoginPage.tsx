// Chantier Welcome Page + Magic Links (2026-04-24).
// Route publique /auto-login?token=XXX.
// Consomme le magic link via Edge Function consume-auto-login-token,
// établit la session Supabase via verifyOtp(type='magiclink'), puis
// redirige vers /co-pilote (distri) ou /client/:token (client) ou /app.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSupabaseClient } from "../services/supabaseClient";
import { extractFunctionError } from "../lib/utils/extractFunctionError";

type Phase =
  | { kind: "loading" }
  | { kind: "success"; redirectTo: string }
  | { kind: "error"; message: string };

export function AutoLoginPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });

  useEffect(() => {
    void (async () => {
      const params = new URLSearchParams(window.location.search);
      const token = (params.get("token") ?? "").trim();
      if (!token) {
        setPhase({ kind: "error", message: "Lien incomplet." });
        return;
      }

      const sb = await getSupabaseClient();
      if (!sb) {
        setPhase({ kind: "error", message: "Service indisponible." });
        return;
      }

      try {
        const { data, error } = await sb.functions.invoke("consume-auto-login-token", {
          body: { token },
        });
        // Hotfix 2026-04-30 : extraction body avec helper (cas 4xx/5xx).
        if (error || !data?.success) {
          const msg = await extractFunctionError(data, error, "Lien invalide.");
          throw new Error(msg);
        }

        const hashedToken = (data.hashed_token as string | null) ?? null;
        const email = data.email as string | undefined;
        const redirectTo = (data.redirect_to as string | undefined) ?? "/co-pilote";

        if (!hashedToken || !email) {
          throw new Error("Session indisponible.");
        }

        // Echange hashed_token + email contre une session Supabase
        const { error: verifyErr } = await sb.auth.verifyOtp({
          type: "magiclink",
          token_hash: hashedToken,
          email,
        });
        if (verifyErr) {
          // Fallback : tenter via action_link (le navigateur suit le lien)
          const actionLink = (data.action_link as string | undefined) ?? null;
          if (actionLink) {
            window.location.href = actionLink;
            return;
          }
          throw new Error(verifyErr.message);
        }

        setPhase({ kind: "success", redirectTo });
        window.setTimeout(() => navigate(redirectTo, { replace: true }), 600);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Lien invalide.";
        setPhase({ kind: "error", message: msg });
      }
    })();
  }, [navigate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--ls-bg, #0B0D11)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 400,
          width: "100%",
          background: "var(--ls-surface)",
          border: "1px solid var(--ls-border)",
          borderRadius: 18,
          padding: 28,
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}
      >
        {phase.kind === "loading" ? (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
            <h1
              style={{
                fontFamily: "Syne, sans-serif",
                fontSize: 20,
                fontWeight: 700,
                color: "var(--ls-text)",
                margin: 0,
                marginBottom: 8,
              }}
            >
              Connexion en cours…
            </h1>
            <p style={{ fontSize: 13, color: "var(--ls-text-muted)", lineHeight: 1.5, margin: 0 }}>
              On récupère ta session, ça prend 1 seconde.
            </p>
          </>
        ) : phase.kind === "success" ? (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <h1
              style={{
                fontFamily: "Syne, sans-serif",
                fontSize: 20,
                fontWeight: 700,
                color: "#1D9E75",
                margin: 0,
                marginBottom: 8,
              }}
            >
              Connecté !
            </h1>
            <p style={{ fontSize: 13, color: "var(--ls-text-muted)", lineHeight: 1.5, margin: 0 }}>
              Redirection vers ton espace…
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h1
              style={{
                fontFamily: "Syne, sans-serif",
                fontSize: 20,
                fontWeight: 700,
                color: "#E24B4A",
                margin: 0,
                marginBottom: 8,
              }}
            >
              Lien invalide
            </h1>
            <p
              style={{
                fontSize: 13,
                color: "var(--ls-text-muted)",
                lineHeight: 1.55,
                margin: 0,
                marginBottom: 14,
              }}
            >
              {phase.message}
              <br />
              <br />
              Contacte ton coach pour recevoir un nouveau lien, ou connecte-toi avec ton email
              et ton mot de passe.
            </p>
            <button
              type="button"
              onClick={() => navigate("/login")}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
                border: "none",
                color: "#FFFFFF",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Connexion par email
            </button>
          </>
        )}
      </div>
    </div>
  );
}
