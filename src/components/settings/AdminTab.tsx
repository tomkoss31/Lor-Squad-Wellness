// Chantier simplification B3 (2026-06-13) — Paramètres 8 → 6 onglets.
//
// Regroupe les 3 onglets techniques admin (Transferts / Statistiques / Debug)
// sous un seul onglet « Admin » avec des sous-onglets internes. Les composants
// métier (TransfertsTab / StatistiquesTab / DebugTab) sont réutilisés tels
// quels, sans modification.
//
// Rétro-compat : la page /parametres mappe les anciens liens
// ?tab=transferts|stats|debug vers cet onglet + le bon sous-onglet via la prop
// `initialSection`.

import { useState } from "react";
import { TransfertsTab } from "./TransfertsTab";
import { StatistiquesTab } from "./StatistiquesTab";
import { DebugTab } from "./DebugTab";

export type AdminSection = "transferts" | "stats" | "debug";

const SECTIONS: Array<{ key: AdminSection; label: string; icon: string }> = [
  { key: "transferts", label: "Transferts", icon: "🔀" },
  { key: "stats", label: "Statistiques", icon: "📊" },
  { key: "debug", label: "Debug", icon: "🔧" },
];

export function AdminTab({ initialSection = "transferts" }: { initialSection?: AdminSection }) {
  const [section, setSection] = useState<AdminSection>(initialSection);

  return (
    <div className="space-y-5">
      {/* Sous-onglets internes */}
      <div
        style={{
          display: "flex",
          gap: 6,
          background: "var(--ls-surface2)",
          border: "1px solid var(--ls-border)",
          borderRadius: 10,
          padding: 4,
          width: "fit-content",
          flexWrap: "wrap",
        }}
      >
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSection(s.key)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontSize: 12.5,
              fontFamily: "DM Sans, sans-serif",
              fontWeight: section === s.key ? 600 : 400,
              background: section === s.key ? "var(--ls-surface)" : "transparent",
              color: section === s.key ? "var(--ls-text)" : "var(--ls-text-muted)",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.15s",
            }}
          >
            <span aria-hidden="true">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Contenu du sous-onglet actif */}
      {section === "transferts" ? <TransfertsTab /> : null}
      {section === "stats" ? <StatistiquesTab /> : null}
      {section === "debug" ? <DebugTab /> : null}
    </div>
  );
}
