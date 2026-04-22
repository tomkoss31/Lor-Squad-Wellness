// Chantier Refonte Navigation (2026-04-22) — placeholder.
// Les paramètres détaillés seront implémentés au chantier 3 (profil, PV
// objectif, notifs toggle, compteur "X jours avec Lor'Squad", etc.).

import { Card } from "../components/ui/Card";
import { PageHeading } from "../components/ui/PageHeading";
import { useAppContext } from "../context/AppContext";

export function SettingsPage() {
  const { currentUser } = useAppContext();

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Réglages"
        title="Paramètres"
        description="Profil, préférences et confidentialité."
      />

      {currentUser ? (
        <Card className="space-y-4">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #2DD4BF, #0D9488)",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "Syne, sans-serif",
                fontWeight: 700,
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              {currentUser.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <p style={{ fontFamily: "Syne, sans-serif", fontSize: 16, fontWeight: 700, margin: 0 }}>
                {currentUser.name}
              </p>
              <p style={{ fontSize: 12, color: "var(--ls-text-muted)", margin: 0, marginTop: 2 }}>
                {currentUser.email}
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="space-y-3">
        <p className="eyebrow-label">À venir</p>
        <p style={{ fontSize: 14, color: "var(--ls-text-muted)", lineHeight: 1.6 }}>
          Cette page recevra bientôt : modification du profil, objectifs PV
          personnalisés, préférences de notifications (digest matinal on/off,
          RDV imminent on/off), compteur « jours avec Lor'Squad », gestion du
          mot de passe et export de tes données.
        </p>
      </Card>
    </div>
  );
}
