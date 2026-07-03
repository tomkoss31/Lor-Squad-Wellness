// =============================================================================
// FormField — champ de formulaire partagé (chantier design system 2026-07-03).
//
// Remplace les 3+ wrappers label+input réinventés localement (LabeledField dans
// ProfilTab, Field dans PaymentSettingsCard + ManualPvEntriesSection), qui
// avaient chacun des tailles/espacements différents.
//
// Label par défaut en JetBrains Mono capitales (cockpit). `hint` optionnel sous
// le champ. 100 % tokens var(--ls-*).
// =============================================================================

import type { ReactNode } from "react";

interface Props {
  label: ReactNode;
  children: ReactNode;
  /** Texte d'aide sous le champ. */
  hint?: ReactNode;
  /** Label en mono capitales (défaut) ou DM Sans plus doux. */
  mono?: boolean;
}

export function FormField({ label, children, hint, mono = true }: Props) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={
          mono
            ? {
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9.5,
                fontWeight: 500,
                color: "var(--ls-text-hint)",
                letterSpacing: "0.13em",
                textTransform: "uppercase",
              }
            : {
                fontSize: 12.5,
                fontWeight: 600,
                color: "var(--ls-text)",
              }
        }
      >
        {label}
      </span>
      {children}
      {hint ? (
        <span style={{ fontSize: 11, color: "var(--ls-text-muted)", lineHeight: 1.45 }}>{hint}</span>
      ) : null}
    </label>
  );
}
