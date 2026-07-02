// DisposTab (refonte Paramètres 2026-07-02) — onglet dédié Disponibilités RDV.
// Sort les créneaux du profil vers sa propre entrée à icône. Réutilise
// RdvAvailabilityCard (les créneaux alimentent la page publique /rdv du funnel).

import { RdvAvailabilityCard } from "./RdvAvailabilityCard";

export function DisposTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        style={{
          padding: "16px 18px",
          borderRadius: 16,
          background: "color-mix(in srgb, var(--ls-teal) 8%, var(--ls-surface))",
          border: "1px solid color-mix(in srgb, var(--ls-teal) 26%, var(--ls-border))",
        }}
      >
        <div
          style={{
            fontFamily: "Anton, sans-serif",
            fontSize: 22,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
            color: "var(--ls-text)",
          }}
        >
          📅 Disponibilités RDV
        </div>
        <div style={{ fontSize: 13, color: "var(--ls-text-muted)", lineHeight: 1.55, marginTop: 4 }}>
          Déclare tes créneaux par jour. Les prospects qui terminent leur bilan en ligne pourront réserver
          dans ces plages (les RDV déjà pris sont masqués automatiquement).
        </div>
      </div>

      <RdvAvailabilityCard />
    </div>
  );
}
