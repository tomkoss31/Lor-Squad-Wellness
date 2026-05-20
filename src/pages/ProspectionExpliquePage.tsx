// =============================================================================
// ProspectionExpliquePage — tuto "Comment marche la prospection V4" (2026-05-19)
//
// Page éducative qui explique :
//   - Philosophie : tri pas convaincre, silence ≠ rejet
//   - Structure des 10 sections du kit
//   - 6 marchés × 4 profils
//   - Comment utiliser le hub au quotidien (routine 30min/1h)
//   - 5 erreurs à éviter
//
// CTA en bas vers /prospection.
// Pattern aligné sur FlexExpliquePage (DeveloppementHubPage > flex-explique).
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
    emoji: "🧠",
    title: "Trier, pas convaincre",
    body:
      "La prospection n'est pas un jeu de volume aveugle. Ton job n'est pas de convaincre — c'est de trouver les bonnes personnes au bon moment. Si tu envoies 100 messages pour convaincre 100 personnes, tu épuises ta motivation en 1 semaine. Si tu envoies 100 messages pour identifier les 5 prêtes, tu construis un business qui dure.",
    bullets: [
      "Métriques réalistes : 100 M1 → 15-25 réponses → 1 client (la 1ère fois, prévois 200 M1)",
      "Plus tu es détendu, plus tu attires — la pression repousse, le détachement attire",
      "Le silence n'est pas un rejet personnel : 80 % des M1 n'auront pas de réponse, et c'est OK",
    ],
    accent: "var(--ls-gold)",
  },
  {
    emoji: "📚",
    title: "Le kit en 10 sections",
    body:
      "Le hub /prospection regroupe tout ce dont tu as besoin pour prospecter méthodiquement. Tu cliques sur le module qui te concerne aujourd'hui — pas de tunnel à refaire à chaque fois.",
    bullets: [
      "§1 Mindset & posture : 3 vérités + 5 erreurs du débutant",
      "§2 Trouver les prospects : hashtags catégorisés, green/red flags, sources alt",
      "§3 Messages M1 : premier contact par plateforme",
      "§4 Arbres M2/M3 : que répondre à chaque type de réaction",
      "§5 Objections : 8 objections classiques avec réponses types",
      "§6 Séquence post-appel : J0/J+2/J+5/J+30 + suivi client",
      "§7 Closing : signaux d'achat + 3 scripts de vente",
      "§8 Cas spéciaux : ghost, réactivation, recommandation",
      "§9 Storytelling : structure 4 temps + exemples",
      "§10 Routine quotidienne : 30min/jour + checklist 7 items",
    ],
    accent: "var(--ls-teal)",
  },
  {
    emoji: "🌍",
    title: "6 marchés × 4 profils",
    body:
      "Filtre marché + profil sticky en haut du hub. Le contenu de chaque module s'adapte automatiquement aux conventions culturelles du marché et au vocabulaire du profil.",
    bullets: [
      "Marchés : 🇫🇷 France · 🇬🇧 International EN · 🇲🇽 LatAm + Espagne · 🇧🇷 Brésil + Portugal · 🇹🇷 Turquie + DE · 🇮🇳 Inde (Hinglish)",
      "Profils : ⚖️ Perte de poids Femmes · 💪 Perte de poids Hommes · 🏃 Sportif · 💼 Business",
      "Split H/F sur la perte de poids : vocabulaire complètement différent (perf/récup pour les hommes, énergie/bien-être pour les femmes)",
      "Tous les scripts non-FR ont une traduction française cachée derrière un toggle (le coach FR comprend ce qu'il copie-colle)",
    ],
    accent: "var(--ls-purple)",
  },
  {
    emoji: "🛤️",
    title: "1ère visite vs ensuite",
    body:
      "Pour ne pas te jeter dans le grand bain, la page bascule en deux modes selon que tu y as déjà mis les pieds.",
    bullets: [
      "1ère visite : tunnel onboarding 6 étapes (marché → profil → brief méthodo → cibler → M1 → suivi). C'est le tour guidé V3 conservé.",
      "Visites suivantes : hub direct avec les 10 modules cliquables. Tu vas droit à la section dont tu as besoin.",
      "Le bouton « 🔁 Revoir le tunnel onboarding » est toujours accessible en bas du hub si tu veux refaire le tour.",
    ],
    accent: "var(--ls-coral)",
  },
  {
    emoji: "⏰",
    title: "Routine 30 min / jour",
    body:
      "La méthode débutant qui amène à ton premier client en 1-2 mois. Tu ne lis pas tout le kit — tu actives la routine et tu reviens consulter le module dont tu as besoin sur le moment.",
    bullets: [
      "10 min : scanner 30-40 profils, en sélectionner 15-20 qualifiés (§2 green/red flags)",
      "15 min : envoyer 15-20 M1 personnalisés (§3 + checklist §10 avant chaque envoi)",
      "5 min : répondre aux conversations en cours (§4 arbres M2/M3)",
      "Résultat 1 mois : 400-600 M1, 60-100 conversations, 10-20 RDV, 2-5 clients",
    ],
    accent: "var(--ls-gold)",
  },
  {
    emoji: "⚠️",
    title: "Les 5 pièges à éviter",
    body:
      "Les erreurs qui flinguent le taux de réponse d'un débutant. Tu les retrouves toutes dans le module Mindset du hub.",
    bullets: [
      "Pitcher dès le 1er message → tu perds 90 % des prospects en une phrase",
      "Envoyer le même message à 50 personnes → le copier-coller se sent à 100 m",
      "Relancer J+1, J+2, J+3 → tu passes de coach à harceleur en 48 h",
      "Argumenter sur les « non » → un non bien fermé peut revenir, un non mal géré jamais",
      "Mentir sur la nature du business → « c'est un MLM ? » la réponse honnête est oui",
    ],
    accent: "var(--ls-purple)",
  },
];

export function ProspectionExpliquePage() {
  const navigate = useNavigate();

  return (
    <div style={pageWrap}>
      <button type="button" onClick={() => navigate("/developpement")} style={backBtn}>
        ← Mon développement
      </button>

      <div style={heroBox}>
        <div style={heroEyebrow}>📖 Prospection expliquée</div>
        <h1 style={heroTitle}>Le kit prospection en 10 sections</h1>
        <p style={heroSubtitle}>
          6 minutes de lecture pour comprendre la philosophie du kit et savoir
          comment t'en servir au quotidien sans t'épuiser.
        </p>
      </div>

      <div style={{ display: "grid", gap: 14, marginTop: 24 }}>
        {SECTIONS.map((sec, i) => (
          <article
            key={sec.title}
            style={{ ...sectionCard(sec.accent), animationDelay: `${i * 70}ms` }}
            className="ls-prospection-explique-card"
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
          Prêt à lancer ta première session ?
        </h3>
        <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--ls-text-muted)", lineHeight: 1.55 }}>
          Choisis ton marché, ton profil, et envoie tes 15 premiers M1 ce soir.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={() => navigate("/prospection")} style={btnPrimary}>
            Ouvrir le hub →
          </button>
          <button type="button" onClick={() => navigate("/developpement")} style={btnGhost}>
            Retour au hub développement
          </button>
        </div>
      </div>

      <style>{`
        .ls-prospection-explique-card {
          opacity: 0;
          animation: ls-pe-fadeup 0.5s ease forwards;
        }
        @keyframes ls-pe-fadeup {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ls-prospection-explique-card { animation: none; opacity: 1; }
        }
        .ls-prospection-explique-card ul li::before {
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
