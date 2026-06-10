// =============================================================================
// OutilsProspectionInternationalPage — sous-page "Prospection internationale"
// (chantier 3 remaniement 2026-06-10, maquette validée Thomas).
//
// La méthode D'ABORD (résumé de la fiche prospection-explique), le kit ENSUITE
// (porte d'entrée vers /prospection : 6 marchés × 4 profils × 10 sections).
//
// Accès (révision Thomas 2026-06-10) : verrou Academy 100% — la prospection
// froide se mérite en finissant l'Academy (même règle que l'ancienne card du
// hub). Admin bypass. Distri non qualifié → écran 🔒 motivant avec CTA
// /academy (pas la page travaux : on veut donner envie de finir).
// =============================================================================

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { useAcademyProgress } from "../features/academy/hooks/useAcademyProgress";

const METHOD_POINTS: { emoji: string; title: string; detail: string }[] = [
  {
    emoji: "🎯",
    title: "Tu tries, tu ne convaincs pas",
    detail:
      "La prospection froide sert à trouver les gens déjà ouverts — pas à retourner les sceptiques. Un « non » est un tri réussi, passe au suivant.",
  },
  {
    emoji: "⚠️",
    title: "Évite les 5 erreurs débutant",
    detail:
      "Pitch dès le 1er message, copier-coller visible, harceler après un silence, parler produit avant la personne, abandonner après 10 refus.",
  },
  {
    emoji: "📊",
    title: "Des métriques réalistes",
    detail:
      "Sur 100 messages M1 : ~30 réponses, ~10 conversations réelles, 2-3 bilans. C'est normal et c'est suffisant — la machine se nourrit de volume régulier.",
  },
];

const MARKETS = ["🇫🇷 France", "🇬🇧 International EN", "🇲🇽 LatAm + Espagne", "🇧🇷 Brésil + Portugal", "🇹🇷 Turquie + DE", "🇮🇳 Inde (Hinglish)"];

export function OutilsProspectionInternationalPage() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const { view: academy } = useAcademyProgress();

  useEffect(() => {
    document.title = "La Base 360 — Prospection internationale";
  }, []);

  if (!currentUser) return null;

  const isAdmin = currentUser.role === "admin";
  if (!isAdmin && academy.percentComplete < 100) {
    return (
      <div style={pageWrap}>
        <button type="button" onClick={() => navigate("/outils-prospection")} style={backBtn}>
          ← Outil de prospection
        </button>
        <div style={lockBox}>
          <div aria-hidden="true" style={{ fontSize: 44, marginBottom: 12 }}>🔒</div>
          <h1 style={lockTitle}>Termine ton Academy pour débloquer</h1>
          <p style={lockDesc}>
            La prospection froide demande de la méthode — elle se débloque une
            fois l'Academy terminée à 100 %. Tu en es à{" "}
            <strong style={{ color: "var(--ls-gold)" }}>
              {academy.percentComplete}%
            </strong>{" "}
            ({academy.completedCount}/{academy.totalCount} sections) : plus
            grand-chose !
          </p>
          <div style={lockBarTrack}>
            <div
              style={{
                ...lockBarFill,
                width: `${Math.max(2, academy.percentComplete)}%`,
              }}
            />
          </div>
          <button type="button" onClick={() => navigate("/academy")} style={lockCta}>
            🎓 {academy.hasStarted ? "Reprendre l'Academy" : "Démarrer l'Academy"} →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={pageWrap}>
      <button type="button" onClick={() => navigate("/outils-prospection")} style={backBtn}>
        ← Outil de prospection
      </button>

      <header style={heroBox}>
        <div style={heroEyebrow}>🌍 Outil de prospection · International</div>
        <h1 style={heroTitle}>Prospecter froid, dans 6 marchés</h1>
        <p style={heroSubtitle}>
          Avant d'ouvrir le kit, prends 2 minutes pour la méthode : c'est elle
          qui fait la différence entre « j'envoie des messages » et « je
          construis un pipeline ».
        </p>
      </header>

      {/* La méthode d'abord */}
      <section style={sectionBox}>
        <h2 style={sectionTitle}>1 · La méthode en bref</h2>
        <div style={pointsGrid}>
          {METHOD_POINTS.map((p) => (
            <div key={p.title} style={pointCard}>
              <div style={pointEmoji} aria-hidden="true">{p.emoji}</div>
              <div style={pointTitle}>{p.title}</div>
              <div style={pointDetail}>{p.detail}</div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => navigate("/developpement/prospection-explique")}
          style={ghostCta}
        >
          📖 Lire la fiche méthode complète →
        </button>
      </section>

      {/* Le kit ensuite */}
      <section style={sectionBox}>
        <h2 style={sectionTitle}>2 · Le kit complet</h2>
        <p style={sectionLead}>
          Scripts natifs par marché, hashtags, arbres de réponse M1/M2/M3,
          objections, suivi d'appel, closing, storytelling, routine — 10
          sections × 4 profils cibles (Perte de poids Femmes/Hommes · Sport ·
          Business).
        </p>
        <div style={marketsRow}>
          {MARKETS.map((m) => (
            <span key={m} style={marketChip}>{m}</span>
          ))}
        </div>
        <button type="button" onClick={() => navigate("/prospection")} style={ctaBtn}>
          🌍 Ouvrir le kit prospection →
        </button>
      </section>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const pageWrap: React.CSSProperties = {
  maxWidth: 860,
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
    "linear-gradient(135deg, color-mix(in srgb, var(--ls-coral) 10%, var(--ls-surface)), var(--ls-surface))",
  border: "0.5px solid color-mix(in srgb, var(--ls-coral) 30%, var(--ls-border))",
  borderRadius: 18,
  padding: "24px 20px",
  marginBottom: 20,
};

const heroEyebrow: React.CSSProperties = {
  fontFamily: "DM Sans, sans-serif",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 1.4,
  color: "var(--ls-coral)",
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
  maxWidth: 640,
};

const sectionBox: React.CSSProperties = {
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 16,
  padding: "20px 18px",
  marginBottom: 16,
};

const sectionTitle: React.CSSProperties = {
  margin: "0 0 12px",
  fontFamily: "Syne, sans-serif",
  fontSize: 18,
  fontWeight: 700,
  color: "var(--ls-text)",
};

const sectionLead: React.CSSProperties = {
  margin: "0 0 14px",
  fontSize: 13.5,
  lineHeight: 1.6,
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
};

const pointsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
  marginBottom: 14,
};

const pointCard: React.CSSProperties = {
  background: "var(--ls-surface2)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 12,
  padding: "12px 14px",
};

const pointEmoji: React.CSSProperties = { fontSize: 20, marginBottom: 6 };

const pointTitle: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontSize: 13.5,
  fontWeight: 700,
  color: "var(--ls-text)",
  marginBottom: 3,
};

const pointDetail: React.CSSProperties = {
  fontSize: 12.5,
  lineHeight: 1.55,
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
};

const marketsRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginBottom: 16,
};

const marketChip: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 600,
  fontFamily:
    "'Twemoji Country Flags', 'DM Sans', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif",
  color: "var(--ls-text)",
  padding: "6px 12px",
  borderRadius: 999,
  background: "var(--ls-surface2)",
  border: "0.5px solid var(--ls-border)",
};

