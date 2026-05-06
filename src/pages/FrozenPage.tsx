// =============================================================================
// FrozenPage — ecran que voit un user dont le compte est gele (2026-05-06)
//
// Quand currentUser.frozenAt est NOT NULL, ProtectedRoute le redirige ici
// au lieu du dashboard. L'user voit :
//   - Logo patience.png au centre
//   - Titre "Compte temporairement en pause"
//   - Texte explicatif
//   - Textarea optionnel "Message a mon coach"
//   - Bouton "Demander la reactivation" -> INSERT dans unfreeze_requests
//
// L'admin voit ensuite la demande dans son dashboard et peut reactiver.
// =============================================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { useToast, buildSupabaseErrorToast } from "../context/ToastContext";
import { requestUnfreeze } from "../services/supabaseService";

export function FrozenPage() {
  const { currentUser, logout } = useAppContext();
  const { push: pushToast } = useToast();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await requestUnfreeze(message);
      pushToast({
        tone: "success",
        title: "Demande envoyée",
        message: "Ton coach va recevoir ta demande de réactivation.",
      });
      setSent(true);
    } catch (err) {
      pushToast(buildSupabaseErrorToast(err, "Impossible d'envoyer la demande pour le moment."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse at top left, rgba(16,185,129,0.06) 0%, transparent 50%), " +
          "radial-gradient(ellipse at bottom right, rgba(139,92,246,0.05) 0%, transparent 50%), " +
          "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px",
        fontFamily: "Inter, system-ui, sans-serif",
        color: "#0F172A",
      }}
    >
      <style>{`
        @keyframes frozen-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .frozen-anim { animation: none !important; }
        }
      `}</style>

      <div
        style={{
          width: "100%",
          maxWidth: 520,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28,
          textAlign: "center",
        }}
      >
        {/* Logo patience */}
        <img
          src="/brand/labase360/patience.png"
          alt="La Base 360 — Patience"
          className="frozen-anim"
          style={{
            width: 280,
            maxWidth: "100%",
            height: "auto",
            animation: "frozen-fade-up 600ms ease-out both",
          }}
        />

        {/* Heritage badge */}
        <span
          className="frozen-anim"
          style={{
            padding: "6px 18px",
            borderRadius: 100,
            background: "rgba(16,185,129,0.06)",
            border: "0.5px solid rgba(16,185,129,0.18)",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "#475569",
            animation: "frozen-fade-up 600ms ease-out 200ms both",
          }}
        >
          ★ Compte en pause ★
        </span>

        {/* Titre + texte */}
        <div className="frozen-anim" style={{ animation: "frozen-fade-up 600ms ease-out 400ms both" }}>
          <h1
            style={{
              fontFamily: "Sora, system-ui, sans-serif",
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              margin: 0,
              color: "#0F172A",
              lineHeight: 1.2,
            }}
          >
            {currentUser?.name ? `Bonjour ${currentUser.name.split(" ")[0]},` : "Bonjour,"}
          </h1>
          <h2
            style={{
              fontFamily: "Sora, system-ui, sans-serif",
              fontSize: 18,
              fontWeight: 500,
              margin: "8px 0 0",
              color: "#475569",
              lineHeight: 1.4,
            }}
          >
            ton accès est temporairement{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                fontWeight: 700,
                fontStyle: "italic",
              }}
            >
              en pause
            </span>
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "#475569",
              margin: "16px 0 0",
              lineHeight: 1.6,
              maxWidth: 440,
            }}
          >
            Ton coach a mis ton compte en pause. Si tu souhaites reprendre l'aventure La Base 360,
            envoie-lui un message ci-dessous — il recevra une notification et pourra réactiver
            ton accès.
          </p>
        </div>

        {/* Form ou confirmation */}
        {sent ? (
          <div
            className="frozen-anim"
            style={{
              width: "100%",
              padding: 20,
              borderRadius: 14,
              background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(6,182,212,0.06))",
              border: "1px solid rgba(16,185,129,0.25)",
              animation: "frozen-fade-up 400ms ease-out both",
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 8 }} aria-hidden="true">
              ✨
            </div>
            <h3 style={{ fontFamily: "Sora, system-ui, sans-serif", fontSize: 16, fontWeight: 600, margin: 0, color: "#0F172A" }}>
              Demande envoyée à ton coach
            </h3>
            <p style={{ fontSize: 13, color: "#475569", margin: "8px 0 0", lineHeight: 1.5 }}>
              Tu recevras un email dès que ton accès sera réactivé. À très vite !
            </p>
          </div>
        ) : (
          <div
            className="frozen-anim"
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 14,
              animation: "frozen-fade-up 600ms ease-out 600ms both",
            }}
          >
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message à mon coach (optionnel)…&#10;&#10;Ex : Je vais me reconnecter sérieusement, j'ai besoin de mon accès pour suivre mes clients."
              rows={4}
              style={{
                width: "100%",
                padding: "14px 16px",
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: 14,
                lineHeight: 1.5,
                color: "#0F172A",
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: 12,
                resize: "vertical",
                outline: "none",
                transition: "all 0.2s ease",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#10B981";
                e.currentTarget.style.background = "#FFFFFF";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#E2E8F0";
                e.currentTarget.style.background = "#F8FAFC";
              }}
            />
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting}
              style={{
                width: "100%",
                padding: "16px 20px",
                fontFamily: "Sora, system-ui, sans-serif",
                fontSize: 15,
                fontWeight: 600,
                color: "#FFFFFF",
                background: submitting
                  ? "#94A3B8"
                  : "linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%)",
                border: "none",
                borderRadius: 14,
                cursor: submitting ? "wait" : "pointer",
                boxShadow: submitting ? "none" : "0 4px 16px rgba(16,185,129,0.30)",
                transition: "all 0.2s ease",
                letterSpacing: 0.2,
              }}
              onMouseEnter={(e) => {
                if (!submitting) {
                  e.currentTarget.style.boxShadow = "0 6px 24px rgba(16,185,129,0.40)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                if (!submitting) {
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(16,185,129,0.30)";
                  e.currentTarget.style.transform = "translateY(0)";
                }
              }}
            >
              {submitting ? "Envoi…" : "Envoyer la demande de réactivation →"}
            </button>
          </div>
        )}

        {/* Logout discret en bas */}
        <button
          type="button"
          onClick={() => void handleLogout()}
          style={{
            marginTop: 12,
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 12,
            fontWeight: 500,
            color: "#94A3B8",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 8,
            textDecoration: "underline",
            textDecorationColor: "rgba(148,163,184,0.4)",
            textUnderlineOffset: 4,
          }}
        >
          Me déconnecter
        </button>

        {/* Footer */}
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            color: "#94A3B8",
            letterSpacing: "0.05em",
          }}
        >
          La Base 360 · Verdun · France
        </div>
      </div>
    </div>
  );
}
