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
import { MagicLinkFallback } from "../components/bienvenue/MagicLinkFallback";
import { InstallPwaInstructions } from "../components/pwa/InstallPwaInstructions";
import { InstallPwaTutorialModal } from "../components/pwa/InstallPwaTutorialModal";
import { isStandalonePwa } from "../lib/utils/detectDevice";
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
  // Hotfix client-login (2026-04-24) : étape intermédiaire "installe la
  // PWA" entre la création du compte et la redirection finale.
  const [installPromptStage, setInstallPromptStage] = useState<
    { redirectToken: string | null; firstName: string } | null
  >(null);

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

      // 4. Hotfix client-login (2026-04-24) : avant la redirection finale,
      //    si la PWA n'est PAS encore installée, on affiche une étape
      //    intermédiaire avec instructions. Déjà installée → navigate direct.
      const firstName = validation.status === "valid" ? validation.firstName : "toi";
      if (!isStandalonePwa()) {
        setInstallPromptStage({
          redirectToken: data.redirect_token ?? null,
          firstName,
        });
        return;
      }
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
    <div className="bienvenue-root">
      {/* Chantier Premium Onboarding (2026-04-24) : aligne BienvenuePage
          sur direction Welcome/Login. Mesh gradient + grain + stagger
          animations. */}
      <style>{`
        .bienvenue-root {
          min-height: 100vh;
          min-height: 100dvh;
          background: #0A0D0F;
          color: #F0EDE8;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 20px;
          position: relative;
          overflow: hidden;
          font-family: 'DM Sans', sans-serif;
        }
        .bienvenue-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          pointer-events: none;
          will-change: transform;
        }
        .bienvenue-blob-teal {
          top: -14%;
          left: -10%;
          width: 520px;
          height: 520px;
          background: radial-gradient(circle, #1D9E75 0%, transparent 70%);
          opacity: 0.35;
          animation: bienvenue-float-1 32s ease-in-out infinite alternate;
        }
        .bienvenue-blob-gold {
          bottom: -16%;
          right: -8%;
          width: 480px;
          height: 480px;
          background: radial-gradient(circle, #EF9F27 0%, transparent 70%);
          opacity: 0.3;
          animation: bienvenue-float-2 36s ease-in-out infinite alternate;
        }
        @keyframes bienvenue-float-1 {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(60px, 40px) scale(1.12); }
        }
        @keyframes bienvenue-float-2 {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(-70px, -30px) scale(1.1); }
        }
        .bienvenue-grain {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.06;
          mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
        }
        .bienvenue-inner {
          position: relative;
          z-index: 1;
          max-width: 460px;
          width: 100%;
          animation: bienvenue-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes bienvenue-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .bienvenue-blob-teal, .bienvenue-blob-gold, .bienvenue-inner { animation: none !important; }
        }
      `}</style>

      <div aria-hidden="true" className="bienvenue-blob bienvenue-blob-teal" />
      <div aria-hidden="true" className="bienvenue-blob bienvenue-blob-gold" />
      <div aria-hidden="true" className="bienvenue-grain" />

      <div className="bienvenue-inner">
        {installPromptStage ? (
          <InstallPwaStep
            firstName={installPromptStage.firstName}
            clientPhone={null}
            onContinue={() => {
              const redirect = installPromptStage.redirectToken
                ? `/client/${installPromptStage.redirectToken}?welcome=1`
                : `/login?welcome=1`;
              navigate(redirect, { replace: true });
            }}
          />
        ) : validation.status === "loading" ? (
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

function InstallPwaStep({
  firstName,
  onContinue,
  clientPhone,
}: {
  firstName: string;
  onContinue: () => void;
  clientPhone?: string | null;
}) {
  // V2 (2026-04-30) : ajout tuto modale pas-a-pas avec illustrations SVG.
  // Mendy a galere a installer la PWA — ce tuto guide visuellement.
  const [showTutorial, setShowTutorial] = useState(false);
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(201,168,76,0.3)",
        borderRadius: 22,
        padding: 28,
        color: "#F4E9CF",
      }}
    >
      <div
        style={{
          fontFamily: "Syne, sans-serif",
          fontSize: 26,
          fontWeight: 700,
          color: "#FDECC0",
          lineHeight: 1.15,
          marginBottom: 10,
        }}
      >
        C'est bon {firstName}, ton accès est créé ! 🎉
      </div>
      <p
        style={{
          fontSize: 14,
          lineHeight: 1.6,
          opacity: 0.9,
          marginBottom: 22,
        }}
      >
        Une dernière étape pour un accès rapide :{" "}
        <strong>installe l'app sur ton téléphone</strong>. Comme ça, tu la
        retrouves en 1 clic, comme une vraie appli.
      </p>

      {/* CTA tuto guide visuel (V2 2026-04-30) — recommande pour les
          users qui ne savent pas installer une PWA */}
      <button
        type="button"
        onClick={() => setShowTutorial(true)}
        style={{
          width: "100%",
          padding: "14px 18px",
          marginBottom: 14,
          borderRadius: 14,
          border: "0.5px solid rgba(255,255,255,0.30)",
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 100%)",
          color: "#FDECC0",
          fontFamily: "DM Sans, sans-serif",
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          transition: "transform 0.15s ease, background 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.background =
            "linear-gradient(135deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.12) 100%)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "none";
          e.currentTarget.style.background =
            "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 100%)";
        }}
      >
        🎬 Voir le tuto guidé pas-à-pas
      </button>
      {showTutorial && (
        <InstallPwaTutorialModal
          open={true}
          onClose={() => setShowTutorial(false)}
          firstName={firstName}
        />
      )}

      <div
        style={{
          background: "#FFFFFF",
          color: "#111827",
          borderRadius: 16,
          padding: 22,
          marginBottom: 20,
        }}
      >
        <InstallPwaInstructions compact />
      </div>

      <button
        type="button"
        onClick={onContinue}
        style={{
          width: "100%",
          padding: "14px 20px",
          borderRadius: 14,
          background: "linear-gradient(135deg, #D4B460, #C9A84C)",
          color: "#0B0D11",
          border: "none",
          fontFamily: "Syne, sans-serif",
          fontWeight: 700,
          fontSize: 16,
          cursor: "pointer",
          letterSpacing: 0.3,
          boxShadow: "0 8px 24px rgba(201,168,76,0.25)",
        }}
      >
        J'ai installé, c'est parti !
      </button>
      <button
        type="button"
        onClick={onContinue}
        style={{
          marginTop: 12,
          width: "100%",
          padding: "10px 14px",
          borderRadius: 10,
          background: "transparent",
          color: "rgba(244,233,207,0.65)",
          border: "none",
          fontFamily: "DM Sans, sans-serif",
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        Je ferai ça plus tard
      </button>

      {/* Chantier Welcome Page + Magic Links (2026-04-24) : filet de
          sécurité WhatsApp pour se reconnecter 24h si l'install PWA
          rate ou le client change d'appareil. */}
      <MagicLinkFallback firstName={firstName} clientPhone={clientPhone} />
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