const ghostCta: React.CSSProperties = {
  background: "transparent",
  border: "0.5px solid color-mix(in srgb, var(--ls-gold) 45%, var(--ls-border))",
  color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 13,
  fontWeight: 700,
  padding: "10px 16px",
  borderRadius: 12,
  cursor: "pointer",
};

const ctaBtn: React.CSSProperties = {
  background: "color-mix(in srgb, var(--ls-coral) 14%, var(--ls-surface2))",
  border: "1px solid color-mix(in srgb, var(--ls-coral) 40%, transparent)",
  color: "var(--ls-text)",
  fontFamily: "Syne, sans-serif",
  fontSize: 14,
  fontWeight: 700,
  padding: "12px 20px",
  borderRadius: 12,
  cursor: "pointer",
};

// Écran verrou Academy (révision accès 2026-06-10).
const lockBox: React.CSSProperties = {
  textAlign: "center",
  padding: "44px 26px",
  borderRadius: 18,
  background:
    "linear-gradient(135deg, color-mix(in srgb, var(--ls-purple) 10%, var(--ls-surface)), var(--ls-surface))",
  border: "0.5px solid color-mix(in srgb, var(--ls-purple) 32%, var(--ls-border))",
  maxWidth: 560,
  margin: "30px auto 0",
};

const lockTitle: React.CSSProperties = {
  margin: "0 0 10px",
  fontFamily: "Syne, sans-serif",
  fontSize: 23,
  fontWeight: 800,
  color: "var(--ls-text)",
};

const lockDesc: React.CSSProperties = {
  margin: "0 0 18px",
  fontSize: 13.5,
  lineHeight: 1.6,
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
};

const lockBarTrack: React.CSSProperties = {
  width: "100%",
  height: 7,
  background: "color-mix(in srgb, var(--ls-text) 8%, transparent)",
  borderRadius: 100,
  overflow: "hidden",
  marginBottom: 20,
};

const lockBarFill: React.CSSProperties = {
  height: "100%",
  background: "linear-gradient(90deg, var(--ls-purple), var(--ls-gold))",
  borderRadius: 100,
};

const lockCta: React.CSSProperties = {
  background: "color-mix(in srgb, var(--ls-purple) 14%, var(--ls-surface2))",
  border: "1px solid color-mix(in srgb, var(--ls-purple) 40%, transparent)",
  color: "var(--ls-text)",
  fontFamily: "Syne, sans-serif",
  fontSize: 14,
  fontWeight: 700,
  padding: "12px 22px",
  borderRadius: 12,
  cursor: "pointer",
};
