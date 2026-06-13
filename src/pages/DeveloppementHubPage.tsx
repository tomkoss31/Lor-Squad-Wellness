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
//
// Chantier onboarding 2026-05-27 (plan A) :
//   - Academy ouverte à tous les distri (carte "Commence ici")
//   - Bandeau progression Academy en hero tant que !isCompleted
//   - Gate UI "🔒 Academy X%" sur 4 cartes (Boîte à outils @ 50%,
//     Simulateur EBE / Prospection internationale / Comment marche la
//     prospection @ 100%). Click locked → /academy.
//   - Admin bypasse toutes les gates (isAdmin).
//   - Cartes "Témoignages clients" et "Fiche distri enrichie" retirées
//     (déjà accessibles via fiche client / Mon équipe).
// =============================================================================

import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { useAcademyProgress } from "../features/academy/hooks/useAcademyProgress";

/** Sections du hub (remaniement 2026-06-10) : la grille à plat mélangeait
    outils du quotidien, pédagogie, prospection et admin → illisible. */
type HubSectionId = "quotidien" | "apprendre" | "admin";

const SECTIONS: { id: HubSectionId; title: string; sub?: string }[] = [
  { id: "quotidien", title: "⚡ Mes outils du quotidien", sub: "Ce que tu ouvres tous les jours." },
  { id: "apprendre", title: "🎓 Apprendre", sub: "Monter en compétence, à ton rythme." },
  // Section "prospecter" retirée 2026-06-13 (B4/B5) : « Prospecter » vit sous
  // « Mon business ». Le hub développement = apprendre + quotidien + admin.
  { id: "admin", title: "🛠 Admin", sub: "Réservé aux admins." },
];

interface HubCard {
  id: string;
  emoji: string;
  title: string;
  description: string;
  cta: string;
  path: string;
  accent: string;
  /** Section de rattachement (remaniement 2026-06-10). */
  section: HubSectionId;
  /** Tag affiché en haut à droite. */
  tag?: { label: string; color: string };
  /** Nécessite un rôle spécifique. */
  requireRole?: "admin";
  /** Nécessite Academy complétée à X% (0-100). Bypass admin. */
  requireAcademyPercent?: number;
}

