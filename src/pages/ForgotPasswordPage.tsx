// =============================================================================
// /forgot-password — « on t'envoie un lien » (Chantier Password Reset, 24/04).
//
// L'envoi passe par l'edge send-password-reset (Resend) : elle contourne le mailer
// intégré de Supabase, bridé et peu fiable. Elle ne dit jamais si l'adresse a un
// compte (anti-énumération) — d'où le « si un compte existe » du message.
// Le lien reçu mène à /reset-password.
//
// Refaite le 22/09/2026 au langage de l'entrée (maquette Fbk2bRMgzC4bMLYAm91nLM) :
// même fond vert, « LA BASE ». La logique ne change pas.
// =============================================================================

import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { getSupabaseClient } from "../services/supabaseClient";
import "../components/bienvenue/bienvenue.css";

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
    <div className="bv" data-v="coaching">
      <div className="bv-lueur" aria-hidden="true" />
      <main className="bv-col">
        <Link to="/login" className="bv-retour">‹ Retour à la connexion</Link>
        <div className="bv-marque">LA BASE</div>

        {phase === "sent" ? (
          <>
            <div className="bv-ok" role="status">
              <div className="bv-eye">C'est parti</div>
              <h1 className="bv-h1" style={{ fontSize: 34, marginTop: 6 }}>
                Regarde
                <br />
                tes mails
              </h1>
              <p>
                Si un compte existe avec <b>{email.trim().toLowerCase()}</b>, le lien arrive dans la minute. Pense à
                regarder les indésirables. Il est valable 1 heure.
              </p>
            </div>
            <button type="button" className="bv-second" onClick={() => setPhase("idle")}>
              Je n'ai rien reçu, renvoyer
            </button>
          </>
        ) : (
          <>
            <div className="bv-eye">Mot de passe oublié</div>
            <h1 className="bv-h1">
              On t'envoie
              <br />
              un lien
            </h1>
            <p className="bv-p">Entre ton email : tu reçois un lien pour choisir un nouveau mot de passe.</p>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }} noValidate>
              <div className="bv-champ">
                <label htmlFor="forgot-email">Ton email</label>
                <div className="bv-saisie">
                  <input
                    id="forgot-email"
                    type="email"
                    inputMode="email"
                    placeholder="exemple@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    required
                  />
                </div>
              </div>
              {errorMsg ? (
                <div className="bv-erreur" role="alert">
                  <p>{errorMsg}</p>
                </div>
              ) : null}
              <button type="submit" className="bv-cta" disabled={phase === "sending"}>
                {phase === "sending" ? "Envoi en cours…" : (
                  <>
                    Recevoir le lien <span aria-hidden="true">→</span>
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
