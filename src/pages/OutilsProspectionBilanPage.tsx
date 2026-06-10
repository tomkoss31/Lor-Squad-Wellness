// =============================================================================
// OutilsProspectionBilanPage — sous-page "Mon bilan online" (chantier 3
// remaniement 2026-06-10, maquette validée Thomas).
//
// 3 sections éducatives :
//   A. Ton lien bilan online (/bilan-online/<prénom>) : partage + où le mettre
//   B. Ta fiche publique (/coach/<prénom>) : PublicProfileShareCard resurfacée
//      depuis Paramètres > Profil (elle y reste aussi)
//   C. Après le lead : push → onglet Leads → kanban → relance J+3 → conversion
//
// Accès : admin only (cohérent avec la page mère), distributeur → /travaux.
// Slug = prénom normalisé, même règle que PublicProfileShareCard et
// /bilan-online/:coachSlug.
// =============================================================================

import { useEffect, useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { PublicProfileShareCard } from "../components/settings/PublicProfileShareCard";

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

const PLACEMENT_TIPS: { emoji: string; label: string }[] = [
  { emoji: "📸", label: "Bio Instagram / TikTok — le lien permanent" },
  { emoji: "🎬", label: "Story avec sticker lien — 1× par jour" },
  { emoji: "💬", label: "Statut + signature WhatsApp" },
  { emoji: "👥", label: "Groupes Facebook locaux (sport, bien-être)" },
  { emoji: "✉️", label: "Signature email + carte de visite (QR)" },
];

const LEAD_STEPS: { emoji: string; title: string; detail: string }[] = [
  {
    emoji: "🔔",
    title: "La push arrive",
    detail: "Dès qu'un prospect termine son bilan (2 min), tu reçois une notification — réponds sous 24 h, c'est là que ça se joue.",
  },
  {
    emoji: "📥",
    title: "Le lead est rangé",
    detail: "Il atterrit dans Dossiers clients > onglet Leads, avec ses réponses complètes (objectif, habitudes, motivation).",
  },
  {
    emoji: "🗂",
    title: "Tu le classes",
    detail: "Kanban : Nouveau → Contacté → RDV calé → Converti. Glisse la carte à chaque étape, rien ne se perd.",
  },
  {
    emoji: "🔁",
    title: "La relance travaille pour toi",
    detail: "Pas de réponse ? La relance automatique J+3 part toute seule. Toi, tu proposes le RDV bilan et tu convertis en fiche client.",
  },
];

export function OutilsProspectionBilanPage() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const { push: pushToast } = useToast();

  useEffect(() => {
    document.title = "La Base 360 — Mon bilan online";
  }, []);

  const slug = useMemo(
    () => normalizeSlug((currentUser?.name ?? "").split(/\s+/)[0] ?? ""),
    [currentUser?.name],
  );
  const bilanUrl = useMemo(() => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://www.labase360.fr";
    return `${origin}/bilan-online/${slug}`;
  }, [slug]);

  if (!currentUser || currentUser.role !== "admin") {
    return <Navigate to="/travaux" replace />;
  }

  const shareText =
    "Fais ton bilan bien-être gratuit en 2 minutes — je t'envoie mes conseils perso 🌿";

  async function copyBilanLink() {
    try {
      await navigator.clipboard.writeText(bilanUrl);
      pushToast({ tone: "success", title: "Lien copié", message: "Colle-le où tu veux." });
    } catch {
      pushToast({ tone: "warning", title: "Copie impossible", message: bilanUrl });
    }
  }

  async function nativeShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Bilan bien-être gratuit", text: shareText, url: bilanUrl });
      } catch {
        /* annulé par l'utilisateur — silencieux */
      }
    } else {
      void copyBilanLink();
    }
  }

  const waHref = `https://wa.me/?text=${encodeURIComponent(`${shareText} 👉 ${bilanUrl}`)}`;

  return (
    <div style={pageWrap}>
      <button type="button" onClick={() => navigate("/outils-prospection")} style={backBtn}>
        ← Outil de prospection
      </button>

      <header style={heroBox}>
        <div style={heroEyebrow}>🌱 Outil de prospection · Mon bilan online</div>
        <h1 style={heroTitle}>Ton lien bilan, ta vitrine, tes leads</h1>
        <p style={heroSubtitle}>
          Le bilan online est ta porte d'entrée la plus douce : le prospect
          remplit un bilan gratuit en 2 minutes, toi tu récupères un lead
          qualifié avec toutes ses réponses.
        </p>
      </header>

      {/* A — Ton lien bilan */}
      <section style={sectionBox}>
        <h2 style={sectionTitle}>A · Ton lien bilan online</h2>
        <p style={sectionLead}>
          C'est le lien à partager partout. Il est personnel : les bilans
          remplis via ce lien te sont attribués automatiquement.
        </p>
        <div style={linkRow}>
          <span style={linkText}>{bilanUrl.replace(/^https?:\/\//, "")}</span>
          <a href={bilanUrl} target="_blank" rel="noopener noreferrer" style={linkOpen}>
            Voir ↗
          </a>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <button type="button" onClick={() => void copyBilanLink()} style={shareBtn("var(--ls-gold)")}>
            📋 Copier le lien
          </button>
          <a href={waHref} target="_blank" rel="noopener noreferrer" style={shareBtn("#25D366")}>
            💬 WhatsApp
          </a>
          <button type="button" onClick={() => void nativeShare()} style={shareBtn("var(--ls-teal)")}>
            📤 Partager
          </button>
        </div>
        <div style={tipsBox}>
          <div style={tipsTitle}>Où le mettre (les 5 emplacements qui rapportent)</div>
          <ul style={tipsList}>
            {PLACEMENT_TIPS.map((t) => (
              <li key={t.label}>
                <span aria-hidden="true">{t.emoji}</span> {t.label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* B — Ta fiche publique */}
      <section style={sectionBox}>
        <h2 style={sectionTitle}>B · Ta fiche publique</h2>
        <p style={sectionLead}>
          Ta vitrine <strong>/coach/{slug}</strong> présente qui tu es
          (photo, bio, témoignages) et propose deux portes au prospect :
          faire son bilan gratuit <em>ou</em> rejoindre ton équipe. Idéale
          quand le prospect veut d'abord savoir à qui il parle. (Tu la
          retrouves aussi dans Paramètres &gt; Profil.)
        </p>
        <PublicProfileShareCard name={currentUser.name} />
      </section>

      {/* C — Après le lead */}
      <section style={sectionBox}>
        <h2 style={sectionTitle}>C · Un lead est arrivé — voilà quoi faire</h2>
        <div style={stepsGrid}>
          {LEAD_STEPS.map((s) => (
            <div key={s.title} style={stepCard}>
              <div style={stepEmoji} aria-hidden="true">{s.emoji}</div>
              <div style={stepTitle}>{s.title}</div>
              <div style={stepDetail}>{s.detail}</div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => navigate("/clients?tab=leads")}
          style={ctaBtn}
        >
          📥 Voir mes Leads →
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
    "linear-gradient(135deg, color-mix(in srgb, var(--ls-teal) 12%, var(--ls-surface)), var(--ls-surface))",
  border: "0.5px solid color-mix(in srgb, var(--ls-teal) 30%, var(--ls-border))",
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
  color: "var(--ls-teal)",
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
  margin: "0 0 8px",
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

const linkRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "9px 12px",
  borderRadius: 10,
  background: "var(--ls-surface2)",
  border: "1px solid var(--ls-border)",
  marginBottom: 10,
};

const linkText: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 13,
  color: "var(--ls-text)",
};

const linkOpen: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "var(--ls-teal)",
  textDecoration: "none",
  whiteSpace: "nowrap",
};

function shareBtn(accent: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "9px 14px",
    borderRadius: 10,
    background: `color-mix(in srgb, ${accent} 14%, var(--ls-surface2))`,
    border: `1px solid color-mix(in srgb, ${accent} 35%, transparent)`,
    color: "var(--ls-text)",
    fontFamily: "DM Sans, sans-serif",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "none",
  };
}

const tipsBox: React.CSSProperties = {
  background: "color-mix(in srgb, var(--ls-gold) 8%, var(--ls-surface2))",
  border: "0.5px dashed color-mix(in srgb, var(--ls-gold) 40%, var(--ls-border))",
  borderRadius: 12,
  padding: "12px 16px",
};

const tipsTitle: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontSize: 13,
  fontWeight: 700,
  color: "var(--ls-text)",
  marginBottom: 6,
};

const tipsList: React.CSSProperties = {
  margin: 0,
  paddingLeft: 4,
  listStyle: "none",
  fontSize: 13,
  lineHeight: 1.8,
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
};

const stepsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 10,
  marginBottom: 16,
};

const stepCard: React.CSSProperties = {
  background: "var(--ls-surface2)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 12,
  padding: "12px 14px",
};

const stepEmoji: React.CSSProperties = { fontSize: 20, marginBottom: 6 };

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

const ctaBtn: React.CSSProperties = {
  background: "color-mix(in srgb, var(--ls-teal) 14%, var(--ls-surface2))",
  border: "1px solid color-mix(in srgb, var(--ls-teal) 40%, transparent)",
  color: "var(--ls-text)",
  fontFamily: "Syne, sans-serif",
  fontSize: 14,
  fontWeight: 700,
  padding: "12px 20px",
  borderRadius: 12,
  cursor: "pointer",
};
