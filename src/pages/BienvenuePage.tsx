// Chantier Lien d'invitation client app (2026-04-21) — commit 4/5.
//
// Route publique /bienvenue?token=XYZ. Le client atterrit ici depuis le
// WhatsApp/SMS envoyé par son coach. Flow :
//   1. Lit ?token, call Edge Function validate-invitation-token.
//   2. Si invalide/expiré/consommé → message clair.
//   3. Si valide :
//      - Cas A (email en fiche) → form direct mot de passe + confirm.
//      - Cas B (pas d'email) → ExplainerModal bloquante, puis form
//        email + mot de passe + confirm.
//   4. Submit → call Edge Function consume-invitation-token avec
//      { token, password, email? }. Gère l'auto-login (setSession) puis
//      redirige vers /client/{redirect_token} avec un flag ?welcome=1
//      pour déclencher le toast sur ClientAppPage.
//
// Design volontairement grand, chaleureux, sans jargon : le public est
// non-tech.

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExplainerModal } from "../components/bienvenue/ExplainerModal";
import { getSupabaseClient } from "../services/supabaseClient";

type ValidationState =
  | { status: "loading" }
  | {
      status: "valid";
      firstName: string;
      coachFirstName: string;
      hasEmailOnRecord: boolean;
    }
  | { status: "invalid"; message: string };

