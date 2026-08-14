// =============================================================================
// GuideNouveauCoachPage — « Installer l'app pour un nouveau coach ».
//
// Thomas (2026-08-04) : « un guide, c'est plus duplicable à long terme ». On
// avait tout travaillé sur ce qui se passe DANS l'app (cockpit, formation),
// mais jamais le tout premier pas : comment une recrue reçoit, installe et
// crée son compte. Ce guide = le mode d'emploi que le parrain suit (ou envoie)
// à CHAQUE nouvelle recrue. Route /guide-nouveau-coach.
// =============================================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";

const MSG = `Bienvenue dans l'équipe La Base 360 ! 🎉

Voici ton lien perso pour créer ton compte sur l'app : [COLLE TON LIEN ICI]

Ça prend 2 minutes. Une fois dedans, ajoute l'app à ton écran d'accueil et tu tomberas sur ton parcours de démarrage — je te guide pour le reste à notre RDV. À très vite !`;

// Défini AVANT STEPS : STEPS contient du JSX évalué au chargement du module qui
// référence `ul` (sinon « used before declaration »).
const ul: React.CSSProperties = { margin: "8px 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 5 };

const STEPS: { n: number; emoji: string; title: string; body: React.ReactNode }[] = [
  {
    n: 1,
    emoji: "🔗",
    title: "Génère son lien d'invitation",
    body: (
      <>
        Depuis ton <b>cockpit</b> (étape « Démarrer ta recrue » → <b>Parrainer une recrue</b>),
        ou depuis <b>Paramètres → Mon équipe</b>. Ça crée un lien unique, rattaché à toi comme
        parrain — l'argent et l'équipe de ta recrue te reviennent.
      </>
    ),
  },
  {
    n: 2,
    emoji: "✉️",
    title: "Envoie-lui le lien + un mot",
    body: (
      <>Colle le lien dans un message chaleureux (modèle prêt ci-dessous). Un lien tout seul, c'est froid.</>
    ),
  },
  {
    n: 3,
    emoji: "🆔",
    title: "Elle crée son compte",
    body: (
      <>
        Elle clique le lien, met son prénom, son e-mail et un mot de passe. <b>C'est ELLE</b> qui
        possède son compte — tu n'as rien à saisir à sa place.
      </>
    ),
  },
  {
    n: 4,
    emoji: "📲",
    title: "Elle installe l'app sur son téléphone",
    body: (
      <>
        Pour que ça devienne une vraie appli plein écran (pas juste un onglet) :
        <ul style={ul}>
          <li><b>iPhone</b> — dans Safari : bouton <b>Partager</b> ⬆️ → <b>« Sur l'écran d'accueil »</b>.</li>
          <li><b>Android</b> — dans Chrome : menu <b>⋮</b> → <b>« Installer l'application »</b>.</li>
        </ul>
        L'icône La Base 360 apparaît sur son écran d'accueil.
      </>
    ),
  },
  {
    n: 5,
    emoji: "🚀",
    title: "Elle tombe sur son cockpit",
    body: (
      <>
        Dès la connexion, la <b>Salle des Opérations</b> la prend en main : <b>une action par jour</b>,
        guidée, jusqu'à son activation. Tu n'as rien de plus à installer.
      </>
    ),
  },
];

export function GuideNouveauCoachPage() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  function copyMsg() {
    try {
      void navigator.clipboard?.writeText(MSG);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard indispo */
    }
  }

  return (
    <div style={wrap}>
      <button type="button" onClick={() => navigate(-1)} style={back} aria-label="Retour">
        ← Retour
      </button>

      <div style={hero}>
        <div style={eyebrow}>🎓 Onboarding · duplicable à l'infini</div>
        <h1 style={h1}>Installer l'app pour un nouveau coach</h1>
        <p style={lede}>
          De zéro à opérationnel en ~5 minutes. Suis ces 5 étapes à <b>chaque nouvelle recrue</b> —
          toujours les mêmes.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
        {STEPS.map((s) => (
          <div key={s.n} style={stepCard}>
            <div style={stepNum}>
              <span aria-hidden="true" style={{ fontSize: 18 }}>{s.emoji}</span>
              <span style={numBadge}>{s.n}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={stepTitle}>{s.title}</div>
              <div style={stepBody}>{s.body}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Message prêt à envoyer */}
      <div style={msgCard}>
        <div style={msgLabel}>✉️ Message prêt à envoyer (étape 2)</div>
        <pre style={msgPre}>{MSG}</pre>
        <button type="button" onClick={copyMsg} style={copyBtn}>
          {copied ? "✓ Copié" : "Copier le message"}
        </button>
      </div>

      {/* Après */}
      <div style={afterCard}>
        <div style={{ ...msgLabel, color: "var(--ls-teal)" }}>🤝 Et toi, après ?</div>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "var(--ls-text)" }}>
          Cale son <b>RDV de démarrage</b> (30-45 min), puis co-anime ses 4 premiers clients —
          méthode <b>Show → Try → Do</b> (tu fais, vous faites à deux, elle fait). L'app la guide
          au quotidien ; toi, tu tiens le cadre 90 jours sans la porter à bout de bras.
        </p>
      </div>
    </div>
  );
}

