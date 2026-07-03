// =============================================================================
// CheckListExpliquePage — tuto "Comment marche la check-list" (2026-05-20)
//
// Étape 2.6 chantier #2 (V2 2026-05-20 — page dédiée, plus de popup auto).
// Fiche pédagogique pour la routine. Pattern aligné sur
// ProspectionExpliquePage / FlexExpliquePage (DeveloppementHubPage > tuto).
// =============================================================================

import { useNavigate } from "react-router-dom";

interface Section {
  emoji: string;
  title: string;
  body: string;
  bullets?: string[];
  accent: string;
}

const SECTIONS: Section[] = [
  {
    emoji: "☀️",
    title: "5 minutes par jour, jamais plus",
    body:
      "La check-list quotidienne est une discipline, pas une corvée. Elle s'ouvre une fois par jour à la 1ère ouverture de l'app, te montre 5 actions à fort impact, et se ferme. Tu coches ce que tu fais, tu skips ce que tu ne feras pas — et demain matin elle revient avec ce qui restait.",
    bullets: [
      "5 actions = 5 minutes — pas un to-do géant qui décourage",
      "Skippable à tout moment (bouton « Plus tard ✕ ») — jamais bloquante",
      "Revient le lendemain : les pending + skipped repartent en pending",
      "Score X/5 affiché en haut — gamification douce, pas culpabilisante",
    ],
    accent: "var(--ls-gold)",
  },
  {
    emoji: "🎯",
    title: "Les 5 actions de la routine",
    body:
      "Chaque action a une source data : si la base ne te remonte rien, elle disparaît ou est remplacée par une action constructive. Pas de « rien à faire aujourd'hui » possible.",
    bullets: [
      "⏰ Suivis F1/F21 dus aujourd'hui — protocole = squelette de ton business",
      "🌱 Leads bilan online à qualifier — conversion court terme",
      "🔥 Clients dormants à relancer (> 60j sans commande) — anti-fuite",
      "📅 RDV du jour à confirmer / préparer — qualité de service",
      "📓 1 à 2 contacts de ta liste 100 — discipline prospection",
    ],
    accent: "var(--ls-teal)",
  },
  {
    emoji: "🌱",
    title: "Le fallback « Grandir ton réseau »",
    body:
      "Si tu n'as aucun suivi F1/F21 dû aujourd'hui (tu n'as pas de nouveau client récent), la 1ère ligne est REMPLACÉE par une action « Grandir ton réseau » qui te renvoie sur /prospection. La check-list n'affiche jamais « rien à faire » — elle te propose toujours une action constructive.",
    bullets: [
      "0 suivi protocole = pas un problème, c'est un signal pour prospecter",
      "Le bouton t'envoie sur le hub prospection avec marché + profil",
      "Si tu coches « Fait », ça compte dans ton score X/5 comme les autres",
    ],
    accent: "var(--ls-coral)",
  },
  {
    emoji: "🔔",
    title: "La relance 20h",
    body:
      "Si à 20h Paris ta check-list n'est pas complète (score < 5/5), tu reçois une push notif sur ton mobile pour boucler les actions restantes avant minuit. Tu peux désactiver dans Paramètres > Notifs si ça t'agace, mais 95 % des coachs gardent l'option active.",
    bullets: [
      "Push une fois max par jour (entre 20h et minuit, dédup 4h)",
      "Skip = pas relancé sur cette action — tu décides",
      "Désactivable individuellement : Paramètres > Notifications",
    ],
    accent: "var(--ls-purple)",
  },
  {
    emoji: "💡",
    title: "Comment l'utiliser intelligemment",
    body:
      "La check-list n'est pas une obligation morale — c'est un outil pour ne rien laisser tomber dans le pipeline. Vise 3-4/5 en routine, 5/5 les bons jours.",
    bullets: [
      "Ne « triche » pas en cochant ce que tu n'as pas fait — tu te mens à toi",
      "Un mauvais jour, accepte un 1/5 et passe à autre chose — demain est neuf",
      "Si une action n'est jamais cochable (ex : pas de Leads), c'est un signal stratégique — il faut alimenter le pipeline en amont",
      "L'objectif n'est pas 5/5 chaque jour, c'est 30 actions par semaine en moyenne",
    ],
    accent: "var(--ls-gold)",
  },
];

