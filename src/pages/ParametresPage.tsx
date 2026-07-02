// Page /parametres — refonte 2026-07-02.
//
// Objectif : « une icône = un écran ». On sort de 7 onglets surchargés vers une
// structure claire :
//   Pills : 👤 Profil · 💳 Encaissement · 📅 Disponibilités · ✨ Noaly ·
//           👥 Équipe (admin) · 🛠️ Admin (admin)
//   Menu « ⋯ Plus » : 🔔 Notifications · 🛡️ Confidentialité & RGPD ·
//                     📰 Newsletters (admin → /admin/newsletters)
//
// Retirés de Paramètres : ⭐ Programme VIP (vit dans Mon développement /
// ClubVipExpliquePage) · 🔗 Fiche publique (côté prospection).
//
// Le guard admin vit sur la route (RoleRoute) dans App.tsx.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { PremiumHero } from "../components/ui/PremiumHero";
import { ProfilTab } from "../components/settings/ProfilTab";
import { EquipeTab } from "../components/settings/EquipeTab";
import { AdminTab, type AdminSection } from "../components/settings/AdminTab";
import { LegalTab } from "../components/settings/LegalTab";
import { NotificationsTab } from "../components/settings/NotificationsTab";
import { NoalyUsageCard } from "../components/settings/NoalyUsageCard";
import { EncaissementTab } from "../components/settings/EncaissementTab";
import { DisposTab } from "../components/settings/DisposTab";

type TabKey =
  | "profil"
  | "encaissement"
  | "dispos"
  | "noaly"
  | "equipe"
  | "admin"
  | "notifs"
  | "legal";

// Pills principales (onglets visibles en permanence).
const MAIN_TABS: Array<{ key: TabKey; label: string; icon: string; adminOnly?: boolean }> = [
  { key: "profil", label: "Profil", icon: "👤" },
  { key: "encaissement", label: "Encaissement", icon: "💳" },
  { key: "dispos", label: "Disponibilités", icon: "📅" },
  { key: "noaly", label: "Noaly", icon: "✨" },
  { key: "equipe", label: "Équipe", icon: "👥", adminOnly: true },
  { key: "admin", label: "Admin", icon: "🛠️", adminOnly: true },
];

// Items du menu « ⋯ Plus » (regroupés pour désencombrer la barre).
type MoreItem = { key: TabKey | "newsletters"; label: string; icon: string; adminOnly?: boolean };
const MORE_ITEMS: MoreItem[] = [
  { key: "notifs", label: "Notifications", icon: "🔔" },
  { key: "legal", label: "Confidentialité & RGPD", icon: "🛡️" },
  { key: "newsletters", label: "Newsletters", icon: "📰", adminOnly: true },
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
  const isAdmin = currentUser?.role === "admin";
  const [moreOpen, setMoreOpen] = useState(false);

  const mainTabs = MAIN_TABS.filter((t) => isAdmin || !t.adminOnly);
  const moreItems = MORE_ITEMS.filter((t) => isAdmin || !t.adminOnly);

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
    // Ancien slug « vip » → redirigé plus bas vers l'explication dans Mon dév.
    const all = [...MAIN_TABS, ...MORE_ITEMS].map((t) => t.key);
    return all.includes(fromQuery as TabKey) ? (fromQuery as TabKey) : "profil";
  });

  // Redirections d'anciens liens.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search).get("tab");
    if (q === "leads") navigate("/crm", { replace: true });
    // ⭐ Programme VIP : retiré des Paramètres → l'explication vit dans Mon dév.
    if (q === "vip") navigate("/developpement/club-vip-explique", { replace: true });
  }, [navigate]);

  if (!currentUser) return null;

  const moreActive = tab === "notifs" || tab === "legal";

  const pillStyle = (active: boolean) => ({
    padding: "8px 14px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "DM Sans, sans-serif",
    fontWeight: active ? 600 : 400,
    background: active ? "var(--ls-surface2)" : "transparent",
    color: active ? "var(--ls-text)" : "var(--ls-text-muted)",
    display: "flex",
    alignItems: "center",
    gap: 6,
    transition: "all 0.15s",
    whiteSpace: "nowrap" as const,
  });

  return (
    <div className="space-y-6">
      <PremiumHero
        identity="neutral"
        eyebrow="Paramètres · espace admin"
        titleAccent="Tes réglages"
        titleSuffix=" ⚙️"
        subtitle="Profil, encaissement, disponibilités et outils d'administration."
      />

      {/* Tabs pills + menu « ⋯ Plus » */}
      <div
        style={{
          display: "flex",
          gap: 6,
          background: "var(--ls-surface)",
          border: "1px solid var(--ls-border)",
          borderRadius: 12,
          padding: 4,
          width: "fit-content",
          maxWidth: "100%",
          flexWrap: "wrap",
          position: "relative",
        }}
      >
        {mainTabs.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)} style={pillStyle(tab === t.key)}>
            <span aria-hidden="true">{t.icon}</span>
            {t.label}
          </button>
        ))}

        {/* ⋯ Plus */}
        {moreItems.length > 0 ? (
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              aria-expanded={moreOpen}
              style={pillStyle(moreActive || moreOpen)}
            >
              <span aria-hidden="true">⋯</span>
              Plus
            </button>
            {moreOpen ? (
              <>
                {/* backdrop pour fermer au clic extérieur */}
                <div
                  onClick={() => setMoreOpen(false)}
                  style={{ position: "fixed", inset: 0, zIndex: 40 }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    right: 0,
                    zIndex: 41,
                    minWidth: 230,
                    background: "var(--ls-surface)",
                    border: "1px solid var(--ls-border)",
                    borderRadius: 12,
                    padding: 6,
                    boxShadow: "0 16px 40px -16px rgba(0,0,0,0.5)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  {moreItems.map((it) => (
                    <button
                      key={it.key}
                      type="button"
                      onClick={() => {
                        setMoreOpen(false);
                        if (it.key === "newsletters") {
                          navigate("/admin/newsletters");
                        } else {
                          setTab(it.key as TabKey);
                        }
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 9,
                        padding: "9px 11px",
                        borderRadius: 8,
                        border: "none",
                        background: tab === it.key ? "var(--ls-surface2)" : "transparent",
                        color: "var(--ls-text)",
                        fontFamily: "DM Sans, sans-serif",
                        fontSize: 13,
                        cursor: "pointer",
                        textAlign: "left",
                        width: "100%",
                      }}
                    >
                      <span aria-hidden="true">{it.icon}</span>
                      {it.label}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Contenu conditionnel */}
      {tab === "profil" ? <ProfilTab /> : null}
      {tab === "encaissement" ? <EncaissementTab /> : null}
      {tab === "dispos" ? <DisposTab /> : null}
      {tab === "noaly" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <NoalyUsageCard />
        </div>
      ) : null}
      {tab === "equipe" ? <EquipeTab /> : null}
      {tab === "admin" ? <AdminTab initialSection={adminSection} /> : null}
      {tab === "notifs" ? <NotificationsTab /> : null}
      {tab === "legal" ? <LegalTab /> : null}
    </div>
  );
}
