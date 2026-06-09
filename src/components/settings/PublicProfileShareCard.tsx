// =============================================================================
// PublicProfileShareCard — carte "Ta fiche publique" (Paramètres > Profil).
// Chantier #13-B (2026-06-08).
//
// Donne au coach le lien partageable de sa vitrine /coach/:slug + boutons
// Copier / WhatsApp / Partager (navigator.share mobile → Insta, SMS, etc.).
// Le slug = prénom normalisé (même règle que /bilan-online/:slug).
// =============================================================================

import { useMemo } from "react";
import { Card } from "../ui/Card";
import { useToast } from "../../context/ToastContext";

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export function PublicProfileShareCard({ name }: { name: string }) {
  const { push: pushToast } = useToast();

  const slug = useMemo(() => normalizeSlug((name ?? "").split(/\s+/)[0] ?? ""), [name]);
  const url = useMemo(() => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://www.labase360.fr";
    return `${origin}/coach/${slug}`;
  }, [slug]);

  const shareText = "Découvre mon accompagnement bien-être 🌿";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      pushToast({ tone: "success", title: "Lien copié", message: "Colle-le où tu veux." });
    } catch {
      pushToast({ tone: "warning", title: "Copie impossible", message: url });
    }
  }

  async function nativeShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Ma fiche coach · La Base 360", text: shareText, url });
      } catch {
        /* annulé par l'utilisateur — silencieux */
      }
    } else {
      void copyLink();
    }
  }

  const waHref = `https://wa.me/?text=${encodeURIComponent(`${shareText} 👉 ${url}`)}`;

  if (slug.length < 2) return null;

  return (
    <Card
      style={{
        padding: 18,
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--ls-teal) 10%, var(--ls-surface)) 0%, color-mix(in srgb, var(--ls-gold) 8%, var(--ls-surface)) 100%)",
        border: "1px solid color-mix(in srgb, var(--ls-teal) 25%, var(--ls-border))",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 22 }} aria-hidden="true">🔗</span>
        <div>
          <div
            style={{
              fontSize: 10.5,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              color: "var(--ls-teal)",
              fontWeight: 700,
            }}
          >
            Prospection
          </div>
          <div
            style={{
              fontFamily: "Syne, sans-serif",
              fontSize: 16,
              fontWeight: 700,
              color: "var(--ls-text)",
            }}
          >
            Ta fiche publique
          </div>
        </div>
      </div>

      <p style={{ fontSize: 12.5, color: "var(--ls-text-muted)", margin: "4px 0 12px", lineHeight: 1.5 }}>
        Ta vitrine partageable (bio en story Insta, lien WhatsApp…). Un prospect
        choisit : bilan gratuit ou rejoindre ton équipe. Pense à remplir ta
        photo + bio ci-dessus pour un rendu pro.
      </p>

      {/* Aperçu du lien */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 12px",
          borderRadius: 10,
          background: "var(--ls-surface2)",
          border: "1px solid var(--ls-border)",
          marginBottom: 10,
        }}
      >
        <span
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontFamily: "DM Sans, sans-serif",
            fontSize: 13,
            color: "var(--ls-text)",
          }}
        >
          {url.replace(/^https?:\/\//, "")}
        </span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--ls-teal)",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          Voir ↗
        </a>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => void copyLink()}
          style={shareBtn("var(--ls-gold)")}
        >
          📋 Copier le lien
        </button>
        <a href={waHref} target="_blank" rel="noopener noreferrer" style={shareBtn("#25D366")}>
          💬 WhatsApp
        </a>
        <button type="button" onClick={() => void nativeShare()} style={shareBtn("var(--ls-teal)")}>
          📤 Partager
        </button>
      </div>
    </Card>
  );
}

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
