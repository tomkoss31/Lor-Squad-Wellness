// Chantier Password Reset (2026-04-24).
// Route publique /reset-password : l'utilisateur arrive ici depuis
// l'email Supabase (qui pose des tokens dans l'URL hash).
// Supabase les intercepte automatiquement et crée une session
// "recovery" → on peut appeler auth.updateUser({password}) direct.
//
// 22/09/2026 : habillée au langage de l'entrée (maquette Fbk2bRMgzC4bMLYAm91nLM) — même
// fond vert, « LA BASE » que /bienvenue, /welcome, /login. La logique ne change pas.

import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getSupabaseClient } from "../services/supabaseClient";
import "../components/bienvenue/bienvenue.css";

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

  const expire = phase === "error" && errorMsg.includes("expiré");
  const formulaire = phase === "ready" || phase === "updating" || (phase === "error" && !expire);

  return (
    <div className="bv" data-v="coaching">
      <div className="bv-lueur" aria-hidden="true" />
      <main className="bv-col">
        <div className="bv-marque">LA BASE</div>

        {phase === "checking" ? (
          <p className="bv-p" aria-live="polite" style={{ textAlign: "center", marginTop: 40 }}>
            Vérification du lien…
          </p>
        ) : null}

        {phase === "success" ? (
          <>
            <div className="bv-ok" role="status">
              <div className="bv-eye">C'est fait</div>
              <h1 className="bv-h1" style={{ fontSize: 34, marginTop: 6 }}>
                Mot de passe
                <br />
                mis à jour
              </h1>
              {/* Bug signalé sur la cliente Maeva (2026-07-16) : l'écran ne proposait qu'un
                  bouton « coach », laissant une cliente sans icône ni lien bloquée après un
                  reset réussi. /login gère aussi les identifiants client (→ /client/:token). */}
              <p>
                <b>Cliente ?</b> Si tu as l'icône de ton espace sur ton écran d'accueil (ou le lien que ton coach
                t'a envoyé), rouvre-la simplement. Sinon, connecte-toi avec ton nouveau mot de passe.
              </p>
            </div>
            <button type="button" className="bv-cta" onClick={() => navigate("/login", { replace: true })}>
              Me connecter <span aria-hidden="true">→</span>
            </button>
          </>
        ) : null}

        {formulaire ? (
          <>
            <div className="bv-eye">Nouveau mot de passe</div>
            <h1 className="bv-h1">
              Choisis-en
              <br />
              un nouveau
            </h1>
            <p className="bv-p">Minimum 8 caractères.</p>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="bv-champ">
                <label htmlFor="rp-mdp1">Nouveau mot de passe</label>
                <div className="bv-saisie">
                  <input
                    id="rp-mdp1"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Au moins 8 caractères"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
              <div className="bv-champ">
                <label htmlFor="rp-mdp2">Retape-le</label>
                <div className="bv-saisie">
                  <input
                    id="rp-mdp2"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Le même"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
              {errorMsg && !expire ? (
                <div className="bv-erreur" role="alert">
                  <p>{errorMsg}</p>
                </div>
              ) : null}
              <button type="submit" className="bv-cta" disabled={phase === "updating"}>
                {phase === "updating" ? "Mise à jour…" : (
                  <>
                    Mettre à jour <span aria-hidden="true">→</span>
                  </>
                )}
              </button>
            </form>
          </>
        ) : null}

        {expire ? (
          <div className="bv-invalide" role="alert">
            <div className="bv-eye" style={{ color: "var(--bv-alerte)" }}>Nouveau mot de passe</div>
            <h1 className="bv-h1" style={{ fontSize: 30, marginTop: 6 }}>Ce lien ne marche plus</h1>
            <p>{errorMsg}</p>
            <Link to="/forgot-password" className="bv-lien-seul" style={{ alignSelf: "flex-start", paddingLeft: 0 }}>
              Demander un nouveau lien ›
            </Link>
          </div>
        ) : null}
      </main>
    </div>
  );
}
