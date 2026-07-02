// EncaissementTab (refonte Paramètres 2026-07-02) — onglet dédié Encaissement.
// Sort la config Stripe du profil (où elle était perdue en bas) vers sa propre
// entrée à icône. Réutilise PaymentSettingsCard (même composant que /encaissement
// dans Mon business → B9 : un seul impl, deux points d'accès).

import { PaymentSettingsCard } from "./PaymentSettingsCard";

export function EncaissementTab() {
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
          💳 Encaissement
        </div>
        <div style={{ fontSize: 13, color: "var(--ls-text-muted)", lineHeight: 1.55, marginTop: 4 }}>
          Configure ton compte <strong style={{ color: "var(--ls-text)" }}>Stripe</strong> pour encaisser tes clients
          directement à la fin du bilan (CB, sans chèque ni virement à gérer). L'argent va 100 % sur ton compte.
        </div>
      </div>

      <PaymentSettingsCard />
    </div>
  );
}
