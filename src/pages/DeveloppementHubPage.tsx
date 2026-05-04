// =============================================================================
// DeveloppementHubPage — hub centralisé "Mon développement" (2026-05-04)
//
// Regroupe sous un seul point d'entrée navigation :
//   - Academy (parcours niveaux)
//   - Formation (modules)
//   - Boîte à outils
//   - Cahier de bord
//   - Simulateur EBE
//   - FLEX expliqué
//   - Nouveautés (changelog distri)
//
// Sidebar passe de 4 entrées (Academy / Formation / Cahier / Simu) à 1 entrée
// (Mon développement). Chaque carte mène vers la page existante (URLs intactes).
// =============================================================================

import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

interface HubCard {
  id: string;
  emoji: string;
  title: string;
  description: string;
  cta: string;
  path: string;
  accent: string;
  /** Tag affiché en haut à droite. */
  tag?: { label: string; color: string };
  /** Nécessite un rôle spécifique. */
  requireRole?: "admin";
}

const CARDS: HubCard[] = [
  {
    id: "academy",
    emoji: "🎓",
    title: "Mes parcours",
    description:
      "3 niveaux guidés Lor'Squad : démarrer, fidéliser, dupliquer. Modules + quiz + ancrages.",
    cta: "Reprendre mes parcours",
    path: "/academy",
    accent: "var(--ls-purple)",
    requireRole: "admin",
  },
  {
    id: "formation",
    emoji: "📚",
    title: "Modules de formation",
    description:
      "Toutes les leçons Lor'Squad par catégorie : prospection, bilan, suivi, business.",
    cta: "Explorer les modules",
    path: "/formation",
    accent: "var(--ls-gold)",
  },
  {
    id: "outils",
    emoji: "🛠",
    title: "Boîte à outils",
    description:
      "Scripts, checklists, templates prêts à l'emploi pour chaque étape de ton activité.",
    cta: "Ouvrir la boîte",
    path: "/formation/boite-a-outils",
    accent: "var(--ls-teal)",
  },
  {
    id: "cahier",
    emoji: "📔",
    title: "Cahier de bord",
    description:
      "Mes 21 jours cobaye, ma liste 100 connaissances, mon journal EBE perso.",
    cta: "Ouvrir mon cahier",
    path: "/cahier-de-bord",
    accent: "var(--ls-coral)",
    tag: { label: "Nouveau", color: "var(--ls-coral)" },
  },
  {
    id: "simulateur",
    emoji: "🎯",
    title: "Simulateur EBE",
    description:
      "Entraîne-toi à mener un EBE complet face à un faux prospect. 6 étapes, scoring, debrief.",
    cta: "Démarrer un EBE",
    path: "/simulateur-ebe",
    accent: "var(--ls-purple)",
    tag: { label: "Nouveau", color: "var(--ls-coral)" },
  },
  {
    id: "flex-explique",
    emoji: "⚡",
    title: "Comment marche FLEX",
    description:
      "Le moteur 5-3-1 expliqué pas à pas : pourquoi des cibles, comment les lire, quoi en faire.",
    cta: "Comprendre FLEX",
    path: "/developpement/flex-explique",
    accent: "var(--ls-gold)",
  },
  {
    id: "nouveautes",
    emoji: "🆕",
    title: "Nouveautés app",
    description:
      "Le journal des nouvelles features de l'app. Reste au courant des derniers ajouts.",
    cta: "Voir le journal",
    path: "/developpement/nouveautes",
    accent: "var(--ls-teal)",
    tag: { label: "Live", color: "var(--ls-teal)" },
  },
];

