import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";

// Inscription newsletter — bloc monté en 4e colonne du footer (ClubShell).
// Anti-spam : honeypot `site` (champ caché ; si rempli = bot → faux succès sans
// envoi). Validation email + consentement côté client PUIS côté edge. 4 états.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
type State = "open" | "sending" | "success" | "error";

const inputStyle: CSSProperties = {
  width: "100%",
  minHeight: 44,
  padding: "11px 14px",
  borderRadius: 12,
  border: "1px solid rgba(244,239,228,.24)",
  background: "rgba(244,239,228,.06)",
  color: "#fff",
  fontSize: 15,
  fontFamily: "inherit",
};

export function ClubNewsletter() {
  const [state, setState] = useState<State>("open");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    // ⚠ Le champ s'appelait « site » : c'est une catégorie que le remplissage
    // automatique des navigateurs reconnaît et remplit tout seul. Le piège se
    // déclenchait donc sur des humains — et ici il affiche un FAUX SUCCÈS :
    // la personne croyait s'être inscrite et ne recevait jamais rien, sans que
    // personne puisse s'en apercevoir. Même défaut trouvé le 13/08 sur la
    // caisse du club, où il empêchait purement et simplement de payer.
    const honeypot = (form.elements.namedItem("bc_hp") as HTMLInputElement | null)?.value ?? "";
    if (honeypot) {
      setState("success");
      return;
    }
    const email = ((form.elements.namedItem("email") as HTMLInputElement).value || "").trim();
    const consent = (form.elements.namedItem("consent") as HTMLInputElement).checked;
    if (!EMAIL_RE.test(email) || !consent) {
      setState("error");
      return;
    }
    setState("sending");
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("service indisponible");
      const { data, error } = await sb.functions.invoke("submit-newsletter", {
        body: { email, consent: true, source: "newsletter-club" },
      });
      if (error || !(data as { success?: boolean } | null)?.success) throw new Error("échec");
      setState("success");
    } catch {
      setState("error");
    }
  }

  return (
    <div>
      <div className="k">Newsletter</div>
      {state === "success" ? (
        <p style={{ color: "var(--yellow)", fontSize: 15, lineHeight: 1.6, margin: 0 }}>
          C'est noté, à très vite.
        </p>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <p style={{ color: "var(--on-dark-2)", fontSize: 15, lineHeight: 1.6, margin: "0 0 12px" }}>
            Un message par mois. Aucun spam, désinscription en un clic.
          </p>
          {/* Piège à robots — invisible pour l'humain, ignoré du lecteur d'écran.
              Nom volontairement dénué de sens : « site », « email », « tel »…
              sont des catégories que le remplissage automatique reconnaît. */}
          <input
            type="text"
            name="bc_hp"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
          />
          <input
            type="email"
            name="email"
            required
            placeholder="ton@email.fr"
            aria-label="Ton adresse email"
            style={inputStyle}
          />
          <label
            style={{
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
              margin: "10px 0",
              fontSize: 13,
              color: "var(--on-dark-3)",
              lineHeight: 1.5,
            }}
          >
            <input
              type="checkbox"
              name="consent"
              required
              style={{ marginTop: 3, flex: "none", accentColor: "var(--orange)" }}
            />
            <span>J'accepte de recevoir la newsletter du club par email.</span>
          </label>
          <button
            type="submit"
            className="cl-cta"
            disabled={state === "sending"}
            style={{ width: "100%", minHeight: 46, opacity: state === "sending" ? 0.7 : 1 }}
          >
            {state === "sending" ? "Envoi en cours…" : "Je m'inscris"}
          </button>
          {state === "error" ? (
            <p style={{ color: "#ffb4a2", fontSize: 13, margin: "10px 0 0" }}>
              Vérifie ton email et la case de consentement.
            </p>
          ) : null}
        </form>
      )}
    </div>
  );
}