const CARDS: HubCard[] = [
  {
    id: "academy",
    emoji: "🎓",
    title: "Apprendre l'app La Base 360",
    description:
      "Tour guidé + Academy interactive pour maîtriser tous les outils de l'app.",
    cta: "Apprendre l'app",
    path: "/academy",
    accent: "var(--ls-purple)",
    section: "apprendre",
    tag: { label: "Commence ici", color: "var(--ls-gold)" },
  },
  {
    id: "formation",
    emoji: "📚",
    title: "Formation distributeur Herbalife",
    description:
      "La méthode complète en 3 niveaux : Démarrer, Construire, Dupliquer.",
    cta: "Démarrer la formation",
    path: "/formation",
    accent: "var(--ls-gold)",
    section: "apprendre",
  },
  {
    id: "outils",
    emoji: "🛠",
    title: "Boîte à outils",
    description: "Scripts, checklists et templates prêts à l'emploi.",
    cta: "Ouvrir la boîte",
    path: "/formation/boite-a-outils",
    accent: "var(--ls-teal)",
    section: "apprendre",
    requireAcademyPercent: 50,
  },
  {
    id: "cahier",
    emoji: "📔",
    title: "Cahier de bord",
    description: "21 jours cobaye, liste 100 connaissances, journal EBE perso.",
    cta: "Ouvrir mon cahier",
    path: "/cahier-de-bord",
    accent: "var(--ls-coral)",
    section: "quotidien",
    tag: { label: "Nouveau", color: "var(--ls-coral)" },
  },
  {
    id: "simulateur",
    emoji: "🎯",
    title: "Simulateur EBE",
    description: "Entraîne-toi face à un faux prospect : 6 étapes, scoring, debrief.",
    cta: "Démarrer un EBE",
    path: "/simulateur-ebe",
    accent: "var(--ls-purple)",
    section: "apprendre",
    tag: { label: "Nouveau", color: "var(--ls-coral)" },
    requireAcademyPercent: 100,
  },
  {
    id: "routine-du-jour",
    emoji: "☀️",
    title: "Ma routine du jour",
    description: "Tes 5 actions de discipline du jour. Score X/5, jamais bloquante.",
    cta: "Ouvrir ma routine",
    path: "/routine-du-jour",
    accent: "var(--ls-gold)",
    section: "quotidien",
    tag: { label: "Nouveau", color: "var(--ls-coral)" },
  },
  // Cartes "Comment marche ma routine" et "Comment marche FLEX" retirées
  // 2026-06-10 (remaniement) : les fiches restent accessibles via le bouton
  // 📖 directement sur /routine-du-jour et /flex — doublon de navigation
  // supprimé pour aérer le hub.
  // Card "Nouveautés app" retirée 2026-06-10 (retour Thomas) : remplacée par
  // la cloche 🔔 du header qui s'illumine quand il y a du non-lu (petite,
  // mobile, visible partout). Le journal reste sur /developpement/nouveautes
  // via "Voir tout" du dropdown cloche.
  //
  // Card "Outil de prospection" retirée 2026-06-13 (B4/B5) : « Prospecter »
  // est désormais une porte UNIQUE sous « Mon business » (faire/piloter). Le
  // hub « Mon développement » redevient 100 % pédago — une feature, un endroit.
  {
    id: "club-vip-explique",
    emoji: "👑",
    title: "Club VIP — mode d'emploi",
    description: "Le workflow en 5 étapes : pitcher, inviter, activer, récolter les recos, convertir.",
    cta: "Lire la fiche",
    path: "/developpement/club-vip-explique",
    accent: "var(--ls-gold)",
    // B5 (2026-06-13) : c'est un « mode d'emploi » → pédago, donc section Apprendre.
    section: "apprendre",
    tag: { label: "Nouveau", color: "var(--ls-coral)" },
  },
  {
    id: "admin-prospection",
    emoji: "🛠",
    title: "Admin Prospection",
    description: "Édite les scripts et briefs méthodo du kit prospection.",
    cta: "Ouvrir l'admin",
    path: "/admin/prospection",
    accent: "var(--ls-purple)",
    section: "admin",
    requireRole: "admin",
  },
  // Card "Mon bilan online" retirée 2026-06-10 (retour Thomas) : doublon —
  // le bilan online vit dans l'Outil de prospection (sous-page dédiée) et
  // les leads dans Dossiers clients > onglet Leads.
  {
    id: "newsletters",
    emoji: "📰",
    title: "Newsletters",
    description: "Crée, édite et envoie les éditions La Base 360 News.",
    cta: "Ouvrir l'admin",
    path: "/admin/newsletters",
    accent: "var(--ls-coral)",
    section: "admin",
    tag: { label: "Nouveau", color: "var(--ls-coral)" },
    requireRole: "admin",
  },
  // Cartes "Témoignages clients" et "Fiche distri enrichie" retirées
  // 2026-05-27 (chantier onboarding plan A) : flux déjà accessibles via
  // fiche client (request-testimonial) et via Mon équipe / Paramètres >
  // Équipe. Évite la duplication de navigation.
];

