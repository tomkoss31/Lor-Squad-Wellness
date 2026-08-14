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
import { JargonTip } from "../components/ui/JargonTip";
import type { JargonKey } from "../data/jargon";
import { useAppLevel } from "../hooks/useAppLevel";
import type { FeatureKey } from "../config/appVisibility";

interface ToolCard {
  id: string;
  icon: string;
  iconBg: string;
  name: string;
  desc: string;
  path?: string;
  soon?: boolean;
  /** Si défini, ajoute une bulle ⓘ à côté du nom pour expliquer le mot. */
  infoTerm?: JargonKey;
  /** Clé de visibilité — cf. src/config/appVisibility.ts */
  feature: FeatureKey;
}

// Chantier Simplification (2026-07-27) — LOT 3.
// L'encaissement est sorti de la liste : c'est l'outil qui fait rentrer
// l'argent, il est désormais mis en avant en carte pleine largeur au-dessus des
// sections (et en 1re position du menu). Il était perdu en 3e section.
// L'ordre des sections suit le geste du coach : vendre → partager → mesurer.
const ENCAISSEMENT_CARD = {
  name: "Encaissement",
  desc: "Encaisse tes clients en carte bancaire dès la fin du bilan. Tu configures ton compte une fois — l'argent va direct chez toi, on ne prend rien au passage.",
  path: "/encaissement",
};

const TOOLS: { section: string; items: ToolCard[] }[] = [
  {
    // B7 (2026-06-13) : carte « Devis » retirée (décision Thomas). Réversible —
    // le placeholder « Bientôt » a été supprimé pour aérer.
    section: "🛒 Vendre",
    items: [
      {
        id: "panier",
        icon: "🛒",
        iconBg: "color-mix(in srgb, var(--ls-teal) 18%, transparent)",
        name: "Panier",
        desc: "Calcule un panier produits : total €, total PV, remise client (5 → 35 %), récap copiable.",
        path: "/panier",
        feature: "business.panier",
      },
      {
        id: "ventes-comptoir",
        icon: "🏪",
        iconBg: "color-mix(in srgb, var(--ls-teal) 16%, transparent)",
        name: "Ventes comptoir",
        desc: "Le répertoire de tes ventes au comptoir, classées par mois — sans créer de fiche client. Le total remonte dans ta rentabilité.",
        path: "/ventes-comptoir",
        feature: "business.ventes-comptoir",
      },
      {
        id: "ma-boutique",
        icon: "🌿",
        iconBg: "color-mix(in srgb, var(--ls-teal) 16%, transparent)",
        name: "Ma boutique HL Skin",
        desc: "Ta boutique de cosmétiques coréens à ton nom : vitrine, panier, codes promo, commandes. Partage ton lien, encaisse sur ton Stripe.",
        path: "/ma-boutique",
        feature: "business.boutique",
      },
    ],
  },
  {
    section: "🔗 Partager & prospecter",
    items: [
      {
        id: "mes-liens",
        icon: "🔗",
        iconBg: "color-mix(in srgb, var(--ls-teal) 16%, transparent)",
        name: "Mes liens",
        desc: "Tous tes liens publics (bilan, business, coach, VIP…) prêts à copier, QR, WhatsApp.",
        path: "/mes-liens",
        feature: "business.mes-liens",
      },
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
        infoTerm: "prospect",
        feature: "business.prospecter",
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
        feature: "business.liste-100",
      },
    ],
  },
  {
    section: "📊 Mes chiffres",
    items: [
      {
        id: "rentabilite",
        icon: "💎",
        iconBg: "color-mix(in srgb, var(--ls-purple) 16%, transparent)",
        name: "Rentabilité",
        desc: "Ta marge du mois, ta projection et le détail complet (vente directe + overrides équipe). Vue avant réservée au Co-pilote.",
        path: "/rentabilite",
        infoTerm: "rentabilite",
        feature: "business.rentabilite",
      },
      {
        id: "pv",
        icon: "💰",
        iconBg: "color-mix(in srgb, var(--ls-teal) 18%, transparent)",
        name: "Suivi PV",
        desc: "L'historique de tes points de volume, échéances et relances à faire.",
        path: "/pv",
        infoTerm: "pv",
        feature: "business.pv",
      },
      {
        id: "plan-marketing",
        icon: "🪜",
        iconBg: "color-mix(in srgb, var(--ls-teal) 18%, transparent)",
        name: "Plan Marketing",
        desc: "L'échelle des rangs Herbalife (Distributor → President's) : où tu en es, comment passer chaque palier, ce que ça rapporte.",
        path: "/plan-marketing",
        feature: "business.plan-marketing",
      },
    ],
  },
];

