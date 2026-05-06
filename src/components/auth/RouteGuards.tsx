import { useEffect, useState } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { hasRequiredRole } from "../../lib/auth";
import type { UserRole } from "../../types/domain";

export function ProtectedRoute() {
  const { authReady, currentUser } = useAppContext();

  if (!authReady) {
    return <AuthBootSplash />;
  }

  if (!currentUser) {
    // Chantier Welcome Page (2026-04-24) : /welcome est la porte d'entrée
    // publique (identifie Client / Distri / Prospect). /login reste
    // accessible directement pour ceux qui savent déjà.
    return <Navigate to="/welcome" replace />;
  }

  return <Outlet />;
}

export function PublicRoute() {
  const { authReady, currentUser } = useAppContext();

  if (!authReady) {
    return <AuthBootSplash />;
  }

  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export function RoleRoute({ allowedRoles }: { allowedRoles: UserRole[] }) {
  const { authReady, currentUser } = useAppContext();

  if (!authReady) {
    return <AuthBootSplash />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!hasRequiredRole(currentUser, allowedRoles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

// =============================================================================
// AuthBootSplash — Splash screen premium La Base 360 (rebrand 2026-05-05)
//
// Identite visuelle :
//   - Orbe app-icon-512.svg au centre avec glow G3 pulsant (emerald/cyan/violet)
//   - Ring de chargement gradient qui tourne autour
//   - Tagline + heritage "★ Since 2022 ★" en Sora/Inter
//   - Animation entry sequentielle (orbe -> texte -> tagline)
//   - Bouton recovery apres 5s en mode discret
// =============================================================================
function AuthBootSplash() {
  const { forceResetSession } = useAppContext();
  const navigate = useNavigate();
  const [showRecovery, setShowRecovery] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowRecovery(true), 5000);
    return () => window.clearTimeout(timer);
  }, []);

  async function handleRecovery() {
    await forceResetSession();
    navigate("/login", { replace: true });
  }

  return (
    <>
      <style>{`
        @keyframes lb360-orb-breathe {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 24px rgba(16,185,129,0.45)) drop-shadow(0 0 48px rgba(6,182,212,0.30)); }
          50% { transform: scale(1.05); filter: drop-shadow(0 0 36px rgba(16,185,129,0.65)) drop-shadow(0 0 72px rgba(139,92,246,0.40)); }
        }
        @keyframes lb360-ring-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes lb360-glow-pulse {
          0%, 100% { opacity: 0.35; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.15); }
        }
        @keyframes lb360-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lb360-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes lb360-stars-twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .lb360-anim { animation: none !important; }
        }
      `}</style>
      <div
        style={{
          minHeight: "100vh",
          background: "radial-gradient(ellipse at top, rgba(16,185,129,0.08) 0%, transparent 50%), radial-gradient(ellipse at bottom right, rgba(139,92,246,0.07) 0%, transparent 50%), #0B0D11",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 20px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow ambient G3 derriere tout */}
        <div
          aria-hidden="true"
          className="lb360-anim"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 600,
            height: 600,
            background: "radial-gradient(circle, rgba(16,185,129,0.15) 0%, rgba(6,182,212,0.10) 35%, transparent 70%)",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            animation: "lb360-glow-pulse 4s ease-in-out infinite",
          }}
        />

        {/* Container central */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 32,
          }}
        >
          {/* Orbe + Ring rotatif */}
          <div style={{ position: "relative", width: 180, height: 180 }}>
            {/* Ring gradient qui tourne */}
            <div
              aria-hidden="true"
              className="lb360-anim"
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background: "conic-gradient(from 0deg, transparent 0%, rgba(16,185,129,0.6) 25%, rgba(6,182,212,0.7) 50%, rgba(139,92,246,0.6) 75%, transparent 100%)",
                animation: "lb360-ring-rotate 3s linear infinite",
                padding: 2,
                opacity: 0.85,
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  background: "#0B0D11",
                }}
              />
            </div>

            {/* Logo orbe au centre */}
            <img
              src="/brand/labase360/app-icon-512.svg"
              alt="La Base 360"
              className="lb360-anim"
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 140,
                height: 140,
                borderRadius: 28,
                animation: "lb360-orb-breathe 3s ease-in-out infinite",
                willChange: "transform",
              }}
            />
          </div>

          {/* Heritage badge */}
          <div
            className="lb360-anim"
            style={{
              padding: "6px 18px",
              borderRadius: 100,
              background: "rgba(255,255,255,0.04)",
              border: "0.5px solid rgba(255,255,255,0.10)",
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: "rgba(240,237,232,0.6)",
              animation: "lb360-fade-up 600ms ease-out 200ms both",
              backdropFilter: "blur(8px)",
            }}
          >
            ★ Since 2022 ★
          </div>

          {/* Brand name */}
          <div
            className="lb360-anim"
            style={{
              textAlign: "center",
              animation: "lb360-fade-up 600ms ease-out 400ms both",
            }}
          >
            <h1
              style={{
                fontFamily: "Sora, system-ui, sans-serif",
                fontSize: 42,
                fontWeight: 700,
                color: "#F0EDE8",
                margin: 0,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              La Base{" "}
              <span
                style={{
                  fontStyle: "italic",
                  fontWeight: 400,
                  background: "linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  display: "inline-block",
                  paddingRight: 6,
                }}
              >
                360
              </span>
            </h1>
            <p
              style={{
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: 14,
                color: "rgba(240,237,232,0.55)",
                margin: "10px 0 0",
                fontWeight: 400,
              }}
            >
              The wellness nutrition club
            </p>
          </div>

          {/* Sub-message contextuel */}
          <div
            className="lb360-anim"
            style={{
              textAlign: "center",
              animation: "lb360-fade-in 800ms ease-out 800ms both",
              maxWidth: 320,
              marginTop: 8,
            }}
          >
            <p
              style={{
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: 13,
                color: "rgba(240,237,232,0.45)",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Ouverture de ta session…
            </p>
          </div>

          {/* Recovery button (after 5s) */}
          {showRecovery ? (
            <div
              className="lb360-anim"
              style={{
                marginTop: 16,
                textAlign: "center",
                animation: "lb360-fade-up 400ms ease-out both",
                maxWidth: 320,
              }}
            >
              <p
                style={{
                  fontFamily: "Inter, system-ui, sans-serif",
                  fontSize: 12,
                  color: "rgba(240,237,232,0.4)",
                  marginBottom: 10,
                  lineHeight: 1.5,
                }}
              >
                Ça prend plus de temps que prévu ?
              </p>
              <button
                type="button"
                onClick={() => void handleRecovery()}
                style={{
                  fontFamily: "Inter, system-ui, sans-serif",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "rgba(240,237,232,0.75)",
                  background: "rgba(255,255,255,0.04)",
                  border: "0.5px solid rgba(255,255,255,0.12)",
                  padding: "10px 20px",
                  borderRadius: 100,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  backdropFilter: "blur(8px)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.color = "#F0EDE8";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  e.currentTarget.style.color = "rgba(240,237,232,0.75)";
                }}
              >
                Revenir à la connexion
              </button>
            </div>
          ) : null}
        </div>

        {/* Footer discret en bas */}
        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 10,
            color: "rgba(240,237,232,0.25)",
            letterSpacing: "0.1em",
          }}
        >
          Verdun · France
        </div>
      </div>
    </>
  );
}
