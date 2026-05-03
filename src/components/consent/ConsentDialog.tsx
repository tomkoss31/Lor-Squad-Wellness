// ConsentDialog (RGPD Phase 1 — 2026-04-30)
// Modale obligatoire au 1er bilan d'un client. Le coach atteste avoir
// informe son client·e du traitement de ses donnees de sante (art. 9 RGPD)
// et que celui·celle-ci y consent. Insert dans client_consents (1 row /
// client, immutable).
//
// Pattern visuel : reutilise notre charte premium (gradient gold header,
// theme-aware var(--ls-*), shake anim sur erreur, ESC + body lock + click
// outside, hover lift sur boutons).

import { useEffect, useRef, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { getSupabaseClient } from "../../services/supabaseClient";
import type { Client } from "../../types/domain";

interface Props {
  client: Client;
  open: boolean;
  onConsented: () => void;
  onCancel: () => void;
  /**
   * Si true (defaut false) : ne fait PAS l'INSERT DB, callback uniquement.
   * Utilise dans NewAssessmentPage ou le client n'existe pas encore en DB
   * (creation au save). Le caller doit faire l'INSERT lui-meme apres avoir
   * obtenu le clientId.
   */
  skipDbInsert?: boolean;
}

/**
 * Helper expose pour insert manuel apres creation client (NewAssessmentPage).
 * A appeler dans handleSaveAssessment apres createClientWithInitialAssessment
 * qui retourne le clientId.
 */
export async function recordConsentInsert(params: {
  clientId: string;
  coachId: string;
}): Promise<void> {
  try {
    const sb = await getSupabaseClient();
    if (!sb) return;
    const { error } = await sb.from("client_consents").insert({
      client_id: params.clientId,
      coach_id: params.coachId,
      consent_version: "v1",
      user_agent:
        typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 200) : null,
    });
    if (error && error.code !== "23505") {
      console.warn("[recordConsentInsert] failed:", error.message);
    }
  } catch (err) {
    console.warn("[recordConsentInsert] exception:", err);
  }
}

