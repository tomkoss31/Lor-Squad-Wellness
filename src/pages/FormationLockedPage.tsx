// =============================================================================
// FormationLockedPage — gate distri (2026-11-04)
//
// Affichee a la place de toutes les pages /formation/* tant que le contenu
// n est pas finalise pour les distributeurs. Admin only voit le vrai
// /formation. Distri qui essaie d acceder en direct atterrit ici.
//
// Wrapper a utiliser dans App.tsx :
//   <Route path="formation" element={<FormationGate><FormationPage /></FormationGate>} />
// =============================================================================

import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { PageHeading } from "../components/ui/PageHeading";

export function FormationLockedPage() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const firstName = currentUser?.name?.split(/\s+/)[0] ?? "";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 24,
        padding: "40px 16px",
        textAlign: "center",
      }}
    >
      <PageHeading
        eyebrow="Centre de formation"
        title="Bientôt disponible"
        description="On peaufine encore quelques détails pour te livrer un parcours qui claque."
      />

      <div
        style={{
          position: "relative",
          maxWidth: 520,
          width: "100%",
          padding: "32px 28px",
          borderRadius: 24,
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 8%, var(--ls-surface)) 0%, color-mix(in srgb, var(--ls-teal) 6%, var(--ls-surface2)) 100%)",
          border:
            "0.5px solid color-mix(in srgb, var(--ls-gold) 28%, var(--ls-border))",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 160,
            height: 160,
            borderRadius: "50%",
            background: "color-mix(in srgb, var(--ls-gold) 18%, transparent)",
            filter: "blur(48px)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 56, marginBottom: 12 }} aria-hidden="true">
            🚧
          </div>
          <h2
            style={{
              fontFamily: "Syne, serif",
              fontWeight: 800,
              fontSize: "clamp(20px, 4vw, 26px)",
              letterSpacing: "-0.02em",
              color: "var(--ls-text)",
              margin: 0,
              marginBottom: 12,
            }}
          >
            {firstName ? `${firstName}, ` : ""}
            <span
              style={{
                background:
                  "linear-gradient(90deg, var(--ls-gold) 0%, var(--ls-teal) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              chantier en cours
            </span>
          </h2>
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: 14,
              lineHeight: 1.6,
              color: "var(--ls-text-muted)",
              margin: "0 auto",
              maxWidth: 420,
            }}
          >
            Le centre de formation est en cours de finalisation. Encore quelques
            heures de patience et tu auras accès à un parcours pyramidal
            complet — Démarrer / Construire / Dupliquer, validations sponsor, certifications.
          </p>
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: 12,
              color: "var(--ls-text-muted)",
              margin: "16px 0 0",
              fontStyle: "italic",
            }}
          >
            On te prévient dès que c'est prêt. Promis. 💛
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => navigate("/co-pilote")}
        style={{
          padding: "12px 28px",
          borderRadius: 12,
          background: "var(--ls-gold)",
          color: "#fff",
          border: "none",
          fontFamily: "DM Sans, sans-serif",
          fontWeight: 700,
          fontSize: 14,
          cursor: "pointer",
          boxShadow: "0 4px 14px color-mix(in srgb, var(--ls-gold) 30%, transparent)",
        }}
      >
        ← Retour au Co-pilote
      </button>
    </div>
  );
}

/**
 * Gate wrapper : si l user n est ni admin ni beta-tester formation,
 * retourne FormationLockedPage. Sinon laisse passer.
 *
 * Phase beta (2026-11-05) : flag users.formation_beta_access permet
 * d ouvrir la formation à des distri/référents ciblés (ex. Mandy +
 * son équipe pour récolter du feedback) sans encore l ouvrir à tous.
 */
export function FormationAdminGate({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAppContext();
  const isAdmin = currentUser?.role === "admin";
  const hasBeta = currentUser?.formationBetaAccess === true;
  if (!isAdmin && !hasBeta) {
    return <FormationLockedPage />;
  }
  return <>{children}</>;
}
