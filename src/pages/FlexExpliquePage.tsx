// =============================================================================
// FlexExpliquePage — tuto pédagogique "Comment marche FLEX" (2026-05-04)
//
// Page éducative qui répond aux questions fréquentes sur le moteur FLEX :
//   - Qu'est-ce que FLEX
//   - Pourquoi des cibles 5-3-1
//   - Comment lire le check-in quotidien
//   - Que veulent dire les badges KPI (vert/jaune/rouge)
//   - Exemple concret jour par jour
//
// CTA en bas vers /flex et /flex/onboarding.
// =============================================================================

import { useNavigate } from "react-router-dom";

interface Section {
  emoji: string;
  title: string;
  body: string;
  /** Liste de bullets optionnelle. */
  bullets?: string[];
  accent: string;
}

const SECTIONS: Section[] = [
  {
    emoji: "🎯",
    title: "C'est quoi FLEX ?",
    body:
      "FLEX est ton moteur de pilotage quotidien. Il transforme ton objectif annuel (rang ciblé, revenus, équipe) en cibles d'action concrètes : combien de personnes inviter par jour, combien de bilans à caler par semaine, combien de closings à viser.",
    bullets: [
      "Tu réponds à 5 questions une fois → ton plan est calibré",
      "Tu fais ton check-in chaque jour (30 sec) → tu vois si tu es dans les clous",
      "Tu ajustes en fonction des couleurs (vert/jaune/rouge) → tu progresses sans deviner",
    ],
    accent: "var(--ls-gold)",
  },
  {
    emoji: "🧮",
    title: "Pourquoi 5-3-1 ?",
    body:
      "C'est la formule statistique testée et calibrée France pour la prospection chaude. Pour signer 1 client, il faut en moyenne 3 RDV bilan, et pour 3 RDV il faut environ 5 invitations qualifiées.",
    bullets: [
      "5 invitations → 3 conversations qualifiées",
      "3 conversations → 1 RDV bilan calé",
      "3 RDV bilans → 1 nouveau client (~30 % de closing)",
    ],
    accent: "var(--ls-teal)",
  },
  {
    emoji: "📊",
    title: "Comment lire le check-in",
    body:
      "Chaque soir, tu rentres tes 4 chiffres du jour : invitations envoyées, conversations qualifiées, bilans planifiés, closings.",
    bullets: [
      "Le widget Co-pilote affiche tes 4 cases avec ratio actuel/cible",
      "Couleur de la bordure = ton statut sur cette ligne",
      "Vert = tu es au-dessus de la cible, jaune = autour, rouge = en retard",
    ],
    accent: "var(--ls-purple)",
  },
  {
    emoji: "🚦",
    title: "Que veulent dire les couleurs",
    body:
      "Le code couleur est inspiré des indicateurs Apple Health : tu sais en 1 seconde si tu dois pousser ou ralentir.",
    bullets: [
      "🟢 Vert (≥ 100 % de la cible) : tu peux capitaliser, c'est le moment de pousser sur du qualitatif",
      "🟡 Jaune (60-99 %) : tu es dans la zone, garde le rythme",
      "🔴 Rouge (< 60 %) : tu prends du retard, agis sur 1 seul levier dès demain",
    ],
    accent: "var(--ls-coral)",
  },
  {
    emoji: "📅",
    title: "Un exemple concret",
    body:
      "Marie veut atteindre Supervisor en 6 mois. Son plan calibré FLEX :",
    bullets: [
      "5 invitations / jour (réseaux sociaux + face-à-face)",
      "3 conversations qualifiées / jour (vraies discussions, pas juste un like)",
      "5 bilans / semaine (donc ~1 par jour ouvré)",
      "2 closings / semaine (donc ~1 client tous les 2-3 jours)",
    ],
    accent: "var(--ls-gold)",
  },
  {
    emoji: "🧠",
    title: "Le piège à éviter",
    body:
      "FLEX n'est pas un dashboard de vanité. Si tu trafiques tes chiffres pour avoir du vert, tu trompes seulement toi-même. La couleur n'est PAS une note — c'est un signal pour t'aider à corriger le tir tôt.",
    bullets: [
      "Sois honnête : 1 conversation = vraie discussion sur la santé/produits, pas un emoji",
      "Le rouge est ton ami : il te montre où agir avant qu'il soit trop tard",
      "Si t'es vert tous les jours et qu'aucun client signe → ton problème est ailleurs (qualité, pas quantité)",
    ],
    accent: "var(--ls-purple)",
  },
];

