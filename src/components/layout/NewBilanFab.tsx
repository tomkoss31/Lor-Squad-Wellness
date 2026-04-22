// Chantier Refonte Navigation (2026-04-22) — commit 3/5.
// Bouton fixe en top-right du contenu principal pour lancer un nouveau
// bilan depuis n'importe quelle page coach. Remplace l'entrée de sidebar
// et le lien CTA qui étaient dans le DashboardPage / BottomNav primary.
//
// Caché sur les pages publiques (récap, rapport, app client, bienvenue)
// et pendant le parcours bilan (évite un bouton qui renvoie vers soi-même).

import { Link, useLocation } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";

const HIDDEN_PATHS = [
  "/assessments/new",
  "/login",
  "/recap",
  "/rapport",
  "/client",
  "/bienvenue",
];

function shouldHide(pathname: string): boolean {
  return HIDDEN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function NewBilanFab() {
  const location = useLocation();
  const { currentUser } = useAppContext();

  if (!currentUser) return null;
  if (shouldHide(location.pathname)) return null;

  return (
    <Link
      to="/assessments/new"
      aria-label="Nouveau bilan"
      className="ls-new-bilan-fab"
      style={{
        position: "fixed",
        top: "max(16px, env(safe-area-inset-top))",
        right: 20,
        zIndex: 40,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 18px",
        borderRadius: 12,
        background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
        color: "#FFFFFF",
        fontFamily: "DM Sans, sans-serif",
        fontWeight: 500,
        fontSize: 13,
        letterSpacing: 0.2,
        textDecoration: "none",
        boxShadow: "0 2px 6px rgba(186,117,23,0.25), 0 8px 24px rgba(186,117,23,0.15)",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow =
          "0 4px 10px rgba(186,117,23,0.32), 0 12px 32px rgba(186,117,23,0.2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow =
          "0 2px 6px rgba(186,117,23,0.25), 0 8px 24px rgba(186,117,23,0.15)";
      }}
    >
      <span
        aria-hidden="true"
        style={{
          fontSize: 16,
          fontWeight: 700,
          lineHeight: 1,
          display: "inline-block",
          width: 16,
          height: 16,
          textAlign: "center",
        }}
      >
        +
      </span>
      <span>Nouveau bilan</span>
    </Link>
  );
}
