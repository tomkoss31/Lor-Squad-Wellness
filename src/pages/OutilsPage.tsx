// =============================================================================
// OutilsPage — hub « 💼 Mon business » (ex-« Outils », renommé B2 2026-06-13).
// URL inchangée (/outils) pour ne casser aucun lien.
//
// La sidebar ne garde que le quotidien. Les outils ponctuels du coach vivent
// ici, en cards, pour ne pas multiplier les lignes de menu. Quand on ajoute un
// nouvel outil (devis, simulateurs ponctuels…), on ajoute une card ici — JAMAIS
// une nouvelle entrée sidebar (cf. CLAUDE.md « anti-bloat sidebar »).
// =============================================================================

import { useNavigate } from "react-router-dom";

interface ToolCard {
  id: string;
  icon: string;
  iconBg: string;
  name: string;
  desc: string;
  path?: string;
  soon?: boolean;
}

const TOOLS: { section: string; items: ToolCard[] }[] = [
  {
    section: "🔗 Partage & prospection",
    items: [
      {
        // B4 (2026-06-13) : porte UNIQUE « Prospecter » depuis Mon business
        // (faire/piloter). Pointe vers la page mère /outils-prospection qui
        // regroupe méthode, bilan online, liens marketing et international.
        // Retiré du hub « Mon développement » (qui redevient 100 % pédago).
        id: "prospecter",
        icon: "🎯",
        iconBg: "color-mix(in srgb, var(--ls-teal) 16%, transparent)",
        name: "Prospecter",
        desc: "Ta machine à prospects : la méthode, ton bilan online, tes liens marketing et l'international — tout au même endroit.",
        path: "/outils-prospection",
      },
      {
        id: "mes-liens",
        icon: "🔗",
        iconBg: "color-mix(in srgb, var(--ls-teal) 16%, transparent)",
        name: "Mes liens",
        desc: "Tous tes liens publics (bilan, business, coach, VIP…) prêts à copier, QR, WhatsApp.",
        path: "/mes-liens",
      },
      {
        // Raccroché ici (2026-06-13) : la carte Liste 100 du Co-pilote a été
        // retirée par le Plan du jour → on garde l'accès rapide via Mon business.
        id: "liste-100",
        icon: "📒",
        iconBg: "color-mix(in srgb, var(--ls-purple) 16%, transparent)",
        name: "Ma Liste 100",
        desc: "Ta liste de connaissances (méthode FRANK) : ajoute, qualifie et transforme tes contacts en prospects.",
        path: "/cahier-de-bord?tab=liste",
      },
    ],
  },
  {
    // B7 (2026-06-13) : carte « Devis » retirée (décision Thomas). Réversible —
    // le placeholder « Bientôt » a été supprimé pour aérer.
    section: "🛒 Vente",
    items: [
      {
        id: "panier",
        icon: "🛒",
        iconBg: "color-mix(in srgb, var(--ls-gold) 18%, transparent)",
        name: "Panier",
        desc: "Calcule un panier produits : total €, total PV, remise client (5 → 35 %), récap copiable.",
        path: "/panier",
      },
    ],
  },
  {
    section: "📊 Suivi & business",
    items: [
      {
        id: "rentabilite",
        icon: "💎",
        iconBg: "color-mix(in srgb, var(--ls-purple) 16%, transparent)",
        name: "Rentabilité",
        desc: "Ta marge du mois, ta projection et le détail complet (vente directe + overrides équipe). Vue avant réservée au Co-pilote.",
        path: "/rentabilite",
      },
      {
        id: "flex",
        icon: "⚡",
        iconBg: "color-mix(in srgb, var(--ls-teal) 16%, transparent)",
        name: "FLEX",
        desc: "Ta marge, tes paliers Herbalife et la projection du mois en un coup d'œil.",
        path: "/flex",
      },
      {
        id: "pv",
        icon: "💰",
        iconBg: "color-mix(in srgb, var(--ls-gold) 18%, transparent)",
        name: "Suivi PV",
        desc: "L'historique de tes points de volume, échéances et relances à faire.",
        path: "/pv",
      },
    ],
  },
];

export function OutilsPage() {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "8px 4px 60px" }}>
      {/* Hero */}
      <div style={{ fontFamily: "Syne, sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", color: "var(--ls-teal)" }}>
        Pilote ton activité
      </div>
      <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(26px,5vw,32px)", letterSpacing: "-0.5px", margin: "8px 0 4px", color: "var(--ls-text)" }}>
        Mon{" "}
        <span style={{ background: "linear-gradient(135deg,var(--ls-teal),var(--ls-purple))", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          business
        </span>
      </h1>
      <p style={{ color: "var(--ls-text-muted)", fontSize: 14, marginBottom: 22, fontFamily: "DM Sans, sans-serif" }}>
        Prospecter, tes liens, ton panier et tes chiffres (rentabilité, FLEX, PV) regroupés ici pour piloter ton activité.
      </p>

      {TOOLS.map((grp) => (
        <div key={grp.section}>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--ls-text-muted)", margin: "22px 4px 10px" }}>
            {grp.section}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            {grp.items.map((tool) => (
              <button
                key={tool.id}
                type="button"
                disabled={tool.soon}
                onClick={() => tool.path && navigate(tool.path)}
                style={{
                  textAlign: "left",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 13,
                  background: "var(--ls-surface)",
                  border: "0.5px solid var(--ls-border)",
                  borderRadius: 15,
                  padding: "16px 16px",
                  cursor: tool.soon ? "default" : "pointer",
                  opacity: tool.soon ? 0.62 : 1,
                  transition: "transform 0.15s ease, border-color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (tool.soon) return;
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.borderColor = "color-mix(in srgb, var(--ls-teal) 45%, transparent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "var(--ls-border)";
                }}
              >
                <div style={{ flex: "0 0 auto", width: 46, height: 46, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, background: tool.iconBg }}>
                  {tool.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: "var(--ls-text)", fontFamily: "DM Sans, sans-serif" }}>{tool.name}</span>
                    {tool.soon ? (
                      <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--ls-purple)", background: "color-mix(in srgb, var(--ls-purple) 14%, transparent)", padding: "2px 7px", borderRadius: 20 }}>
                        Bientôt
                      </span>
                    ) : null}
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--ls-text-muted)", marginTop: 4, lineHeight: 1.45 }}>{tool.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