export function OutilsPage() {
  const navigate = useNavigate();
  // Niveau de visibilité (LOT 3) : une carte masquée ne l'est que dans le
  // menu — la route reste joignable par lien direct.
  const { can } = useAppLevel();
  const sections = TOOLS.map((grp) => ({
    ...grp,
    items: grp.items.filter((tool) => can(tool.feature)),
  })).filter((grp) => grp.items.length > 0);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "8px 4px 60px" }}>
      {/* Hero */}
      <div style={{ fontFamily: "Syne, sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", color: "var(--ls-teal)" }}>
        Pilote ton activité
      </div>
      <h1 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, textTransform: "uppercase", fontSize: "clamp(26px,5vw,32px)", letterSpacing: "-0.5px", margin: "8px 0 4px", color: "var(--ls-text)" }}>
        Mon{" "}
        <span style={{ background: "linear-gradient(135deg,var(--ls-teal),var(--ls-purple))", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          business
        </span>
      </h1>
      <p style={{ color: "var(--ls-text-muted)", fontSize: 14, marginBottom: 22, fontFamily: "DM Sans, sans-serif" }}>
        Encaisser, vendre, partager tes liens et suivre tes chiffres : tout ce qui fait tourner ton activité est ici.
      </p>

      {/* ═══ Encaissement — carte mise en lumière (LOT 3, 2026-07-27) ═══
          Demande Thomas : « encaissement super important à mettre en lumière ».
          C'était une carte parmi 11, en 3e section. C'est le seul outil de la
          page qui fait rentrer de l'argent — il passe en pleine largeur, en
          tête, avant toute autre chose. */}
      {can("business.encaissement") ? (
        <button
          type="button"
          onClick={() => navigate(ENCAISSEMENT_CARD.path)}
          style={{
            width: "100%",
            textAlign: "left",
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "20px 20px",
            marginBottom: 6,
            borderRadius: 18,
            cursor: "pointer",
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--ls-teal) 14%, var(--ls-surface)) 0%, color-mix(in srgb, var(--ls-purple) 10%, var(--ls-surface)) 100%)",
            border: "1px solid color-mix(in srgb, var(--ls-teal) 42%, var(--ls-border))",
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow =
              "0 6px 20px color-mix(in srgb, var(--ls-teal) 22%, transparent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <div
            style={{
              flex: "0 0 auto",
              width: 56,
              height: 56,
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              background: "color-mix(in srgb, var(--ls-teal) 20%, transparent)",
            }}
          >
            💳
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "Syne, sans-serif",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1.8,
                textTransform: "uppercase",
                color: "var(--ls-teal)",
                marginBottom: 3,
              }}
            >
              Le plus important
            </div>
            <div style={{ fontWeight: 700, fontSize: 17, color: "var(--ls-text)", fontFamily: "DM Sans, sans-serif" }}>
              {ENCAISSEMENT_CARD.name}
            </div>
            <div style={{ fontSize: 13, color: "var(--ls-text-muted)", marginTop: 4, lineHeight: 1.45 }}>
              {ENCAISSEMENT_CARD.desc}
            </div>
          </div>
          <span aria-hidden="true" style={{ color: "var(--ls-teal)", fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
            →
          </span>
        </button>
      ) : null}

      {sections.map((grp) => (
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
                    {tool.infoTerm ? <JargonTip term={tool.infoTerm} /> : null}
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
