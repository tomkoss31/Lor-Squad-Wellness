// =============================================================================
// LoginPage — /login, la connexion de TOUT LE MONDE : cliente, membre du club,
// coach. `loginWithCredentials` cherche un profil coach, et à défaut le jeton de
// la cliente, puis redirige (Co-pilote, ou /client/<jeton>).
//
// Refaite le 22/09/2026 (maquette Fbk2bRMgzC4bMLYAm91nLM, « bon travail, bravo »)
// au langage de la page du lien d'accès : même fond vert, « LA BASE », les trois
// maisons. Téléphone : les trois logos en petit, puis le formulaire. Ordinateur :
// les maisons à gauche, le formulaire à droite.
//
// La logique d'avant ne change pas : reconnaissance « tu reviens » (dernier email
// et prénom gardés sur l'appareil), « Pas {prénom} ? », redirection selon le rôle,
// « Recevoir un lien » (mot de passe oublié).
// =============================================================================

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { FamilleLogos, MaisonsEntree } from "../components/bienvenue/TroisMaisons";
import "../components/bienvenue/bienvenue.css";

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
  const revient = isReturning && Boolean(knownFirstName);

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

  return (
    <div className="bv" data-v="coaching">
      <div className="bv-entree">
        {/* Ordinateur seulement : la marque et les trois maisons. */}
        <section className="bv-entree-g" aria-label="La Base">
          <div className="bv-lueur" aria-hidden="true" />
          <div className="bv-marque">LA BASE</div>
          <div className="bv-eye">Verdun · depuis 2022</div>
          <div className="bv-h1" aria-hidden="true">
            Trois maisons,
            <br />
            une équipe
          </div>
          <p className="bv-p">Ton compte ouvre la bonne porte : ton coaching, ton club, ou ton espace de coach.</p>
          <MaisonsEntree />
        </section>

        <div className="bv-entree-d">
          <div className="bv-lueur bv-seulement-mobile" aria-hidden="true" />
          <main className="bv-col">
            {revient ? (
              <button type="button" className="bv-retour" onClick={handleNotMe}>
                ‹ Pas {knownFirstName} ?
              </button>
            ) : (
              <Link to="/welcome" className="bv-retour" aria-label="Retour à l'accueil">
                ‹ Accueil
              </Link>
            )}
            <div className="bv-seulement-mobile" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="bv-marque">LA BASE</div>
              <FamilleLogos />
            </div>

            <div className="bv-eye">{revient ? "Bon retour" : "Connexion"}</div>
            <h1 className="bv-h1">
              {revient ? (
                <>
                  Content de
                  <br />
                  te revoir,
                  <br />
                  {knownFirstName}
                </>
              ) : (
                <>
                  Ton espace
                  <br />
                  t'attend
                </>
              )}
            </h1>
            <p className="bv-p">
              {revient
                ? "Ton mot de passe, et c'est reparti."
                : "Cliente, membre du club ou coach : ton email et ton mot de passe."}
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="bv-champ">
                <label htmlFor="lp-email">Ton email</label>
                <div className="bv-saisie">
                  <input
                    id="lp-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemple@email.com"
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete="username"
                    inputMode="email"
                    spellCheck={false}
                    required
                  />
                </div>
              </div>

              <div className="bv-champ">
                <label htmlFor="lp-password">Ton mot de passe</label>
                <div className="bv-saisie">
                  <input
                    id="lp-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                  />
                  <button
                    type="button"
                    className="bv-oeil"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-pressed={showPassword}
                    aria-label={showPassword ? "Cacher le mot de passe" : "Voir le mot de passe"}
                  >
                    {showPassword ? "Cacher" : "Voir"}
                  </button>
                </div>
              </div>

              {error ? (
                <div className="bv-erreur" role="alert">
                  <p>{error}</p>
                </div>
              ) : null}

              <button type="submit" className="bv-cta" disabled={!authReady || submitting}>
                {submitting ? "Connexion…" : (
                  <>
                    Me connecter <span aria-hidden="true">→</span>
                  </>
                )}
              </button>
            </form>

            <p className="bv-petit">
              Mot de passe oublié ? <Link to="/forgot-password">Recevoir un lien</Link>
            </p>
            {!revient && (
              <div className="bv-aide">
                <b>Première fois ?</b> Ton accès se crée avec le lien que ton coach t'envoie. Pas de lien ?
                Demande-le-lui.
              </div>
            )}
            <div className="bv-confiance">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Connexion sécurisée · données chiffrées
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
