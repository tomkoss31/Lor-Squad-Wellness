// =============================================================================
// ClubVipExpliquePage — fiche pédagogique coach "Comment marche le Club VIP"
// (VIP-5 2026-06-10).
//
// Le "comment faire" en 5 étapes (workflow terrain) + la doc programme
// complète réutilisée (VipProgramDoc — aussi dans Paramètres > Programme VIP,
// zéro duplication de contenu).
//
// Accès : card hub /developpement (section Prospecter) + bouton 📖 depuis
// l'onglet Club VIP de la fiche client. Route /developpement/club-vip-explique.
// =============================================================================

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { VipProgramDoc } from "../features/client-vip/VipProgramDoc";

const WORKFLOW: { emoji: string; title: string; detail: string }[] = [
  {
    emoji: "🗣",
    title: "1 · Pitche au bon moment",
    detail:
      "Le suivi des 15 jours est idéal : le client voit ses premiers résultats. Ouvre sa fiche > onglet 👑 Club VIP et montre-lui l'escalier des remises à l'écran — son palier actuel est mis en avant.",
  },
  {
    emoji: "📲",
    title: "2 · Envoie l'invitation",
    detail:
      "Bouton « Envoyer l'invitation » : le message complet part par WhatsApp/SMS avec le lien d'inscription Herbalife, ton ID sponsor et tes 3 lettres. (Renseigne-les une fois dans Paramètres > Profil.)",
  },
  {
    emoji: "🔗",
    title: "3 · Active le programme sur sa fiche",
    detail:
      "Quand le client a son ID 21XY…, saisis-le dans l'onglet Actions (panel VIP) avec son parrain éventuel. La Base 360 calcule son palier automatiquement à chaque commande.",
  },
  {
    emoji: "🤝",
    title: "4 · Encourage les recommandations",
    detail:
      "Dans sa PWA (onglet Recommander), ton client a le simulateur « ta remise grimpe » et te partage un proche en 2 champs. Partage aussi ta page publique /vip/<ton-prénom> dans ton groupe.",
  },
  {
    emoji: "🎯",
    title: "5 · Traite chaque reco dans le CRM",
    detail:
      "Les recos arrivent dans le CRM (sidebar 🎯) avec un message de 1er contact pro pré-rédigé qui cite le parrain et qualifie via ton bilan online. Réponds sous 24 h, classe, convertis.",
  },
];

export function ClubVipExpliquePage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "La Base 360 — Comment marche le Club VIP";
  }, []);

  return (
    <div style={pageWrap}>
      <button type="button" onClick={() => navigate(-1)} style={backBtn}>
        ← Retour
      </button>

      <header style={heroBox}>
        <div style={heroEyebrow}>👑 Fiche pratique · Club VIP</div>
        <h1 style={heroTitle}>Comment marche le Club VIP</h1>
        <p style={heroSubtitle}>
          Ton outil n°1 de fidélisation et de recommandation : le client paie sa
          nutrition moins cher (jusqu'à -35 %), toi tu récupères des recos
          qualifiées. Voici le workflow terrain en 5 étapes, puis le programme en
          détail.
        </p>
      </header>

      {/* Workflow 5 étapes */}
      <section style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {WORKFLOW.map((s) => (
          <div key={s.title} style={stepCard}>
            <span aria-hidden="true" style={stepEmoji}>
              {s.emoji}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={stepTitle}>{s.title}</div>
              <div style={stepDetail}>{s.detail}</div>
            </div>
          </div>
        ))}
      </section>

      {/* Doc programme complète (partagée avec Paramètres > Programme VIP) */}
      <VipProgramDoc />

      <footer style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
        <button type="button" onClick={() => navigate("/crm")} style={ctaBtn}>
          🎯 Ouvrir le CRM
        </button>
        <button
          type="button"
          onClick={() => navigate("/outils-prospection")}
          style={ghostBtn}
        >
          ← Outil de prospection
        </button>
      </footer>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

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
  marginBottom: 20,
};

const heroEyebrow: React.CSSProperties = {
  fontFamily: "DM Sans, sans-serif",
  fontSize: 11,
  fontWeight: 700,
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

const stepCard: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 14,
  padding: "14px 16px",
  borderRadius: 14,
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
};

const stepEmoji: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 11,
  background: "color-mix(in srgb, var(--ls-gold) 12%, var(--ls-surface2))",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 20,
  flexShrink: 0,
};

const stepTitle: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontSize: 14.5,
  fontWeight: 700,
  color: "var(--ls-text)",
  marginBottom: 3,
};

const stepDetail: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.55,
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
};

const ctaBtn: React.CSSProperties = {
  background: "color-mix(in srgb, var(--ls-gold) 14%, var(--ls-surface2))",
  border: "1px solid color-mix(in srgb, var(--ls-gold) 40%, transparent)",
  color: "var(--ls-text)",
  fontFamily: "Syne, sans-serif",
  fontSize: 14,
  fontWeight: 700,
  padding: "12px 20px",
  borderRadius: 12,
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 13,
  fontWeight: 600,
  padding: "12px 18px",
  borderRadius: 12,
  cursor: "pointer",
};