export function ConsentDialog({ client, open, onConsented, onCancel, skipDbInsert = false }: Props) {
  const { currentUser } = useAppContext();
  const [checked, setChecked] = useState(false);
  const [showError, setShowError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const checkboxRef = useRef<HTMLDivElement>(null);

  // Reset state a chaque ouverture
  useEffect(() => {
    if (open) {
      setChecked(false);
      setShowError(false);
    }
  }, [open]);

  // ESC + body scroll lock
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onCancel();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onCancel, submitting]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!checked) {
      setShowError(true);
      checkboxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!currentUser?.id) {
      console.warn("[ConsentDialog] no currentUser, cannot submit");
      return;
    }

    setSubmitting(true);
    try {
      // Mode deferred (NewAssessmentPage) : pas d'INSERT, juste callback.
      // Le caller fera l'INSERT apres avoir cree le client.
      if (skipDbInsert) {
        onConsented();
        return;
      }
      const sb = await getSupabaseClient();
      if (!sb) {
        console.warn("[ConsentDialog] supabase unavailable, continuing anyway");
        onConsented();
        return;
      }
      const { error } = await sb.from("client_consents").insert({
        client_id: client.id,
        coach_id: currentUser.id,
        consent_version: "v1",
        user_agent:
          typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 200) : null,
      });

      if (error) {
        // 23505 = duplicate (deja consenti) → OK on continue
        if (error.code !== "23505") {
          console.error("[ConsentDialog] insert failed:", error);
        }
      }
      onConsented();
    } catch (err) {
      console.error("[ConsentDialog] unexpected:", err);
      // En cas d'erreur reseau, on continue quand meme pour ne pas bloquer
      onConsented();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes ls-consent-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ls-consent-slide-up {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ls-consent-shine {
          0%, 100% { transform: translateX(-30%); opacity: 0; }
          50%      { transform: translateX(180%); opacity: 0.40; }
        }
        @keyframes ls-consent-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
        .ls-consent-overlay { animation: ls-consent-fade-in 0.18s ease-out; }
        .ls-consent-panel   { animation: ls-consent-slide-up 0.32s cubic-bezier(0.22,1,0.36,1); }
        .ls-consent-shake   { animation: ls-consent-shake 0.4s; }
        @media (prefers-reduced-motion: reduce) {
          .ls-consent-overlay, .ls-consent-panel, .ls-consent-shake { animation: none !important; }
        }
      `}</style>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events -- Backdrop, ESC handled at dialog level */}
      <div
        className="ls-consent-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ls-consent-title"
        onClick={(e) => {
          if (e.target === e.currentTarget && !submitting) onCancel();
        }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10000,
          background: "color-mix(in srgb, var(--ls-bg) 80%, transparent)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        <div
          className="ls-consent-panel"
          style={{
            background: "var(--ls-surface)",
            border: "0.5px solid color-mix(in srgb, var(--ls-gold) 30%, var(--ls-border))",
            borderRadius: 22,
            width: "100%",
            maxWidth: 560,
            maxHeight: "calc(100vh - 32px)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 24px 64px -16px rgba(0,0,0,0.40), 0 1px 0 0 rgba(239,159,39,0.20)",
          }}
        >
          {/* HEADER GRADIENT GOLD */}
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              padding: "20px 24px 18px",
              background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 60%, #5C3A05 100%)",
              color: "#FFFFFF",
              flexShrink: 0,
            }}
          >
            <div
              aria-hidden
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                height: "100%",
                width: "30%",
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.40), transparent)",
                animation: "ls-consent-shine 6s ease-in-out infinite",
                pointerEvents: "none",
              }}
            />
            <div style={{ position: "relative" }}>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: 1.6,
                  textTransform: "uppercase",
                  fontWeight: 800,
                  color: "rgba(255,255,255,0.90)",
                  marginBottom: 4,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span aria-hidden>🛡️</span> Consentement RGPD requis
              </div>
              <h2
                id="ls-consent-title"
                style={{
                  fontFamily: "Syne, serif",
                  fontWeight: 800,
                  fontSize: 22,
                  letterSpacing: "-0.02em",
                  margin: 0,
                  textShadow: "0 1px 2px rgba(0,0,0,0.18)",
                }}
              >
                Avant le 1er bilan de {client.firstName}
              </h2>
            </div>
          </div>

          {/* BODY scrollable */}
          <div style={{ overflow: "auto", padding: "20px 24px", flex: 1 }}>
            {/* Encart Note coach (teal) */}
            <div
              style={{
                background: "color-mix(in srgb, var(--ls-teal) 10%, transparent)",
                border: "0.5px solid color-mix(in srgb, var(--ls-teal) 35%, transparent)",
                borderLeft: "3px solid var(--ls-teal)",
                borderRadius: 12,
                padding: "12px 14px",
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: 1.4,
                  textTransform: "uppercase",
                  fontWeight: 700,
                  color: "var(--ls-teal)",
                  marginBottom: 6,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span aria-hidden>👋</span> Note pour toi coach
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "var(--ls-text)",
                  lineHeight: 1.55,
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                Avant de remplir ce premier bilan, lis le texte ci-dessous à ton client·e. Tu certifies en cochant que tu lui as transmis cette information et qu'il/elle accepte expressément le traitement de ses données de santé.
              </p>
            </div>

            {/* Texte legal client */}
            <h3
              style={{
                fontFamily: "Syne, serif",
                fontSize: 17,
                fontWeight: 700,
                color: "var(--ls-text)",
                margin: "0 0 10px 0",
                letterSpacing: "-0.01em",
              }}
            >
              Information sur le traitement de tes données de santé
            </h3>
            <p
              style={{
                fontSize: 13,
                color: "var(--ls-text-muted)",
                lineHeight: 1.6,
                margin: "0 0 12px 0",
              }}
            >
              Dans le cadre de ton accompagnement bien-être avec ton coach Herbalife indépendant via l'application{" "}
              <strong style={{ color: "var(--ls-text)" }}>Lor'Squad Wellness</strong>, des données dites «{" "}
              <strong style={{ color: "var(--ls-text)" }}>de santé</strong> » sont collectées : poids, masse grasse, hydratation, mensurations, body scan.
            </p>
            <p
              style={{
                fontSize: 13,
                color: "var(--ls-text-muted)",
                lineHeight: 1.6,
                margin: "0 0 12px 0",
              }}
            >
              Ces données relèvent de l'<strong style={{ color: "var(--ls-text)" }}>article 9 du RGPD</strong> (catégorie particulière) et ne peuvent être traitées qu'avec ton consentement explicite. Elles sont utilisées <strong style={{ color: "var(--ls-text)" }}>uniquement</strong> pour personnaliser ton suivi, recommander des produits Herbalife adaptés, et mesurer ton évolution.
            </p>
            <ul
              style={{
                fontSize: 13,
                color: "var(--ls-text-muted)",
                lineHeight: 1.65,
                paddingLeft: 18,
                margin: "0 0 14px 0",
              }}
            >
              <li>
                <strong style={{ color: "var(--ls-text)" }}>Hébergement</strong> : Supabase, en Irlande (UE) — eu-west-1
              </li>
              <li>
                <strong style={{ color: "var(--ls-text)" }}>Destinataires</strong> : ton coach et son sponsor direct uniquement
              </li>
              <li>
                <strong style={{ color: "var(--ls-text)" }}>Durée de conservation</strong> : 3 ans après ta dernière activité
              </li>
              <li>
                <strong style={{ color: "var(--ls-text)" }}>Tes droits</strong> : accès, rectification, effacement, retrait à tout moment
              </li>
              <li>
                <strong style={{ color: "var(--ls-text)" }}>Contact</strong> : labaseverdun@gmail.com (SAS HTM FITLIFE)
              </li>
            </ul>
            <p
              style={{
                fontSize: 11.5,
                color: "var(--ls-text-hint)",
                lineHeight: 1.5,
                margin: "12px 0 18px 0",
                fontStyle: "italic",
                padding: "8px 12px",
                background: "var(--ls-surface2)",
                borderRadius: 8,
                border: "0.5px dashed var(--ls-border)",
              }}
            >
              ⚠️ Lor'Squad Wellness n'est pas un service médical. Les conseils prodigués par ton coach Herbalife indépendant ne remplacent pas un avis professionnel de santé.
            </p>

            {/* Case a cocher (audit a11y 2026-04-30 : role checkbox + keyboard) */}
            <div
              ref={checkboxRef}
              role="checkbox"
              aria-checked={checked}
              tabIndex={0}
              className={showError ? "ls-consent-shake" : ""}
              onClick={() => {
                setChecked((v) => !v);
                setShowError(false);
              }}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  setChecked((v) => !v);
                  setShowError(false);
                }
              }}
              style={{
                padding: "14px 16px",
                background: showError
                  ? "color-mix(in srgb, var(--ls-coral) 10%, transparent)"
                  : checked
                    ? "color-mix(in srgb, var(--ls-gold) 10%, transparent)"
                    : "var(--ls-surface2)",
                border: showError
                  ? "1.5px solid var(--ls-coral)"
                  : checked
                    ? "1.5px solid var(--ls-gold)"
                    : "0.5px solid var(--ls-border)",
                borderRadius: 12,
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  minWidth: 22,
                  borderRadius: 6,
                  border: `2px solid ${checked ? "var(--ls-gold)" : "var(--ls-text-hint)"}`,
                  background: checked ? "var(--ls-gold)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s ease",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                {checked && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <div style={{ flex: 1, fontSize: 13.5, color: "var(--ls-text)", lineHeight: 1.5 }}>
                <strong>Je certifie</strong> que mon client·e{" "}
                <strong>
                  {client.firstName} {client.lastName}
                </strong>{" "}
                a été informé·e du traitement de ses données de santé conformément au texte ci-dessus, et qu'il/elle{" "}
                <strong>y consent expressément</strong>.
              </div>
            </div>

            {showError && (
              <p
                style={{
                  margin: "10px 0 0 0",
                  fontSize: 12.5,
                  color: "var(--ls-coral)",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span aria-hidden>⚠️</span> Merci de cocher la case pour continuer.
              </p>
            )}
          </div>

          {/* FOOTER actions */}
          <div
            style={{
              padding: "14px 24px 16px",
              borderTop: "0.5px solid var(--ls-border)",
              background: "color-mix(in srgb, var(--ls-gold) 4%, var(--ls-surface))",
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              style={{
                padding: "11px 18px",
                borderRadius: 999,
                border: "0.5px solid var(--ls-border)",
                background: "var(--ls-surface)",
                color: "var(--ls-text-muted)",
                fontFamily: "DM Sans, sans-serif",
                fontSize: 13,
                fontWeight: 600,
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.5 : 1,
                transition: "transform 0.15s ease, border-color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (!submitting) {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.borderColor = "var(--ls-text-hint)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.borderColor = "var(--ls-border)";
              }}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting}
              style={{
                padding: "11px 22px",
                borderRadius: 999,
                border: "none",
                background: checked
                  ? "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)"
                  : "var(--ls-surface2)",
                color: checked ? "#FFFFFF" : "var(--ls-text-hint)",
                fontFamily: "DM Sans, sans-serif",
                fontSize: 13,
                fontWeight: 700,
                cursor: submitting || !checked ? "not-allowed" : "pointer",
                boxShadow: checked
                  ? "0 6px 16px -4px rgba(186,117,23,0.45), inset 0 1px 0 rgba(255,255,255,0.20)"
                  : "none",
                transition: "transform 0.15s ease, filter 0.15s ease",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                letterSpacing: "-0.005em",
              }}
              onMouseEnter={(e) => {
                if (checked && !submitting) {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.filter = "brightness(1.08)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.filter = "none";
              }}
            >
              {submitting ? "Enregistrement…" : "Continuer le bilan"}
              {!submitting && <span aria-hidden style={{ fontSize: 14 }}>→</span>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