export function FlexExpliquePage() {
  const navigate = useNavigate();

  return (
    <div style={pageWrap}>
      {/* Bouton retour */}
      <button type="button" onClick={() => navigate("/developpement")} style={backBtn}>
        ← Mon développement
      </button>

      {/* Hero */}
      <div style={heroBox}>
        <div style={heroEyebrow}>⚡ FLEX expliqué</div>
        <h1 style={heroTitle}>Comprendre ton moteur de pilotage</h1>
        <p style={heroSubtitle}>
          7 minutes de lecture pour saisir comment FLEX transforme ton objectif annuel
          en actions concrètes au quotidien.
        </p>
      </div>

      {/* Sections */}
      <div style={{ display: "grid", gap: 14, marginTop: 24 }}>
        {SECTIONS.map((sec, i) => (
          <article
            key={sec.title}
            style={{ ...sectionCard(sec.accent), animationDelay: `${i * 70}ms` }}
            className="ls-flex-explique-card"
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <div style={emojiCircle(sec.accent)}>{sec.emoji}</div>
              <h2 style={sectionTitle}>{sec.title}</h2>
            </div>
            <p style={sectionBody}>{sec.body}</p>
            {sec.bullets && (
              <ul style={bulletList(sec.accent)}>
                {sec.bullets.map((b, j) => (
                  <li key={j} style={bulletItem}>
                    {b}
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>

      {/* CTA bloc */}
      <div style={ctaBlock}>
        <h3 style={{ margin: "0 0 8px", fontFamily: "Syne, sans-serif", fontSize: 20, fontWeight: 800, color: "var(--ls-text)" }}>
          Prêt à activer ton FLEX ?
        </h3>
        <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--ls-text-muted)", lineHeight: 1.55 }}>
          5 questions, 3 minutes. Ton plan d'action quotidien est calibré sur tes objectifs.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={() => navigate("/flex/onboarding")} style={btnPrimary}>
            Configurer mon plan →
          </button>
          <button type="button" onClick={() => navigate("/flex")} style={btnGhost}>
            Voir mon dashboard
          </button>
        </div>
      </div>

      <style>{`
        .ls-flex-explique-card {
          opacity: 0;
          animation: ls-fe-fadeup 0.5s ease forwards;
        }
        @keyframes ls-fe-fadeup {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ls-flex-explique-card { animation: none; opacity: 1; }
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
  fontFamily: "Syne, sans-serif",
  fontSize: 26,
  fontWeight: 800,
  color: "var(--ls-text)",
  lineHeight: 1.15,
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

const bulletList = (_accent: string): React.CSSProperties => ({
  margin: 0,
  paddingLeft: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: 6,
});

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

// CSS for bullets (we use a small ::before circle via inline style hack — or rely on default)
// We add a simple "•" prefix inline since CSS pseudo isn't trivial in inline styles.
// Inject a small global rule:
const _injectedBulletCss = (() => {
  if (typeof document === "undefined") return null;
  const id = "ls-flex-bullet-css";
  if (document.getElementById(id)) return null;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
    .ls-flex-explique-card ul li::before {
      content: "✦";
      position: absolute;
      left: 4px;
      top: 0;
      color: var(--ls-gold);
      font-size: 12px;
    }
  `;
  document.head.appendChild(style);
  return id;
})();
void _injectedBulletCss;
