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

  // Chantier freeze 2026-05-06 : si compte gele, redirige sur /frozen.
  // L'admin n'est jamais frozen (clause id <> v_caller dans freeze_user RPC).
  if (currentUser.frozenAt) {
    return <Navigate to="/frozen" replace />;
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
// AuthBootSplash — Splash screen La Base 360 (rebrand 2026-05-06 v2)
//
// Refonte v2 : utilise directement le logo OFFICIEL patience.png (orbe +
// cercle + B + Since 2022 + La Base 360 + tagline) au centre avec un glow
// G3 ambient pulsant. Plus simple, plus aligne sur la charte graphique
// Thomas (au lieu de reconstruire les elements en CSS).
//
// Bouton recovery apres 5s en mode discret.
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
        @keyframes lb360-logo-breathe {
          0%, 100% { transform: scale(1); opacity: 0.96; }
          50% { transform: scale(1.025); opacity: 1; }
        }
        @keyframes lb360-glow-pulse {
          0%, 100% { opacity: 0.45; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.10); }
        }
        @keyframes lb360-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes lb360-fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lb360-loader-dots {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .lb360-anim { animation: none !important; }
        }
      `}</style>
      <div
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(ellipse at top, rgba(16,185,129,0.10) 0%, transparent 55%), " +
            "radial-gradient(ellipse at bottom right, rgba(139,92,246,0.08) 0%, transparent 55%), " +
            "radial-gradient(ellipse at bottom left, rgba(6,182,212,0.06) 0%, transparent 55%), " +
            "#0B0D11",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 20px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow ambient G3 derriere le logo */}
        <div
          aria-hidden="true"
          className="lb360-anim"
          style={{
            position: "absolute",
            top: "44%",
            left: "50%",
            width: 520,
            height: 520,
            maxWidth: "85vw",
            maxHeight: "85vw",
            background:
              "radial-gradient(circle, rgba(16,185,129,0.20) 0%, rgba(6,182,212,0.15) 30%, rgba(139,92,246,0.10) 55%, transparent 75%)",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            animation: "lb360-glow-pulse 4.5s ease-in-out infinite",
            filter: "blur(20px)",
          }}
        />

        {/* Logo officiel patience.png au centre */}
        <img
          src="/brand/labase360/patience.png"
          alt="La Base 360 — The wellness nutrition club"
          className="lb360-anim"
          style={{
            position: "relative",
            zIndex: 1,
            width: "min(420px, 78vw)",
            height: "auto",
            animation: "lb360-fade-in 800ms ease-out both, lb360-logo-breathe 4s ease-in-out infinite 800ms",
            willChange: "transform, opacity",
            filter:
              "drop-shadow(0 0 32px rgba(16,185,129,0.18)) drop-shadow(0 8px 32px rgba(6,182,212,0.15))",
          }}
        />

        {/* Loader dots G3 sous le logo */}
        <div
          className="lb360-anim"
          style={{
            position: "relative",
            zIndex: 1,
            marginTop: 24,
            display: "flex",
            gap: 8,
            animation: "lb360-fade-in 600ms ease-out 1200ms both",
          }}
          aria-label="Chargement…"
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="lb360-anim"
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background:
                  i === 0 ? "#10B981" : i === 1 ? "#06B6D4" : "#8B5CF6",
                animation: `lb360-loader-dots 1.4s ease-in-out infinite ${i * 0.16}s`,
                boxShadow: `0 0 12px ${
                  i === 0 ? "rgba(16,185,129,0.5)" : i === 1 ? "rgba(6,182,212,0.5)" : "rgba(139,92,246,0.5)"
                }`,
              }}
            />
          ))}
        </div>

        {/* Recovery button (after 5s) */}
        {showRecovery ? (
          <div
            className="lb360-anim"
            style={{
              position: "relative",
              zIndex: 1,
              marginTop: 32,
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
