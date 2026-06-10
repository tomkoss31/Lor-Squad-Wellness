// =============================================================================
// OutilsProspectionMerePage — page mère "Outil de prospection" (chantier 3
// remaniement 2026-06-10, maquette validée Thomas).
//
// Point d'entrée éducatif unique de la prospection :
//   - Hero + parcours "comment ça marche" en 3 étapes
//   - Stats leads (réutilise ReferrerStatsCard)
//   - 3 sous-pages : /outils-prospection/bilan-online · /liens · /international
//   - Bloc "Comment t'organiser" en bas
//
// Accès (révision Thomas 2026-06-10) : OUVERT À TOUS les distri. Seule la
// sous-page Internationale est verrouillée Academy 100% (admin bypass).
// Le mode contextuel historique ?client=ID (depuis SendBusinessPlanButton /
// ReferrerStatsCard) est forwardé vers la sous-page Liens qui porte ce flow.
//
// Tokens var(--ls-*) uniquement (règle app coach interne).
// =============================================================================

import { useEffect } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { ReferrerStatsCard } from "../components/copilote/ReferrerStatsCard";

interface SubPageDef {
  id: string;
  emoji: string;
  title: string;
  description: string;
  path: string;
  accent: string;
}

const SUB_PAGES: SubPageDef[] = [
  {
    id: "bilan-online",
    emoji: "🌱",
    title: "Mon bilan online",
    description:
      "Ton lien bilan + ta fiche publique. Comment les partager, quoi faire des leads qui arrivent, comment les classer.",
    path: "/outils-prospection/bilan-online",
    accent: "var(--ls-teal)",
  },
  {
    id: "liens",
    emoji: "🔗",
    title: "Mes liens marketing",
    description:
      "Funnel opportunité, page éducative, simulateur de revenus, docs imprimables (chiffres 2026) + tes futures vidéos.",
    path: "/outils-prospection/liens",
    accent: "var(--ls-purple)",
  },
  {
    id: "international",
    emoji: "🌍",
    title: "Prospection internationale",
    description:
      "La méthode d'abord (tri, erreurs débutant, métriques réalistes), puis le kit 6 marchés × 4 profils × 10 sections.",
    path: "/outils-prospection/international",
    accent: "var(--ls-coral)",
  },
];

const STEPS: { title: string; detail: string }[] = [
  {
    title: "1 · Tu partages",
    detail: "Ton lien bilan, ta fiche publique, tes docs marketing — chaque lien embarque ton ID coach.",
  },
  {
    title: "2 · Les leads arrivent",
    detail: "Push reçue à chaque bilan rempli, le lead atterrit dans Dossiers clients > onglet Leads.",
  },
  {
    title: "3 · Tu convertis",
    detail: "Kanban de classement, relance auto J+3, RDV bilan, conversion en fiche client.",
  },
];

export function OutilsProspectionMerePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { currentUser } = useAppContext();

  useEffect(() => {
    document.title = "La Base 360 — Outil de prospection";
  }, []);

  if (!currentUser) return null;

  // Mode contextuel historique ?client=ID → porté par la sous-page Liens.
  if (params.get("client")) {
    return <Navigate to={`/outils-prospection/liens?${params.toString()}`} replace />;
  }

  return (
    <div style={pageWrap}>
      {/* Hero */}
      <header style={heroBox}>
        <div style={heroEyebrow}>🎯 Outil de prospection</div>
        <h1 style={heroTitle}>Ta machine à prospects, expliquée pas à pas</h1>
        <p style={heroSubtitle}>
          Tout ce qu'il faut pour trouver, capter et convertir : tes liens à
          partager, ta vitrine publique, et la méthode pour traiter chaque lead.
        </p>
        <div style={stepsGrid}>
          {STEPS.map((s) => (
            <div key={s.title} style={stepCard}>
              <div style={stepTitle}>{s.title}</div>
              <div style={stepDetail}>{s.detail}</div>
            </div>
          ))}
        </div>
      </header>

      {/* Éducation mise en valeur (retour recette Thomas 2026-06-10) : la
          méthode AVANT les outils — c'était une card noyée dans le hub,
          elle vit maintenant ici, en premier. */}
      <button
        type="button"
        onClick={() => navigate("/developpement/prospection-explique")}
        style={eduFeatureCard}
        className="opm-card"
      >
        <span aria-hidden="true" style={eduFeatureEmoji}>📖</span>
        <span style={{ flex: 1, minWidth: 200, textAlign: "left" }}>
          <span style={eduFeatureTag}>Commence ici</span>
          <span style={eduFeatureTitle}>Comment marche la prospection</span>
          <span style={eduFeatureDesc}>
            La méthode avant les outils : on trie, on ne convainc pas · les 5
            erreurs débutant · des métriques réalistes. 5 minutes de lecture
            qui changent tout.
          </span>
        </span>
        <span style={eduFeatureCta}>Lire la fiche →</span>
      </button>

      {/* Stats leads du mois */}
      <div style={{ margin: "18px 0" }}>
        <ReferrerStatsCard />
      </div>

      {/* Sous-pages */}
      <div style={subGrid}>
        {SUB_PAGES.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => navigate(p.path)}
            style={subCard(p.accent)}
            className="opm-card"
          >
            <span aria-hidden="true" style={subEmoji(p.accent)}>
              {p.emoji}
            </span>
            <span style={subTitle}>{p.title}</span>
            <span style={subDesc}>{p.description}</span>
            <span style={subCta(p.accent)}>Ouvrir →</span>
          </button>
        ))}
      </div>

      {/* Comment t'organiser */}
      <footer style={organiserBox}>
        <div style={organiserTitle}>💡 Comment t'organiser</div>
        <ul style={organiserList}>
          <li>
            <strong>Chaque matin :</strong> 1 story avec ton lien bilan ou ta
            fiche publique. La régularité bat l'intensité.
          </li>
          <li>
            <strong>Chaque lead reçu :</strong> réponds sous 24 h, classe-le
            dans le kanban Leads — la relance J+3 part automatiquement si tu ne
            fais rien.
          </li>
          <li>
            <strong>Chaque RDV physique :</strong> doc prospect imprimé + QR de
            ta fiche publique. Le prospect repart toujours avec un lien.
          </li>
        </ul>
      </footer>

      <style>{`
        .opm-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 34px color-mix(in srgb, var(--ls-text) 12%, transparent);
        }
        @media (prefers-reduced-motion: reduce) {
          .opm-card:hover { transform: none; }
        }
      `}</style>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const pageWrap: React.CSSProperties = {
  maxWidth: 1080,
  margin: "0 auto",
  padding: "20px 18px 60px",
};