export function DeveloppementHubPage() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const { view: academy } = useAcademyProgress();
  const isAdmin = currentUser?.role === "admin";

  const visibleCards = CARDS.filter((c) => {
    if (c.requireRole === "admin") return isAdmin;
    return true;
  }).map((c) => {
    const required = c.requireAcademyPercent ?? 0;
    const isLocked =
      !isAdmin && required > 0 && academy.percentComplete < required;
    return { ...c, isLocked, requiredPercent: required };
  });

  // Remaniement 2026-06-10 : grille à plat → sections thématiques.
  const sections = SECTIONS.map((s) => ({
    ...s,
    cards: visibleCards.filter((c) => c.section === s.id),
  })).filter((s) => s.cards.length > 0);

  const showAcademyBanner = !isAdmin && !academy.isCompleted;

  return (
    <div style={pageWrap}>
      {/* Hero */}
      <div style={heroBox}>
        <div style={heroEyebrow}>✦ Mon développement</div>
        <h1 style={heroTitle}>Tout ce qu'il faut pour grandir</h1>
        <p style={heroSubtitle}>
          Apprendre, m'entraîner, suivre ma progression. Tout est ici, en un seul endroit.
        </p>
        {showAcademyBanner && (
          <button
            type="button"
            onClick={() => navigate("/academy")}
            style={academyBannerStyle}
          >
            <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
              <div style={academyBannerTitleStyle}>
                🎓 {academy.hasStarted ? "Continue l'Academy" : "Commence par l'Academy"}
              </div>
              <div style={academyBannerSubStyle}>
                {academy.completedCount}/{academy.totalCount} sections · {academy.percentComplete}% · Termine pour débloquer Boîte à outils et Simulateur EBE.
              </div>
              <div style={academyBannerBarTrack}>
                <div
                  style={{
                    ...academyBannerBarFill,
                    width: `${Math.max(2, academy.percentComplete)}%`,
                  }}
                />
              </div>
            </div>
            <div style={academyBannerCtaStyle}>
              {academy.hasStarted ? "Reprendre" : "Démarrer"} →
            </div>
          </button>
        )}
      </div>

      {/* Comment t'organiser — en haut, version courte (retours Thomas
          2026-06-10 : remonté, puis allégé pour limiter la lecture). */}
      <div style={organiserBoxStyle}>
        <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13.5, marginBottom: 5, color: "var(--ls-text)" }}>
          💡 Comment t'organiser
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.65, color: "var(--ls-text-muted)" }}>
          <li><strong>Tu débutes ?</strong> Academy → Formation niveau 1 → Cahier de bord J0.</li>
          <li><strong>Au quotidien :</strong> Ma routine du jour (5 min) + cahier à jour après chaque prospection.</li>
          <li><strong>Une question sur un outil ?</strong> Le bouton 📖 est sur chaque page.</li>
        </ul>
      </div>

      {/* Sections de cards */}
      {sections.map((section) => (
        <div key={section.id} style={sectionBlockStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={sectionTitleStyle}>{section.title}</h2>
            {section.sub ? <span style={sectionSubStyle}>{section.sub}</span> : null}
          </div>
          <div style={gridStyle}>
            {section.cards.map((card, i) => (
          <button
            key={card.id}
            type="button"
            data-tour-id={`hub-card-${card.id}`}
            onClick={() => navigate(card.isLocked ? "/academy" : card.path)}
            style={{
              ...cardStyle(card.accent),
              opacity: card.isLocked ? 0.62 : 1,
              animationDelay: `${i * 60}ms`,
            }}
            className="ls-hub-card"
            aria-label={
              card.isLocked
                ? `${card.title} (verrouillé jusqu'à Academy ${card.requiredPercent}%)`
                : card.title
            }
          >
            {card.isLocked ? (
              <div style={lockBadgeStyle}>🔒 Academy {card.requiredPercent}%</div>
            ) : card.tag ? (
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
            ) : null}
            <div style={emojiCircleStyle(card.accent)}>
              {card.isLocked ? "🔒" : card.emoji}
            </div>
            <h3 style={cardTitleStyle}>{card.title}</h3>
            <p style={cardDescStyle}>{card.description}</p>
            {card.isLocked ? (
              <div style={ctaStyle("var(--ls-text-muted)")}>
                Termine l'Academy <span style={{ marginLeft: 4 }}>→</span>
              </div>
            ) : (
              <div style={ctaStyle(card.accent)}>
                {card.cta} <span style={{ marginLeft: 4 }}>→</span>
              </div>
            )}
          </button>
            ))}
          </div>
        </div>
      ))}

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

// Compactage 2026-06-10 (retour Thomas : cards trop grosses, trop de
// lecture) : icônes 40px, paddings et typos resserrés, grilles plus denses.
const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(235px, 1fr))",
  gap: 12,
};

