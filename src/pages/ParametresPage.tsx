// Chantier Paramètres Admin (2026-04-23) — commit 2/7.
//
// Shell de la page /parametres (admin-only). 5 tabs pills horizontaux :
//   Profil · Équipe · Transferts · Statistiques · Debug
//
// Le guard admin vit sur la route (RoleRoute allowedRoles=['admin']) dans
// App.tsx. Cette page suppose donc que currentUser est admin.
//
// Chaque tab est un composant autonome pour rester lisible.

import { useState } from "react";
import { useAppContext } from "../context/AppContext";
import { PageHeading } from "../components/ui/PageHeading";
import { ProfilTab } from "../components/settings/ProfilTab";
import { EquipeTab } from "../components/settings/EquipeTab";
import { TransfertsTab } from "../components/settings/TransfertsTab";
import { StatistiquesTab } from "../components/settings/StatistiquesTab";
import { DebugTab } from "../components/settings/DebugTab";

type TabKey = "profil" | "equipe" | "transferts" | "stats" | "debug";

const TABS: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: "profil", label: "Profil", icon: "👤" },
  { key: "equipe", label: "Équipe", icon: "👥" },
  { key: "transferts", label: "Transferts", icon: "🔀" },
  { key: "stats", label: "Statistiques", icon: "📊" },
  { key: "debug", label: "Debug", icon: "🔧" },
];

export function ParametresPage() {
  const { currentUser } = useAppContext();
  const [tab, setTab] = useState<TabKey>(() => {
    if (typeof window === "undefined") return "profil";
    const fromQuery = new URLSearchParams(window.location.search).get("tab") as TabKey;
    return fromQuery && TABS.some((t) => t.key === fromQuery) ? fromQuery : "profil";
  });

  if (!currentUser) return null;

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Administration"
        title="Paramètres"
        description="Profil, équipe, transferts, statistiques et outils techniques."
      />

      {/* Tabs pills */}
      <div
        style={{
          display: "flex",
          gap: 6,
          background: "var(--ls-surface)",
          border: "1px solid var(--ls-border)",
          borderRadius: 12,
          padding: 4,
          width: "fit-content",
          flexWrap: "wrap",
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontFamily: "DM Sans, sans-serif",
              fontWeight: tab === t.key ? 600 : 400,
              background: tab === t.key ? "var(--ls-surface2)" : "transparent",
              color: tab === t.key ? "var(--ls-text)" : "var(--ls-text-muted)",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.15s",
            }}
          >
            <span aria-hidden="true">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenu conditionnel */}
      {tab === "profil" ? <ProfilTab /> : null}
      {tab === "equipe" ? <EquipeTab /> : null}
      {tab === "transferts" ? <TransfertsTab /> : null}
      {tab === "stats" ? <StatistiquesTab /> : null}
      {tab === "debug" ? <DebugTab /> : null}
    </div>
  );
}