const heroBox: React.CSSProperties = {
  background:
    "linear-gradient(135deg, color-mix(in srgb, var(--ls-teal) 10%, var(--ls-surface)), color-mix(in srgb, var(--ls-purple) 8%, var(--ls-surface)))",
  border: "0.5px solid color-mix(in srgb, var(--ls-teal) 28%, var(--ls-border))",
  borderRadius: 20,
  padding: "26px 22px",
};

const heroEyebrow: React.CSSProperties = {
  fontFamily: "DM Sans, sans-serif",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 1.4,
  color: "var(--ls-teal)",
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
  margin: "8px 0 18px",
  fontSize: 15,
  lineHeight: 1.55,
  color: "var(--ls-text-muted)",
  maxWidth: 640,
};

const stepsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 10,
};

const stepCard: React.CSSProperties = {
  background: "color-mix(in srgb, var(--ls-teal) 10%, var(--ls-surface))",
  border: "0.5px solid color-mix(in srgb, var(--ls-teal) 30%, transparent)",
  borderRadius: 12,
  padding: "12px 14px",
};

const stepTitle: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontSize: 13.5,
  fontWeight: 700,
  color: "var(--ls-text)",
  marginBottom: 3,
};

const stepDetail: React.CSSProperties = {
  fontSize: 12.5,
  lineHeight: 1.55,
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
};

// Card éducation mise en avant (retour recette Thomas 2026-06-10).
const eduFeatureCard: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  flexWrap: "wrap",
  width: "100%",
  marginTop: 16,
  padding: "18px 20px",
  background:
    "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 14%, var(--ls-surface)), var(--ls-surface))",
  border: "1px solid color-mix(in srgb, var(--ls-gold) 45%, var(--ls-border))",
  borderRadius: 16,
  cursor: "pointer",
  textAlign: "left",
  transition: "transform 0.22s ease, box-shadow 0.22s ease",
};

const eduFeatureEmoji: React.CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: 14,
  background: "color-mix(in srgb, var(--ls-gold) 16%, var(--ls-surface2))",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 26,
  flexShrink: 0,
};

const eduFeatureTag: React.CSSProperties = {
  display: "inline-block",
  fontSize: 10,
  fontFamily: "DM Sans, sans-serif",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.8,
  color: "var(--ls-gold)",
  padding: "2px 8px",
  borderRadius: 8,
  background: "color-mix(in srgb, var(--ls-gold) 14%, transparent)",
  border: "0.5px solid color-mix(in srgb, var(--ls-gold) 45%, transparent)",
  marginBottom: 6,
};

const eduFeatureTitle: React.CSSProperties = {
  display: "block",
  fontFamily: "Syne, sans-serif",
  fontSize: 18,
  fontWeight: 800,
  color: "var(--ls-text)",
  marginBottom: 4,
};

const eduFeatureDesc: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  lineHeight: 1.55,
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
};

const eduFeatureCta: React.CSSProperties = {
  fontSize: 12,
  fontFamily: "DM Sans, sans-serif",
  fontWeight: 700,
  color: "var(--ls-gold)",
  textTransform: "uppercase",
  letterSpacing: 0.8,
  whiteSpace: "nowrap",
};

const subGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 14,
};

const subCard = (accent: string): React.CSSProperties => ({
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

const subEmoji = (accent: string): React.CSSProperties => ({
  width: 52,
  height: 52,
  borderRadius: 14,
  background: `color-mix(in srgb, ${accent} 14%, var(--ls-surface2))`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 26,
});

const subTitle: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontSize: 17,
  fontWeight: 700,
  color: "var(--ls-text)",
};

const subDesc: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.55,
  color: "var(--ls-text-muted)",
  flex: 1,
  fontFamily: "DM Sans, sans-serif",
};

const subCta = (accent: string): React.CSSProperties => ({
  fontSize: 12,
  fontFamily: "DM Sans, sans-serif",
  fontWeight: 700,
  color: accent,
  textTransform: "uppercase",
  letterSpacing: 0.8,
});

const organiserBox: React.CSSProperties = {
  marginTop: 26,
  padding: "16px 18px",
  background: "var(--ls-surface2)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 12,
};

const organiserTitle: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontWeight: 700,
  fontSize: 14,
  marginBottom: 6,
  color: "var(--ls-text)",
};

const organiserList: React.CSSProperties = {
  margin: 0,
  paddingLeft: 18,
  fontSize: 13,
  lineHeight: 1.7,
  color: "var(--ls-text-muted)",
};
