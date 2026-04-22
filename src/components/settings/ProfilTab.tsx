// Chantier Paramètres Admin (2026-04-23) — placeholder étoffé commit 3.
import { Card } from "../ui/Card";

export function ProfilTab() {
  return (
    <Card className="space-y-3">
      <p className="eyebrow-label">Profil</p>
      <p style={{ fontSize: 14, color: "var(--ls-text-muted)" }}>
        Chargement du profil…
      </p>
    </Card>
  );
}
