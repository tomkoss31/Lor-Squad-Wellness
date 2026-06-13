// Chantier Paramètres Admin (2026-04-23) — commit 2/7.
//
// Shell de la page /parametres (admin-only). 5 tabs pills horizontaux :
//   Profil · Équipe · Transferts · Statistiques · Debug
//
// Le guard admin vit sur la route (RoleRoute allowedRoles=['admin']) dans
// App.tsx. Cette page suppose donc que currentUser est admin.
//
// Chaque tab est un composant autonome pour rester lisible.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
// PageHeading remplace par PremiumHero (2026-04-29)
import { PremiumHero } from "../components/ui/PremiumHero";
import { ProfilTab } from "../components/settings/ProfilTab";
import { EquipeTab } from "../components/settings/EquipeTab";
import { AdminTab, type AdminSection } from "../components/settings/AdminTab";
import { VipProgramTab } from "../components/settings/VipProgramTab";
import { LegalTab } from "../components/settings/LegalTab";
import { NotificationsTab } from "../components/settings/NotificationsTab";

// Leads → CRM (chantier 2026-06-13) : l'onglet « Leads » des Paramètres
// faisait doublon avec /crm (qui agrège prospect_leads + online_bilans + recos).
// /crm est désormais LA source unique. /parametres?tab=leads redirige vers /crm.
//
// Simplification B3 (2026-06-13) : Transferts / Statistiques / Debug regroupés
// sous un seul onglet « Admin » (sous-onglets internes, cf. AdminTab). On passe
// de 8 à 6 onglets. Les anciens liens ?tab=transferts|stats|debug restent
// valides (mappés vers Admin + le bon sous-onglet).
type TabKey = "profil" | "vip" | "notifs" | "legal" | "equipe" | "admin";

const ALL_TABS: Array<{ key: TabKey; label: string; icon: string; adminOnly?: boolean }> = [
  { key: "profil", label: "Profil", icon: "👤" },
  // Tier B Premium VIP (2026-04-28) : doc programme Client Privilegie pour
  // tous les coachs (distri/referent/admin). Pas adminOnly.
  { key: "vip", label: "Programme VIP", icon: "⭐" },
  // Notif push V2 (2026-04-30) : tous users peuvent personnaliser
  { key: "notifs", label: "Notifications", icon: "🔔" },
  // RGPD Phase 1 (2026-04-30) : tous users peuvent voir
  { key: "legal", label: "Confidentialité & RGPD", icon: "🛡️" },
  { key: "equipe", label: "Équipe", icon: "👥", adminOnly: true },
  { key: "admin", label: "Admin", icon: "🛠️", adminOnly: true },
];

// Mapping rétro-compat : anciens slugs techniques → onglet Admin + sous-onglet.
const LEGACY_ADMIN_SLUGS: Record<string, AdminSection> = {
  transferts: "transferts",
  stats: "stats",
  debug: "debug",
};

export function ParametresPage() {
  const { currentUser } = useAppContext();
  const navigate = useNavigate();
  // Chantier Academy section 1 (2026-04-27) : /parametres ouverte aux
  // non-admins, mais seul l onglet "Profil" est visible pour eux.
  const isAdmin = currentUser?.role === "admin";
  const TABS = ALL_TABS.filter((t) => isAdmin || !t.adminOnly);
  // Sous-onglet Admin initial déduit des anciens liens ?tab=transferts|stats|debug.
  const [adminSection] = useState<AdminSection>(() => {
    if (typeof window === "undefined") return "transferts";
    const fromQuery = new URLSearchParams(window.location.search).get("tab") ?? "";
    return LEGACY_ADMIN_SLUGS[fromQuery] ?? "transferts";
  });
  const [tab, setTab] = useState<TabKey>(() => {
    if (typeof window === "undefined") return "profil";
    const fromQuery = new URLSearchParams(window.location.search).get("tab") ?? "";
    // Anciens liens techniques → onglet Admin (le sous-onglet est géré ci-dessus).
    if (LEGACY_ADMIN_SLUGS[fromQuery]) return "admin";
    return TABS.some((t) => t.key === fromQuery) ? (fromQuery as TabKey) : "profil";
  });

  // Ancien lien /parametres?tab=leads → /crm (source unique des leads).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("tab") === "leads") {
      navigate("/crm", { replace: true });
    }
  }, [navigate]);

  if (!currentUser) return null;

  return (
    <div className="space-y-6">
      <PremiumHero
        identity="neutral"
        eyebrow="Paramètres · espace admin"
        titleAccent="Tes réglages"
        titleSuffix=" ⚙️"
        subtitle="Profil, équipe et outils d'administration."
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
      {tab === "notifs" ? <NotificationsTab /> : null}
      {tab === "legal" ? <LegalTab /> : null}
      {tab === "equipe" ? <EquipeTab /> : null}
      {tab === "admin" ? <AdminTab initialSection={adminSection} /> : null}
    </div>
  );
}