export function CheckListExpliquePage() {
  const navigate = useNavigate();

  return (
    <div style={pageWrap}>
      <button type="button" onClick={() => navigate("/developpement")} style={backBtn}>
        ← Mon développement
      </button>

      <div style={heroBox}>
        <div style={heroEyebrow}>☀️ Check-list quotidienne</div>
        <h1 style={heroTitle}>Tes 5 actions du jour, expliquées</h1>
        <p style={heroSubtitle}>
          3 minutes de lecture pour comprendre la routine matinale du Co-pilote
          et savoir comment t'en servir sans pression.
        </p>
      </div>

      <div style={{ display: "grid", gap: 14, marginTop: 24 }}>
        {SECTIONS.map((sec, i) => (
          <article
            key={sec.title}
            style={{ ...sectionCard(sec.accent), animationDelay: `${i * 70}ms` }}
            className="ls-checklist-explique-card"
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <div style={emojiCircle(sec.accent)}>{sec.emoji}</div>
              <h2 style={sectionTitle}>{sec.title}</h2>
            </div>
            <p style={sectionBody}>{sec.body}</p>
            {sec.bullets && (
              <ul style={bulletList}>
                {sec.bullets.map((b, j) => (
                  <li key={j} style={bulletItem}>{b}</li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>

      <div style={ctaBlock}>
        <h3 style={{ margin: "0 0 8px", fontFamily: "Syne, sans-serif", fontSize: 20, fontWeight: 800, color: "var(--ls-text)" }}>
          Prêt à attaquer ta journée ?
        </h3>
        <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--ls-text-muted)", lineHeight: 1.55 }}>
          Ouvre ton Co-pilote — la check-list t'attend dès la 1ère visite du jour.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={() => navigate("/routine-du-jour")} style={btnPrimary}>
            Ouvrir ma routine →
          </button>
          <button type="button" onClick={() => navigate("/developpement")} style={btnGhost}>
            Retour au hub développement
          </button>
        </div>
      </div>

      <style>{`
        .ls-checklist-explique-card {
          opacity: 0;
          animation: ls-cl-fadeup 0.5s ease forwards;
        }
        @keyframes ls-cl-fadeup {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ls-checklist-explique-card { animation: none; opacity: 1; }
        }
        .ls-checklist-explique-card ul li::before {
          content: "✦";
          position: absolute;
          left: 4px;
          top: 0;
          color: var(--ls-gold);
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const pageWrap: React.CSSProperties = {
  maxWidth: 760,
  margin: "0 auto",
  padding: "20px 18px 60px",
};

const backBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 13,
  cursor: "pointer",
  marginBottom: 14,
  padding: 0,
};

const heroBox: React.CSSProperties = {
  background:
    "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 12%, var(--ls-surface)), var(--ls-surface))",
  border: "0.5px solid color-mix(in srgb, var(--ls-gold) 30%, var(--ls-border))",
  borderRadius: 18,
  padding: "24px 20px",
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
  fontFamily: "Anton, sans-serif",
  fontSize: 26,
  fontWeight: 400,
  letterSpacing: "0.01em",
  textTransform: "uppercase",
  color: "var(--ls-text)",
  lineHeight: 1.05,
};

const heroSubtitle: React.CSSProperties = {
  margin: "10px 0 0",
  fontSize: 14,
  lineHeight: 1.6,
  color: "var(--ls-text-muted)",
};

const sectionCard = (accent: string): React.CSSProperties => ({
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderLeft: `3px solid ${accent}`,
  borderRadius: 14,
  padding: "18px 20px",
});

const emojiCircle = (accent: string): React.CSSProperties => ({
  width: 40,
  height: 40,
  borderRadius: 12,
  background: `color-mix(in srgb, ${accent} 14%, var(--ls-surface2))`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 22,
  flexShrink: 0,
});

const sectionTitle: React.CSSProperties = {
  margin: 0,
  fontFamily: "Syne, sans-serif",
  fontSize: 18,
  fontWeight: 700,
  color: "var(--ls-text)",
};

const sectionBody: React.CSSProperties = {
  margin: "0 0 10px",
  fontSize: 14,
  lineHeight: 1.6,
  color: "var(--ls-text)",
};

const bulletList: React.CSSProperties = {
  margin: 0,
  paddingLeft: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const bulletItem: React.CSSProperties = {
  paddingLeft: 22,
  position: "relative",
  fontSize: 13,
  lineHeight: 1.55,
  color: "var(--ls-text-muted)",
};

const ctaBlock: React.CSSProperties = {
  marginTop: 28,
  padding: "22px 20px",
  background:
    "linear-gradient(135deg, color-mix(in srgb, var(--ls-teal) 12%, var(--ls-surface)), var(--ls-surface))",
  border: "0.5px solid color-mix(in srgb, var(--ls-teal) 30%, var(--ls-border))",
  borderRadius: 16,
};

const btnPrimary: React.CSSProperties = {
  padding: "12px 22px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg, var(--ls-gold), color-mix(in srgb, var(--ls-gold) 80%, var(--ls-coral)))",
  color: "var(--ls-bg)",
  fontFamily: "Syne, sans-serif",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  padding: "12px 18px",
  borderRadius: 12,
  border: "0.5px solid var(--ls-border)",
  background: "transparent",
  color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};
