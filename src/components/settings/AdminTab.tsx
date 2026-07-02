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
import { useNavigate } from "react-router-dom";
import { TransfertsTab } from "./TransfertsTab";
import { StatistiquesTab } from "./StatistiquesTab";
import { DebugTab } from "./DebugTab";
import { AdminPaymentStatusTab } from "./AdminPaymentStatusTab";

export type AdminSection = "transferts" | "stats" | "encaissement" | "debug";

const SECTIONS: Array<{ key: AdminSection; label: string; icon: string }> = [
  { key: "transferts", label: "Transferts", icon: "🔀" },
  { key: "stats", label: "Statistiques", icon: "📊" },
  { key: "encaissement", label: "Encaissement", icon: "💳" },
  { key: "debug", label: "Debug", icon: "🔧" },
];

// Pages admin pleines (routes dédiées guardées RoleRoute admin). Rapatriées ici
// depuis le hub « Mon développement » (B5 2026-06-13) : leur seule porte d'entrée
// vit désormais dans Paramètres > Admin, pas dans le hub pédago.
const ADMIN_PAGES: Array<{ icon: string; title: string; desc: string; path: string }> = [
  {
    icon: "🛠",
    title: "Admin Prospection",
    desc: "Édite les scripts et briefs méthodo du kit prospection.",
    path: "/admin/prospection",
  },
  {
    icon: "📰",
    title: "Newsletters",
    desc: "Crée, édite et envoie les éditions La Base 360 News.",
    path: "/admin/newsletters",
  },
];

export function AdminTab({ initialSection = "transferts" }: { initialSection?: AdminSection }) {
  const [section, setSection] = useState<AdminSection>(initialSection);
  const navigate = useNavigate();

  return (
    <div className="space-y-5">
      {/* Pages admin (navigations vers des routes dédiées) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
        {ADMIN_PAGES.map((p) => (
          <button
            key={p.path}
            type="button"
            onClick={() => navigate(p.path)}
            style={{
              textAlign: "left",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              background: "var(--ls-surface)",
              border: "0.5px solid var(--ls-border)",
              borderRadius: 13,
              padding: "14px 14px",
              cursor: "pointer",
              transition: "transform 0.15s ease, border-color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.borderColor = "color-mix(in srgb, var(--ls-teal) 45%, transparent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.borderColor = "var(--ls-border)";
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 20, lineHeight: 1 }}>{p.icon}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontWeight: 700, fontSize: 14, color: "var(--ls-text)", fontFamily: "DM Sans, sans-serif" }}>{p.title}</span>
              <span style={{ display: "block", fontSize: 12, color: "var(--ls-text-muted)", marginTop: 3, lineHeight: 1.45 }}>{p.desc}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Sous-onglets internes (réglages techniques) */}
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
      {section === "encaissement" ? <AdminPaymentStatusTab /> : null}
      {section === "debug" ? <DebugTab /> : null}
    </div>
  );
}
