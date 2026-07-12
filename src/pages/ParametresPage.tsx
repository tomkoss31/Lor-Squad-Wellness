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
import { getHeroGradient } from "../lib/heroGradient";
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

  // Style cockpit (2026-07-02) : onglets en JetBrains Mono capitales, actif =
  // pastille teal. Couleurs via tokens → suit le toggle clair/sombre.
  const pillStyle = (active: boolean) => ({
    padding: "9px 13px",
    borderRadius: 9,
    border: "1px solid transparent",
    cursor: "pointer",
    fontSize: 11,
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: active ? 600 : 500,
    letterSpacing: "0.13em",
    textTransform: "uppercase" as const,
    background: active ? "var(--ls-teal)" : "transparent",
    color: active ? "var(--ls-bg)" : "var(--ls-text-muted)",
    display: "flex",
    alignItems: "center",
    gap: 7,
    transition: "all 0.15s",
    whiteSpace: "nowrap" as const,
  });

  // Couleur identitaire teal + variation selon l'heure (mesh + dégradé titre).
  const g = getHeroGradient("teal");

  return (
    <div className="space-y-6">
      {/* Hero cockpit (refonte 2026-07-02, couleur 2026-07-02b) — typo cockpit
          (Anton + mono) MAIS on garde la richesse couleur du PremiumHero :
          dégradé de titre + mesh animé + palette qui varie selon l'heure.
          100 % via tokens/gradient → suit le toggle clair/sombre. */}
      <div
        style={{
          position: "relative",
          background: "var(--ls-surface)",
          border: "1px solid var(--ls-border)",
          borderRadius: 18,
          padding: "26px 26px 22px",
          // overflow VISIBLE : sinon le menu déroulant « ⋯ Plus » (position
          // absolute, ouvert vers le bas) est CLIPPÉ par la carte → apparaît
          // vide (bug signalé 2026-07-12). Le mesh de fond est clippé par un
          // calque dédié ci-dessous, pas par la carte.
          overflow: "visible",
          boxShadow: `0 1px 0 0 ${g.glow}, 0 12px 36px -14px rgba(0,0,0,0.14)`,
        }}
      >
        <style>{`
          @keyframes ls-param-mesh { 0%{transform:translate(0,0) scale(1)} 50%{transform:translate(-10px,6px) scale(1.05)} 100%{transform:translate(8px,-4px) scale(1)} }
          @media (prefers-reduced-motion: reduce){ .ls-param-mesh{animation:none!important} }
        `}</style>
        {/* Calque de clip du mesh (garde les coins arrondis) — indépendant de
            l'overflow de la carte pour ne pas couper le dropdown « Plus ». */}
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: 18, pointerEvents: "none" }}>
          <div
            className="ls-param-mesh"
            style={{
              position: "absolute",
              inset: "-20%",
              opacity: 0.6,
              animation: "ls-param-mesh 22s ease-in-out infinite alternate",
              background: `radial-gradient(circle at 0% 0%, ${g.glow} 0%, transparent 45%), radial-gradient(circle at 100% 120%, ${g.glow} 0%, transparent 50%), radial-gradient(circle at 100% 0%, color-mix(in srgb, ${g.tertiary} 22%, transparent) 0%, transparent 60%)`,
            }}
          />
        </div>

        <div style={{ position: "relative" }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: g.secondary, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
            <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: g.primary, boxShadow: `0 0 8px ${g.glow}`, display: "inline-block" }} />
            Paramètres · espace admin
          </div>
          <h1
            style={{
              fontFamily: "Anton, sans-serif",
              fontSize: "clamp(34px, 6vw, 46px)",
              lineHeight: 0.98,
              letterSpacing: "0.01em",
              textTransform: "uppercase",
              margin: "10px 0 6px",
              background: `linear-gradient(120deg, ${g.primary} 0%, ${g.secondary} 55%, ${g.tertiary} 100%)`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              color: g.secondary,
            }}
          >
            Tes réglages
          </h1>
          <div style={{ fontSize: 13.5, color: "var(--ls-text-muted)", fontFamily: "DM Sans, sans-serif", maxWidth: "52ch" }}>
            Profil, encaissement, disponibilités et outils d'administration.
          </div>
        </div>

        {/* Onglets cockpit + menu « ⋯ Plus » */}
        <div
          style={{
            display: "flex",
            gap: 7,
            marginTop: 20,
            flexWrap: "wrap",
            position: "relative",
          }}
        >
        {mainTabs.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)} style={pillStyle(tab === t.key)}>
            <span aria-hidden="true" style={{ fontSize: 14 }}>{t.icon}</span>
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
              style={{ ...pillStyle(moreActive || moreOpen), border: "1px solid var(--ls-border)" }}
            >
              <span aria-hidden="true" style={{ fontSize: 14 }}>⋯</span>
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
                      <span aria-hidden="true" style={{ fontSize: 14 }}>{it.icon}</span>
                      {it.label}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : null}
        </div>
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
