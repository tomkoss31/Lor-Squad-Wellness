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
// PageHeading remplace par PremiumHero (2026-04-29)
import { PremiumHero } from "../components/ui/PremiumHero";
import { ProfilTab } from "../components/settings/ProfilTab";
import { EquipeTab } from "../components/settings/EquipeTab";
import { TransfertsTab } from "../components/settings/TransfertsTab";
import { StatistiquesTab } from "../components/settings/StatistiquesTab";
import { DebugTab } from "../components/settings/DebugTab";
import { LeadsTab } from "../components/settings/LeadsTab";
import { VipProgramTab } from "../components/settings/VipProgramTab";
import { LegalTab } from "../components/settings/LegalTab";

type TabKey = "profil" | "vip" | "legal" | "equipe" | "leads" | "transferts" | "stats" | "debug";

const ALL_TABS: Array<{ key: TabKey; label: string; icon: string; adminOnly?: boolean }> = [
  { key: "profil", label: "Profil", icon: "👤" },
  // Tier B Premium VIP (2026-04-28) : doc programme Client Privilegie pour
  // tous les coachs (distri/referent/admin). Pas adminOnly.
  { key: "vip", label: "Programme VIP", icon: "⭐" },
  // RGPD Phase 1 (2026-04-30) : tous users peuvent voir
  { key: "legal", label: "Confidentialité & RGPD", icon: "🛡️" },
  { key: "equipe", label: "Équipe", icon: "👥", adminOnly: true },
  { key: "leads", label: "Leads", icon: "🔥", adminOnly: true },
  { key: "transferts", label: "Transferts", icon: "🔀", adminOnly: true },
  { key: "stats", label: "Statistiques", icon: "📊", adminOnly: true },
  { key: "debug", label: "Debug", icon: "🔧", adminOnly: true },
];

export function ParametresPage() {
  const { currentUser } = useAppContext();
  // Chantier Academy section 1 (2026-04-27) : /parametres ouverte aux
  // non-admins, mais seul l onglet "Profil" est visible pour eux.
  const isAdmin = currentUser?.role === "admin";
  const TABS = ALL_TABS.filter((t) => isAdmin || !t.adminOnly);
  const [tab, setTab] = useState<TabKey>(() => {
    if (typeof window === "undefined") return "profil";
    const fromQuery = new URLSearchParams(window.location.search).get("tab") as TabKey;
    return fromQuery && TABS.some((t) => t.key === fromQuery) ? fromQuery : "profil";
  });

  if (!currentUser) return null;

  return (
    <div className="space-y-6">
      <PremiumHero
        identity="neutral"
        eyebrow="Paramètres · espace admin"
        titleAccent="Tes réglages"
        titleSuffix=" ⚙️"
        subtitle="Profil, équipe, transferts, statistiques et outils techniques."
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
      {tab === "vip" ? <VipProgramTab /> : null}
      {tab === "legal" ? <LegalTab /> : null}
      {tab === "equipe" ? <EquipeTab /> : null}
      {tab === "leads" ? <LeadsTab /> : null}
      {tab === "transferts" ? <TransfertsTab /> : null}
      {tab === "stats" ? <StatistiquesTab /> : null}
      {tab === "debug" ? <DebugTab /> : null}
    </div>
  );
}