export function DeveloppementHubPage() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();

  const visibleCards = CARDS.filter((c) => {
    if (c.requireRole === "admin") return currentUser?.role === "admin";
    return true;
  });

  return (
    <div style={pageWrap}>
      {/* Hero */}
      <div style={heroBox}>
        <div style={heroEyebrow}>✦ Mon développement</div>
        <h1 style={heroTitle}>Tout ce qu'il faut pour grandir</h1>
        <p style={heroSubtitle}>
          Apprendre, m'entraîner, suivre ma progression. Tout est ici, en un seul endroit.
        </p>
      </div>

      {/* Grid cards */}
      <div style={gridStyle}>
        {visibleCards.map((card, i) => (
          <button
            key={card.id}
            type="button"
            onClick={() => navigate(card.path)}
            style={{
              ...cardStyle(card.accent),
              animationDelay: `${i * 60}ms`,
            }}
            className="ls-hub-card"
          >
            {card.tag && (
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  fontSize: 9,
                  fontFamily: "DM Sans, sans-serif",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  color: card.tag.color,
                  padding: "3px 8px",
                  borderRadius: 8,
                  background: `color-mix(in srgb, ${card.tag.color} 14%, transparent)`,
                  border: `0.5px solid ${card.tag.color}`,
                }}
              >
                {card.tag.label}
              </div>
            )}
            <div style={emojiCircleStyle(card.accent)}>{card.emoji}</div>
            <h3 style={cardTitleStyle}>{card.title}</h3>
            <p style={cardDescStyle}>{card.description}</p>
            <div style={ctaStyle(card.accent)}>
              {card.cta} <span style={{ marginLeft: 4 }}>→</span>
            </div>
          </button>
        ))}
      </div>

      {/* Footer help */}
      <div style={footerHelpStyle}>
        <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14, marginBottom: 6, color: "var(--ls-text)" }}>
          💡 Comment t'organiser
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7, color: "var(--ls-text-muted)" }}>
          <li><strong>Tu débutes ?</strong> Commence par <em>Modules de formation</em> niveau 1 + remplis ton <em>Cahier de bord</em> jour J0.</li>
          <li><strong>Tu prépares un RDV ?</strong> Lance le <em>Simulateur EBE</em> 1 fois pour te chauffer.</li>
          <li><strong>Tu doutes sur FLEX ?</strong> <em>Comment marche FLEX</em> répond aux questions les plus fréquentes.</li>
        </ul>
      </div>

      <style>{`
        .ls-hub-card {
          opacity: 0;
          animation: ls-hub-fadeup 0.5s ease forwards;
        }
        .ls-hub-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 34px color-mix(in srgb, var(--ls-text) 12%, transparent);
        }
        @keyframes ls-hub-fadeup {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ls-hub-card {
            animation: none;
            opacity: 1;
          }
          .ls-hub-card:hover {
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const pageWrap: React.CSSProperties = {
  maxWidth: 1080,
  margin: "0 auto",
  padding: "20px 18px 60px",
};

const heroBox: React.CSSProperties = {
  background:
    "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 10%, var(--ls-surface)), color-mix(in srgb, var(--ls-purple) 10%, var(--ls-surface)))",
  border: "0.5px solid color-mix(in srgb, var(--ls-gold) 25%, var(--ls-border))",
  borderRadius: 20,
  padding: "26px 22px",
  marginBottom: 22,
};

const heroEyebrow: React.CSSProperties = {
  fontFamily: "DM Sans, sans-serif",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 1.4,
  color: "var(--ls-gold)",
  marginBottom: 8,
};

const heroTitle: React.CSSProperties = {
  margin: 0,
  fontFamily: "Syne, sans-serif",
  fontSize: 28,
  fontWeight: 800,
  color: "var(--ls-text)",
  lineHeight: 1.15,
};

const heroSubtitle: React.CSSProperties = {
  margin: "8px 0 0",
  fontSize: 15,
  lineHeight: 1.55,
  color: "var(--ls-text-muted)",
  maxWidth: 620,
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: 14,
};

const cardStyle = (accent: string): React.CSSProperties => ({
  position: "relative",
  textAlign: "left",
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderTop: `3px solid ${accent}`,
  borderRadius: 16,
  padding: "20px 18px",
  cursor: "pointer",
  transition: "transform 0.22s ease, box-shadow 0.22s ease",
  display: "flex",
  flexDirection: "column",
  gap: 10,
});

const emojiCircleStyle = (accent: string): React.CSSProperties => ({
  width: 52,
  height: 52,
  borderRadius: 14,
  background: `color-mix(in srgb, ${accent} 14%, var(--ls-surface2))`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 26,
  marginBottom: 4,
});

const cardTitleStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "Syne, sans-serif",
  fontSize: 17,
  fontWeight: 700,
  color: "var(--ls-text)",
};

const cardDescStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.55,
  color: "var(--ls-text-muted)",
  flex: 1,
};

const ctaStyle = (accent: string): React.CSSProperties => ({
  marginTop: 8,
  fontSize: 12,
  fontFamily: "DM Sans, sans-serif",
  fontWeight: 700,
  color: accent,
  textTransform: "uppercase",
  letterSpacing: 0.8,
  display: "flex",
  alignItems: "center",
});

const footerHelpStyle: React.CSSProperties = {
  marginTop: 26,
  padding: "16px 18px",
  background: "var(--ls-surface2)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 12,
};