export function BienvenuePage() {
  const navigate = useNavigate();
  const [token, setToken] = useState<string>("");
  const [validation, setValidation] = useState<ValidationState>({ status: "loading" });
  const [showExplainer, setShowExplainer] = useState(false);

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string>("");

  // 1. Parse token from URL + validate.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = (params.get("token") ?? "").trim();
    if (!t) {
      setValidation({
        status: "invalid",
        message:
          "Lien incomplet. Demande à ton coach un nouveau lien d'accès.",
      });
      return;
    }
    setToken(t);

    void (async () => {
      const sb = await getSupabaseClient();
      if (!sb) {
        setValidation({
          status: "invalid",
          message: "Service momentanément indisponible. Réessaie dans quelques minutes.",
        });
        return;
      }

      const { data, error } = await sb.functions.invoke("validate-invitation-token", {
        body: { token: t },
      });

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
        firstName: data.client_first_name ?? "toi",
        coachFirstName: data.coach_first_name ?? "Ton coach",
        hasEmailOnRecord: Boolean(data.has_email_on_record),
      });
      // Cas B : ouvrir la pop-up d'explication avant tout.
      if (!data.has_email_on_record) {
        setShowExplainer(true);
      }
    })();
  }, []);

  // 2. Submit form.
  const handleSubmit = useCallback(async () => {
    if (validation.status !== "valid") return;
    setFormError("");

    if (password.length < 6) {
      setFormError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (password !== passwordConfirm) {
      setFormError("Les 2 mots de passe ne sont pas identiques.");
      return;
    }
    if (!validation.hasEmailOnRecord) {
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setFormError("L'adresse email saisie n'a pas l'air valide.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) {
        setFormError("Service indisponible. Réessaie dans quelques minutes.");
        return;
      }

      const { data, error } = await sb.functions.invoke("consume-invitation-token", {
        body: {
          token,
          password,
          email: validation.hasEmailOnRecord ? undefined : email.trim().toLowerCase(),
        },
      });

      if (error || !data?.success) {
        const msg =
          (data?.error as string | undefined) ??
          error?.message ??
          "Impossible de créer ton accès pour le moment.";
        setFormError(msg);
        return;
      }

      // 3. Auto-login si on a reçu les tokens.
      if (data.access_token && data.refresh_token) {
        try {
          await sb.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
          });
        } catch {
          // Non bloquant : on redirige quand même.
        }
      }

      // 4. Redirect vers ClientAppPage (existing magic-link UI) avec flag
      //    welcome=1 pour afficher un toast.
      if (data.redirect_token) {
        navigate(`/client/${data.redirect_token}?welcome=1`, { replace: true });
      } else {
        navigate(`/login?welcome=1`, { replace: true });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inattendue.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  }, [email, navigate, password, passwordConfirm, token, validation]);

  // ─── Rendu ───────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0B0D11 0%, #131A2A 100%)",
        color: "#F4E9CF",
        padding: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      <div style={{ maxWidth: 440, width: "100%" }}>
        {validation.status === "loading" ? (
          <p style={{ textAlign: "center", opacity: 0.8 }}>Vérification du lien…</p>
        ) : validation.status === "invalid" ? (
          <InvalidCard message={validation.message} />
        ) : (
          <>
            {showExplainer && !validation.hasEmailOnRecord ? (
              <ExplainerModal
                firstName={validation.firstName}
                onClose={() => setShowExplainer(false)}
              />
            ) : null}

            <p
              style={{
                fontFamily: "Syne, sans-serif",
                fontSize: 32,
                fontWeight: 700,
                color: "#FDECC0",
                marginBottom: 8,
                lineHeight: 1.15,
              }}
            >
              🎉 Bienvenue {validation.firstName} !
            </p>
            <p
              style={{
                fontSize: 16,
                lineHeight: 1.6,
                opacity: 0.88,
                marginBottom: 26,
              }}
            >
              {validation.coachFirstName} t'a préparé ton espace personnel.{" "}
              {validation.hasEmailOnRecord
                ? "Choisis un mot de passe pour y accéder."
                : "On va créer ton compte en 30 secondes."}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {!validation.hasEmailOnRecord ? (
                <FieldLarge
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="exemple@email.com"
                  autoComplete="email"
                />
              ) : null}

              <FieldLarge
                label="Mot de passe"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="Au moins 6 caractères"
                autoComplete="new-password"
              />

              <FieldLarge
                label="Confirme ton mot de passe"
                type="password"
                value={passwordConfirm}
                onChange={setPasswordConfirm}
                placeholder="Retape le même"
                autoComplete="new-password"
              />

              {formError ? (
                <p
                  style={{
                    background: "rgba(251,113,133,0.12)",
                    border: "1px solid rgba(251,113,133,0.3)",
                    color: "#FBBFC8",
                    padding: "12px 14px",
                    borderRadius: 12,
                    fontSize: 14,
                    lineHeight: 1.5,
                  }}
                >
                  {formError}
                </p>
              ) : null}

              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting}
                style={{
                  marginTop: 8,
                  padding: "18px 20px",
                  borderRadius: 14,
                  background: submitting
                    ? "rgba(201,168,76,0.4)"
                    : "linear-gradient(135deg, #D4B460, #C9A84C)",
                  color: "#0B0D11",
                  border: "none",
                  fontFamily: "Syne, sans-serif",
                  fontWeight: 700,
                  fontSize: 17,
                  cursor: submitting ? "default" : "pointer",
                  letterSpacing: 0.3,
                  boxShadow: submitting ? "none" : "0 10px 30px rgba(201,168,76,0.35)",
                }}
              >
                {submitting ? "Création…" : "Créer mon accès"}
              </button>

              <p
                style={{
                  fontSize: 12,
                  color: "rgba(244,233,207,0.55)",
                  textAlign: "center",
                  marginTop: 10,
                  lineHeight: 1.5,
                }}
              >
                Tes infos sont protégées. Seul toi et {validation.coachFirstName}{" "}
                y avez accès.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function InvalidCard({ message }: { message: string }) {
  return (
    <div
      style={{
        background: "rgba(251,113,133,0.08)",
        border: "1px solid rgba(251,113,133,0.3)",
        borderRadius: 18,
        padding: 24,
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontFamily: "Syne, sans-serif",
          fontSize: 22,
          fontWeight: 700,
          color: "#FBBFC8",
          marginBottom: 10,
        }}
      >
        Lien non valide
      </p>
      <p style={{ fontSize: 15, lineHeight: 1.6, color: "#FBBFC8cc" }}>{message}</p>
    </div>
  );
}

function FieldLarge({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: "rgba(244,233,207,0.8)",
          letterSpacing: 0.3,
        }}
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={{
          padding: "16px 16px",
          borderRadius: 12,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(201,168,76,0.22)",
          color: "#F4E9CF",
          fontSize: 16,
          fontFamily: "DM Sans, sans-serif",
          outline: "none",
        }}
      />
    </label>
  );
}
