import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { hasRequiredRole } from "../../lib/auth";
import type { UserRole } from "../../types/domain";
import { LogoSting } from "../brand/LogoSting";

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

/**
 * Bloque les routes interdites aux Supervisor passifs (chantier Light V2
 * 2026-05-22). Un passif n'a pas de portefeuille client → on cache
 * Clients/Bilans/Agenda/Suivi PV/Mon équipe et on redirige vers Co-pilote
 * si tentative d'accès direct via URL.
 */
export function NotPassiveRoute() {
  const { authReady, currentUser } = useAppContext();
  if (!authReady) return <AuthBootSplash />;
  if (!currentUser) return <Navigate to="/welcome" replace />;
  if (currentUser.isPassiveSupervisor) return <Navigate to="/co-pilote" replace />;
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
const BOOT_MESSAGES = [
  "On réveille ton Co-pilote…",
  "Tes dossiers clients arrivent…",
  "On prépare ta journée…",
  "Le club s'allume… 🌿",
];

function AuthBootSplash() {
  // Ni `forceResetSession` ni `navigate` ici : le bouton de secours recharge
  // simplement la page (cf. `handleRecovery`). C'est volontaire.
  const [showRecovery, setShowRecovery] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowRecovery(true), 5000);
    // Micro-messages rotatifs : le chargement raconte quelque chose au lieu
    // d'un loader muet. Cycle 2.2s, s'arrête sur le dernier message.
    const msgTimer = window.setInterval(
      () => setMsgIndex((i) => Math.min(i + 1, BOOT_MESSAGES.length - 1)),
      2200,
    );
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(msgTimer);
    };
  }, []);

  /**
   * Le bouton de secours du démarrage lent — il RECHARGE, il ne déconnecte plus.
   *
   * ⚠️ NE JAMAIS y remettre `forceResetSession()` (22/08). Ce bouton apparaît au
   * bout de 5 secondes d'attente, et l'app met régulièrement 14 secondes à
   * charger : il s'affiche donc sur presque chaque démarrage à froid. Il
   * appelait une déconnexion — et `signOut()` était de portée GLOBALE, donc un
   * clic ici, sur n'importe quel appareil, révoquait la session de TOUS les
   * autres. Thomas a perdu un bilan en plein rendez-vous client : son PC avait
   * été déconnecté à distance sans qu'il touche à rien.
   *
   * Ce qu'on veut quand un chargement traîne, c'est le refaire. Pas se faire
   * éjecter de partout. Un rechargement suffit : si la session est vraiment
   * morte, `ProtectedRoute` renverra vers la connexion tout seul.
   */
  function handleRecovery() {
    window.location.reload();
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
        @keyframes lb360-ring-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes lb360-shine {
          0% { background-position: -200% center; }
          60%, 100% { background-position: 200% center; }
        }
        @keyframes lb360-bar-sweep {
          0% { transform: translateX(-100%); }
          55% { transform: translateX(160%); }
          100% { transform: translateX(160%); }
        }
        @keyframes lb360-msg-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lb360-star-drift {
          0%, 100% { opacity: 0.25; transform: translateY(0); }
          50% { opacity: 0.7; transform: translateY(-6px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .lb360-anim { animation: none !important; }
        }
      `}</style>
      <div
        style={{
          minHeight: "100vh",
          // Charte 2026-08 : vert profond du club + halos teal/lime. Avant,
          // c'était #0B0D11 (le noir bleuté abandonné) avec des halos
          // émeraude/violet/cyan de l'identité G3 — le premier écran de l'app
          // était donc le dernier resté sur l'ancienne palette.
          background:
            "radial-gradient(ellipse at top, rgba(45,212,191,0.12) 0%, transparent 55%), " +
            "radial-gradient(ellipse at bottom right, rgba(197,248,42,0.07) 0%, transparent 55%), " +
            "radial-gradient(ellipse at bottom left, rgba(45,212,191,0.06) 0%, transparent 55%), " +
            "#162624",
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
              "radial-gradient(circle, rgba(45,212,191,0.20) 0%, rgba(45,212,191,0.13) 30%, rgba(197,248,42,0.08) 55%, transparent 75%)",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            animation: "lb360-glow-pulse 4.5s ease-in-out infinite",
            filter: "blur(20px)",
          }}
        />

        {/* Container logo + texte (reconstruction propre, pas le PNG patience
            qui a un damier integre dans les pixels) */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
          }}
        >
          {/* Logo + anneau gradient rotatif (signature premium).
              L'anneau est un conic-gradient masqué en couronne via CSS mask —
              zéro asset, tourne lentement derrière l'icône. */}
          <div
            className="lb360-anim"
            style={{
              position: "relative",
              width: 168,
              height: 168,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "lb360-fade-in 600ms ease-out both",
            }}
          >
            <div
              aria-hidden="true"
              className="lb360-anim"
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background:
                  "conic-gradient(from 0deg, transparent 0%, rgba(45,212,191,0) 18%, #2DD4BF 38%, #2DD4BF 52%, #C5F82A 66%, transparent 84%)",
                WebkitMask:
                  "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2.5px))",
                mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2.5px))",
                animation: "lb360-ring-spin 5s linear infinite",
                willChange: "transform",
              }}
            />
            <div
              aria-hidden="true"
              className="lb360-anim"
              style={{
                position: "absolute",
                inset: 6,
                borderRadius: "50%",
                background:
                  "conic-gradient(from 180deg, transparent 0%, rgba(197,248,42,0.45) 30%, rgba(45,212,191,0.35) 50%, transparent 70%)",
                WebkitMask:
                  "radial-gradient(farthest-side, transparent calc(100% - 1.5px), #000 calc(100% - 1px))",
                mask: "radial-gradient(farthest-side, transparent calc(100% - 1.5px), #000 calc(100% - 1px))",
                animation: "lb360-ring-spin 8s linear infinite reverse",
                opacity: 0.55,
                willChange: "transform",
              }}
            />
            {/* Le logo se DESSINE pendant l'attente (sting validé Thomas, 2026-08-09) :
                l'anneau se trace, la barre claque, le B se révèle par le bas. Le
                temps de chargement devient un moment de marque au lieu d'un vide. */}
            <LogoSting
              size={116}
              className="lb360-anim"
              style={{
                willChange: "transform, opacity",
                filter:
                  "drop-shadow(0 0 28px rgba(45,212,191,0.35)) drop-shadow(0 12px 32px rgba(197,248,42,0.18))",
              }}
            />
          </div>

          {/* Heritage pill — SANS backdrop-filter : bug Chromium/Windows PWA
              (rendu blanc opaque → texte crème invisible, vu 2026-06-11). */}
          <div
            className="lb360-anim"
            style={{
              padding: "5px 16px",
              borderRadius: 100,
              background: "rgba(45,212,191,0.08)",
              border: "0.5px solid rgba(45,212,191,0.28)",
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 9.5,
              fontWeight: 600,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: "rgba(240,237,232,0.7)",
              animation: "lb360-fade-up 500ms ease-out 350ms both",
            }}
          >
            ★ Since 2022 ★
          </div>

          {/* Brand name */}
          <h1
            className="lb360-anim"
            style={{
              fontFamily: "Sora, system-ui, sans-serif",
              fontSize: 38,
              fontWeight: 700,
              color: "#F0EDE8",
              margin: 0,
              letterSpacing: "-0.025em",
              lineHeight: 1.05,
              animation: "lb360-fade-up 500ms ease-out 500ms both",
            }}
          >
            <span
              className="lb360-anim"
              style={{
                // Shine sweep : reflet lumineux qui balaie le texte (loop 3.5s)
                background:
                  "linear-gradient(110deg, #F0EDE8 35%, #FFFFFF 47%, #9be8d6 50%, #F0EDE8 63%)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                display: "inline-block",
                animation: "lb360-shine 3.5s ease-in-out infinite 1s",
              }}
            >
              La Base
            </span>{" "}
            <span
              style={{
                fontStyle: "italic",
                fontWeight: 400,
                background:
                  "linear-gradient(135deg, #F4EFE4 0%, #2DD4BF 55%, #C5F82A 100%)",
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

          {/* Tagline */}
          <p
            className="lb360-anim"
            style={{
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 13.5,
              color: "rgba(240,237,232,0.5)",
              margin: 0,
              fontWeight: 400,
              letterSpacing: "0.01em",
              animation: "lb360-fade-up 500ms ease-out 650ms both",
            }}
          >
            The wellness nutrition club
          </p>
        </div>

        {/* Loader : barre de progression indéterminée (sweep gradient) +
            micro-message rotatif. Plus vivant que 3 points muets. */}
        <div
          className="lb360-anim"
          style={{
            position: "relative",
            zIndex: 1,
            marginTop: 28,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            animation: "lb360-fade-in 600ms ease-out 1100ms both",
          }}
          aria-label="Chargement…"
        >
          <div
            style={{
              width: 180,
              height: 3,
              borderRadius: 99,
              background: "rgba(255,255,255,0.08)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              className="lb360-anim"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "62%",
                height: "100%",
                borderRadius: 99,
                background:
                  "linear-gradient(90deg, transparent, #2DD4BF 30%, #C5F82A 70%, transparent)",
                animation: "lb360-bar-sweep 1.8s ease-in-out infinite",
                boxShadow: "0 0 14px rgba(45,212,191,0.45)",
                willChange: "transform",
              }}
            />
          </div>
          <p
            key={msgIndex}
            className="lb360-anim"
            style={{
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 12.5,
              color: "rgba(240,237,232,0.45)",
              margin: 0,
              letterSpacing: "0.02em",
              animation: "lb360-msg-in 450ms ease-out both",
              minHeight: 18,
            }}
          >
            {BOOT_MESSAGES[msgIndex]}
          </p>
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
              Ça prend plus de temps que prévu ? Tu peux relancer le chargement.
            </p>
            <button
              type="button"
              onClick={() => void handleRecovery()}
              style={{
                // SANS backdrop-filter : même bug Chromium/Windows que le pill
                // heritage (rendu blanc opaque, texte invisible).
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: 13,
                fontWeight: 500,
                color: "rgba(240,237,232,0.8)",
                background: "rgba(45,212,191,0.07)",
                border: "0.5px solid rgba(45,212,191,0.3)",
                padding: "10px 22px",
                borderRadius: 100,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(45,212,191,0.14)";
                e.currentTarget.style.color = "#F0EDE8";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(45,212,191,0.07)";
                e.currentTarget.style.color = "rgba(240,237,232,0.8)";
              }}
            >
              Réessayer
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
