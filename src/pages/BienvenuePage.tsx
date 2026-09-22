// =============================================================================
// /bienvenue?token=… — la page qui s'ouvre avec le lien d'accès envoyé par la
// coach (WhatsApp, SMS, mail).
//
// Refaite le 22/09/2026 (maquette 7pdf4sTkQoHob1axp76vfP, Thomas : « il est
// top, good job, continue »). Deux écrans, puis son espace :
//   1. Découvrir — « La Base, ce sont trois maisons », avec les vrais logos :
//      La Base Nutrition (le coaching), The Breakfast Club (le club
//      petit-déjeuner), La Base Shakes & Drinks (les boissons). SA maison en
//      tête et en couleur : une membre du club (`club`, clients.ebe_bbc) voit
//      l'orange du club, une cliente en coaching le teal de La Base.
//   2. Mot de passe — son identifiant affiché (`email_masque`) ; sans email en
//      fiche, elle saisit le sien (plus de pop-up bloquante).
//   3. Installer — PAS ici : dans son espace (/client/<jeton>?installer=1,
//      InstallerEspace). Ici, le manifeste est celui de l'app coach
//      (`start_url: /login`) : l'icône posée depuis cette page s'ouvrait sur la
//      connexion. On y va donc par un VRAI chargement (window.location), pour
//      qu'index.html pose le manifeste de SON espace avant tout.
//
// La logique d'origine (21/04) ne change pas : validate-invitation-token, puis
// consume-invitation-token { token, password, email? } → session + redirect_token.
// =============================================================================

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Progres, TroisMaisons } from "../components/bienvenue/TroisMaisons";
import type { Variante } from "../components/bienvenue/bienvenue";
import { isStandalonePwa } from "../lib/utils/detectDevice";
import { extractFunctionError } from "../lib/utils/extractFunctionError";
import { getSupabaseClient } from "../services/supabaseClient";
import "../components/bienvenue/bienvenue.css";