const wrap: React.CSSProperties = { maxWidth: 620, margin: "0 auto", padding: "8px 16px 48px" };
const back: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--ls-text-muted)",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  padding: "6px 0",
};
const hero: React.CSSProperties = { marginTop: 6, marginBottom: 8 };
const eyebrow: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fontSize: 11,
  letterSpacing: ".1em",
  textTransform: "uppercase",
  color: "var(--ls-teal)",
};
const h1: React.CSSProperties = {
  fontFamily: "Anton, Impact, sans-serif",
  fontSize: 30,
  letterSpacing: ".4px",
  lineHeight: 1.05,
  color: "var(--ls-text)",
  margin: "8px 0 8px",
};
const lede: React.CSSProperties = { fontSize: 15, lineHeight: 1.55, color: "var(--ls-text-muted)", margin: 0 };
const stepCard: React.CSSProperties = {
  display: "flex",
  gap: 14,
  background: "var(--ls-surface)",
  border: "1px solid var(--ls-border)",
  borderRadius: 16,
  padding: 16,
};
const stepNum: React.CSSProperties = {
  flex: "none",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
};
const numBadge: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: "50%",
  background: "color-mix(in srgb, var(--ls-teal) 16%, var(--ls-surface))",
  color: "var(--ls-teal)",
  fontWeight: 800,
  fontSize: 13,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
const stepTitle: React.CSSProperties = { fontSize: 16, fontWeight: 800, color: "var(--ls-text)", marginBottom: 4 };
const stepBody: React.CSSProperties = { fontSize: 14, lineHeight: 1.55, color: "var(--ls-text-muted)" };
const msgCard: React.CSSProperties = {
  marginTop: 16,
  background: "var(--ls-surface2)",
  border: "1px solid var(--ls-border)",
  borderRadius: 16,
  padding: 16,
};
const msgLabel: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fontSize: 11,
  letterSpacing: ".08em",
  textTransform: "uppercase",
  color: "var(--ls-text-muted)",
  marginBottom: 10,
};
const msgPre: React.CSSProperties = {
  whiteSpace: "pre-wrap",
  fontFamily: "inherit",
  fontSize: 13.5,
  lineHeight: 1.55,
  color: "var(--ls-text)",
  background: "var(--ls-bg)",
  border: "1px solid var(--ls-border)",
  borderRadius: 12,
  padding: 13,
  margin: "0 0 12px",
};
const copyBtn: React.CSSProperties = {
  width: "100%",
  background: "var(--ls-teal)",
  color: "var(--ls-teal-contrast)",
  border: "none",
  borderRadius: 12,
  padding: 13,
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
};
const afterCard: React.CSSProperties = {
  marginTop: 16,
  background: "color-mix(in srgb, var(--ls-teal) 8%, var(--ls-surface))",
  border: "1px solid color-mix(in srgb, var(--ls-teal) 30%, transparent)",
  borderRadius: 16,
  padding: 16,
};
