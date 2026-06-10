// =============================================================================
// TravauxPage — page "En travaux" générique (chantier remaniement 2026-06-10)
//
// Destination des liens vers du contenu pas encore livré :
//   - Bouton "🎥 Vidéo explicative" de la page FLEX (vidéos en cours de prod)
//   - Futur gating distributeur de la page mère /outils-prospection (chantier 3)
//
// Page volontairement simple et rassurante : le contenu arrive, pas d'erreur.
// Tokens var(--ls-*) uniquement (suit le toggle clair/sombre).
// =============================================================================

import { useNavigate } from "react-router-dom";

export function TravauxPage() {
  const navigate = useNavigate();

  return (
    <div style={wrap}>
      <div style={card}>
        <div aria-hidden="true" style={emoji}>
          🚧
        </div>
        <h1 style={title}>En travaux</h1>
        <p style={body}>
          Ce contenu est en cours de préparation par l'équipe La Base 360.
          Il sera bientôt disponible ici — reviens vite !
        </p>
        <button type="button" onClick={() => navigate(-1)} style={backBtn}>
          ← Revenir en arrière
        </button>
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const wrap: React.CSSProperties = {
  maxWidth: 560,
  margin: "0 auto",
  padding: "60px 18px",
};

const card: React.CSSProperties = {
  textAlign: "center",
  padding: "48px 28px",
  borderRadius: 18,
  background:
    "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 8%, var(--ls-surface)), var(--ls-surface))",
  border: "0.5px dashed color-mix(in srgb, var(--ls-gold) 40%, var(--ls-border))",
};

const emoji: React.CSSProperties = {
  fontSize: 48,
  lineHeight: 1,
  marginBottom: 16,
};

const title: React.CSSProperties = {
  margin: "0 0 10px",
  fontFamily: "Syne, sans-serif",
  fontSize: 26,
  fontWeight: 800,
  color: "var(--ls-text)",
};

const body: React.CSSProperties = {
  margin: "0 0 24px",
  fontSize: 14,
  lineHeight: 1.6,
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
};

const backBtn: React.CSSProperties = {
  background: "transparent",
  border: "0.5px solid var(--ls-border)",
  color: "var(--ls-text)",
  fontSize: 13,
  fontWeight: 600,
  padding: "10px 18px",
  borderRadius: 999,
  cursor: "pointer",
  fontFamily: "DM Sans, sans-serif",
};