type ValidationState =
  | { status: "loading" }
  | {
      status: "valid";
      firstName: string;
      coachFirstName: string;
      hasEmailOnRecord: boolean;
      club: boolean;
      emailMasque: string | null;
    }
  | { status: "invalid"; message: string };

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function BienvenuePage() {
  const [token, setToken] = useState<string>("");
  const [validation, setValidation] = useState<ValidationState>({ status: "loading" });
  const [etape, setEtape] = useState<"decouvrir" | "mdp">("decouvrir");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [voir, setVoir] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string>("");
  // « Mot de passe oublié ? » seulement quand le SERVEUR dit qu'elle a déjà un
  // compte — jamais pour « au moins 6 caractères » (l'ancienne page le proposait).
  const [lienOubli, setLienOubli] = useState(false);

  // 1. Le lien : on lit le jeton et on le fait vérifier.
  useEffect(() => {
    const t = (new URLSearchParams(window.location.search).get("token") ?? "").trim();
    if (!t) {
      setValidation({ status: "invalid", message: "Lien incomplet. Demande à ton coach un nouveau lien d'accès." });
      return;
    }
    setToken(t);

    void (async () => {
      const sb = await getSupabaseClient();
      if (!sb) {
        setValidation({ status: "invalid", message: "Service momentanément indisponible. Réessaie dans quelques minutes." });
        return;
      }
      const { data, error } = await sb.functions.invoke("validate-invitation-token", { body: { token: t } });
      if (error || !data || data.valid !== true) {
        const reason = data?.reason as string | undefined;
        const message =
          reason === "expired"
            ? "Ce lien a expiré. Demande à ton coach un nouveau lien."
            : reason === "consumed"
              ? "Ce lien a déjà été utilisé. Demande à ton coach un nouveau lien."
              : "Ce lien n'est plus valide. Demande à ton coach un nouveau lien.";
        setValidation({ status: "invalid", message });
        return;
      }
      setValidation({
        status: "valid",
        firstName: (data.client_first_name ?? "").trim() || "toi",
        coachFirstName: data.coach_first_name ?? "Ton coach",
        hasEmailOnRecord: Boolean(data.has_email_on_record),
        club: data.club === true,
        emailMasque: typeof data.email_masque === "string" ? data.email_masque : null,
      });
    })();
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [etape]);

  // 2. Le mot de passe : on crée l'accès, puis direction SON espace.
  const handleSubmit = useCallback(async () => {
    if (validation.status !== "valid") return;
    setFormError("");
    setLienOubli(false);

    if (password.length < 6) {
      setFormError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (password !== passwordConfirm) {
      setFormError("Les 2 mots de passe ne sont pas identiques.");
      return;
    }
    if (!validation.hasEmailOnRecord && !REGEX_EMAIL.test(email.trim())) {
      setFormError("L'adresse email saisie n'a pas l'air valide.");
      return;
    }

    setSubmitting(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) {
        setFormError("Service indisponible. Réessaie dans quelques minutes.");
        return;
      }
      // supabase-js v2.101+ ne rend plus le corps d'erreur dans `data` en 4xx/5xx :
      // extractFunctionError lit data.error / error.context (hotfix 30/04).
      const { data, error } = await sb.functions.invoke("consume-invitation-token", {
        body: {
          token,
          password,
          email: validation.hasEmailOnRecord ? undefined : email.trim().toLowerCase(),
        },
      });
      if (error || !data?.success) {
        const msg = await extractFunctionError(data, error, "Impossible de créer ton accès pour le moment.");
        console.warn("[BienvenuePage] consume-invitation-token failed:", { data, error, msg });
        setFormError(msg);
        setLienOubli(/d[ée]j[aà] un compte|mot de passe/i.test(msg));
        return;
      }

      // Connexion automatique si on a reçu la session (non bloquant).
      if (data.access_token && data.refresh_token) {
        try {
          await sb.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
        } catch {
          /* on continue quand même */
        }
      }

      // 3. Son espace — par un VRAI chargement : index.html y pose le manifeste de
      // SON espace avant tout, et l'installation s'y fait (?installer=1).
      if (data.redirect_token) {
        const installer = isStandalonePwa() ? "" : "&installer=1";
        window.location.replace(`/client/${encodeURIComponent(data.redirect_token)}?welcome=1${installer}`);
      } else {
        window.location.replace("/login?welcome=1");
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setSubmitting(false);
    }
  }, [email, password, passwordConfirm, token, validation]);

  // ─── Rendu ───────────────────────────────────────────────────────────────
  if (validation.status === "loading") {
    return (
      <div className="bv" data-v="coaching">
        <main className="bv-col">
          <div className="bv-marque">LA BASE</div>
          <p className="bv-p" aria-live="polite" style={{ textAlign: "center", marginTop: 40 }}>
            Vérification du lien…
          </p>
        </main>
      </div>
    );
  }

  if (validation.status === "invalid") {
    return (
      <div className="bv" data-v="coaching">
        <main className="bv-col">
          <div className="bv-marque">LA BASE</div>
          <div className="bv-invalide" role="alert">
            <div className="bv-eye" style={{ color: "var(--bv-alerte)" }}>Ton lien d'accès</div>
            <h1 className="bv-h1" style={{ fontSize: 30, marginTop: 6 }}>Ce lien ne marche plus</h1>
            <p>{validation.message}</p>
          </div>
        </main>
      </div>
    );
  }

  const v: Variante = validation.club ? "club" : "coaching";
  const espace = validation.club ? "ton espace membre" : "ton espace";

  if (etape === "decouvrir") {
    return (
      <div className="bv" data-v={v}>
        <div className="bv-lueur" aria-hidden="true" />
        <main className="bv-col">
          <div className="bv-marque">LA BASE</div>
          <div className="bv-eye">{validation.club ? "Ton espace membre" : "Ton espace"}</div>
          <h1 className="bv-h1">
            Bienvenue
            <br />
            {validation.firstName}
          </h1>
          <p className="bv-p">
            <b>{validation.coachFirstName}</b> t'a ouvert {espace}. La Base, ce sont <b>trois maisons</b> :
          </p>
          <TroisMaisons variante={v} coach={validation.coachFirstName} />
          <p className="bv-equipe">Une seule équipe, basée à Verdun.</p>
          <button type="button" className="bv-cta" onClick={() => setEtape("mdp")}>
            Créer mon accès <span aria-hidden="true">→</span>
          </button>
          <p className="bv-petit">Un mot de passe et c'est prêt : 30 secondes.</p>
        </main>
      </div>
    );
  }

  const envoyer = (e: FormEvent) => {
    e.preventDefault();
    void handleSubmit();
  };

  return (
    <div className="bv" data-v={v}>
      <main className="bv-col">
        <button type="button" className="bv-retour" onClick={() => setEtape("decouvrir")}>
          ‹ Retour
        </button>
        <Progres etape={2} />
        <h1 className="bv-h1">
          Ton mot
          <br />
          de passe
        </h1>
        <p className="bv-p">Il te sert à retrouver {espace} sur un autre téléphone.</p>

        <form onSubmit={envoyer} style={{ display: "flex", flexDirection: "column", gap: 14 }} noValidate>
          {validation.hasEmailOnRecord ? (
            validation.emailMasque && (
              <div className="bv-id">
                <span aria-hidden="true">✉️</span>
                <span>
                  Ton identifiant : <b>{validation.emailMasque}</b>
                </span>
              </div>
            )
          ) : (
            <div className="bv-champ">
              <label htmlFor="bv-email">Ton email</label>
              <div className="bv-saisie">
                <input
                  id="bv-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="exemple@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <span className="bv-petit" style={{ textAlign: "left" }}>
                Ce sera ton identifiant : c'est avec lui que tu te reconnecteras.
              </span>
            </div>
          )}

          <div className="bv-champ">
            <label htmlFor="bv-mdp1">Choisis un mot de passe</label>
            <div className="bv-saisie">
              <input
                id="bv-mdp1"
                type={voir ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Au moins 6 caractères"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="bv-oeil"
                aria-pressed={voir}
                aria-label={voir ? "Cacher le mot de passe" : "Voir le mot de passe"}
                onClick={() => setVoir((x) => !x)}
              >
                {voir ? "Cacher" : "Voir"}
              </button>
            </div>
          </div>

          <div className="bv-champ">
            <label htmlFor="bv-mdp2">Retape-le</label>
            <div className="bv-saisie">
              <input
                id="bv-mdp2"
                type={voir ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Le même"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
              />
            </div>
          </div>

          {formError && (
            <div className="bv-erreur" role="alert">
              <p>{formError}</p>
              {lienOubli && <a href="/forgot-password">Mot de passe oublié ? Recevoir un lien par email</a>}
            </div>
          )}

          <button type="submit" className="bv-cta" disabled={submitting}>
            {submitting ? "Création de ton accès…" : (
              <>
                Créer mon accès <span aria-hidden="true">→</span>
              </>
            )}
          </button>
        </form>
        <p className="bv-petit">
          Déjà un compte ? <a href="/forgot-password">Mot de passe oublié</a>
        </p>
      </main>
    </div>
  );
}