const cardStyle = (accent: string): React.CSSProperties => ({
  position: "relative",
  textAlign: "left",
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderTop: `3px solid ${accent}`,
  borderRadius: 14,
  padding: "14px 14px 13px",
  cursor: "pointer",
  transition: "transform 0.22s ease, box-shadow 0.22s ease",
  display: "flex",
  flexDirection: "column",
  gap: 7,
});

const emojiCircleStyle = (accent: string): React.CSSProperties => ({
  width: 40,
  height: 40,
  borderRadius: 11,
  background: `color-mix(in srgb, ${accent} 14%, var(--ls-surface2))`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 20,
  marginBottom: 2,
});

const cardTitleStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "Syne, sans-serif",
  fontSize: 15,
  fontWeight: 700,
  color: "var(--ls-text)",
};

const cardDescStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 12.5,
  lineHeight: 1.5,
  color: "var(--ls-text-muted)",
  flex: 1,
};

const ctaStyle = (accent: string): React.CSSProperties => ({
  marginTop: 4,
  fontSize: 11,
  fontFamily: "DM Sans, sans-serif",
  fontWeight: 700,
  color: accent,
  textTransform: "uppercase",
  letterSpacing: 0.8,
  display: "flex",
  alignItems: "center",
});

// Remaniement 2026-06-10 — bloc "Comment t'organiser" remonté en haut
// + en-têtes de sections thématiques.
const organiserBoxStyle: React.CSSProperties = {
  marginBottom: 26,
  padding: "16px 18px",
  background: "var(--ls-surface2)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 12,
};

const sectionBlockStyle: React.CSSProperties = {
  marginBottom: 24,
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 10,
  flexWrap: "wrap",
  marginBottom: 12,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "Syne, sans-serif",
  fontSize: 17,
  fontWeight: 800,
  color: "var(--ls-text)",
};

const sectionSubStyle: React.CSSProperties = {
  fontSize: 12.5,
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
};

// ─── Banner Academy (chantier onboarding 2026-05-27) ───────────────────────

const academyBannerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  width: "100%",
  marginTop: 18,
  padding: "14px 16px",
  background: "color-mix(in srgb, var(--ls-purple) 14%, var(--ls-surface))",
  border: "0.5px solid color-mix(in srgb, var(--ls-purple) 40%, var(--ls-border))",
  borderRadius: 14,
  cursor: "pointer",
  textAlign: "left",
};

const academyBannerTitleStyle: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontSize: 14,
  fontWeight: 700,
  color: "var(--ls-text)",
  marginBottom: 4,
};

const academyBannerSubStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--ls-text-muted)",
  lineHeight: 1.45,
  marginBottom: 8,
};

const academyBannerBarTrack: React.CSSProperties = {
  width: "100%",
  height: 6,
  background: "color-mix(in srgb, var(--ls-text) 8%, transparent)",
  borderRadius: 100,
  overflow: "hidden",
};

const academyBannerBarFill: React.CSSProperties = {
  height: "100%",
  background: "linear-gradient(90deg, var(--ls-purple), var(--ls-gold))",
  borderRadius: 100,
  transition: "width 0.4s ease",
};

const academyBannerCtaStyle: React.CSSProperties = {
  fontSize: 12,
  fontFamily: "DM Sans, sans-serif",
  fontWeight: 700,
  color: "var(--ls-purple)",
  textTransform: "uppercase",
  letterSpacing: 0.8,
  whiteSpace: "nowrap",
};

const lockBadgeStyle: React.CSSProperties = {
  position: "absolute",
  top: 12,
  right: 12,
  fontSize: 9,
  fontFamily: "DM Sans, sans-serif",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.8,
  color: "var(--ls-text-muted)",
  padding: "3px 8px",
  borderRadius: 8,
  background: "color-mix(in srgb, var(--ls-text) 6%, transparent)",
  border: "0.5px solid color-mix(in srgb, var(--ls-text) 18%, transparent)",
};
