// =============================================================================
// FormationCategoryPage — page detail bibliotheque thematique (2026-04-30)
//
// Route /formation/:slug. Affiche les ressources d une categorie thematique
// (Prospection / Bilan / Suivi / Business).
//
// Phase 2 : ressources vides → empty state propre "Contenu a venir".
// Phase 3 : sera rempli par le contenu Notion. Le rendu de chaque ressource
// dispatch selon kind (school-video/internal-video/pdf/guide/module-link).
// =============================================================================

import { useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { PageHeading } from "../components/ui/PageHeading";
import {
  FORMATION_CATEGORIES,
  getFormationCategoryBySlug,
  type FormationCategoryAccent,
  type FormationResource,
} from "../data/formation";

const ACCENT_TOKEN: Record<FormationCategoryAccent, string> = {
  gold: "var(--ls-gold)",
  teal: "var(--ls-teal)",
  purple: "var(--ls-purple)",
  coral: "var(--ls-coral)",
};

export function FormationCategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const category = useMemo(
    () => (slug ? getFormationCategoryBySlug(slug) : undefined),
    [slug],
  );

  if (!category) {
    return (
      <div className="space-y-4" style={{ padding: 20 }}>
        <p style={{ color: "var(--ls-text-muted)" }}>
          Catégorie introuvable.{" "}
          <Link to="/formation" style={{ color: "var(--ls-gold)" }}>Retour à la formation</Link>
        </p>
      </div>
    );
  }

  const accentVar = ACCENT_TOKEN[category.accent];

  function handleResourceClick(r: FormationResource) {
    if (r.kind === "internal-video" && r.videoUrl) {
      setVideoUrl(r.videoUrl);
    } else if (r.kind === "school-video" && r.schoolUrl) {
      window.open(r.schoolUrl, "_blank", "noopener,noreferrer");
    } else if (r.kind === "pdf" && r.pdfUrl) {
      window.open(r.pdfUrl, "_blank", "noopener,noreferrer");
    } else if (r.kind === "module-link" && r.moduleId) {
      // Phase 3 : navigate vers le module du parcours lie
      navigate(`/formation/parcours/${r.moduleId}`);
    }
  }

  const isEmpty = category.resources.length === 0;

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate("/formation")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          borderRadius: 8,
          background: "transparent",
          border: "none",
          color: "var(--ls-text-muted)",
          cursor: "pointer",
          fontSize: 12,
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        ← Retour à la formation
      </button>

      <PageHeading
        eyebrow={`Bibliothèque · ${category.emoji}`}
        title={category.title}
        description={category.description}
      />

      {isEmpty ? (
        <EmptyCategoryState accentVar={accentVar} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {category.resources.map((r) => (
            <ResourceRow
              key={r.id}
              resource={r}
              accentVar={accentVar}
              onClick={() => handleResourceClick(r)}
            />
          ))}
        </div>
      )}

      {/* Video modal interne (uniquement kind=internal-video) */}
      {videoUrl ? (
        <VideoModal videoUrl={videoUrl} onClose={() => setVideoUrl(null)} />
      ) : null}

      {/* Nav autres catégories */}
      <div
        style={{
          padding: "14px 16px",
          background: "var(--ls-surface)",
          border: "0.5px solid var(--ls-border)",
          borderRadius: 14,
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ls-text-muted)",
            fontWeight: 700,
            marginBottom: 10,
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          Autres thèmes
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {FORMATION_CATEGORIES.filter((c) => c.slug !== slug).map((c) => (
            <Link
              key={c.slug}
              to={`/formation/${c.slug}`}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                background: "var(--ls-surface2)",
                border: "0.5px solid var(--ls-border)",
                color: "var(--ls-text)",
                textDecoration: "none",
                fontSize: 12,
                fontWeight: 500,
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              {c.emoji} {c.title}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Sous-composants ────────────────────────────────────────────────────

function EmptyCategoryState({ accentVar }: { accentVar: string }) {
  return (
    <div
      style={{
        padding: "32px 24px",
        background: `color-mix(in srgb, ${accentVar} 4%, var(--ls-surface))`,
        border: `0.5px dashed color-mix(in srgb, ${accentVar} 30%, transparent)`,
        borderRadius: 16,
        textAlign: "center",
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      <div style={{ fontSize: 38, marginBottom: 10 }} aria-hidden="true">📦</div>
      <h3
        style={{
          fontFamily: "Syne, serif",
          fontSize: 17,
          fontWeight: 800,
          color: "var(--ls-text)",
          margin: "0 0 6px",
          letterSpacing: "-0.01em",
        }}
      >
        Le contenu arrive bientôt
      </h3>
      <p
        style={{
          fontSize: 13,
          color: "var(--ls-text-muted)",
          margin: 0,
          lineHeight: 1.55,
          maxWidth: 460,
          marginInline: "auto",
        }}
      >
        Thomas finalise la matière de cette catégorie. Tu pourras y accéder
        dans quelques jours. En attendant, fonce sur ton parcours guidé.
      </p>
    </div>
  );
}

function ResourceRow({
  resource,
  accentVar,
  onClick,
}: {
  resource: FormationResource;
  accentVar: string;
  onClick: () => void;
}) {
  const icon = (() => {
    switch (resource.kind) {
      case "school-video":
        return "🎓";
      case "internal-video":
        return "▶";
      case "pdf":
        return "📄";
      case "guide":
        return "📘";
      case "module-link":
        return "🎯";
      default:
        return "📌";
    }
  })();

  const kindLabel = (() => {
    switch (resource.kind) {
      case "school-video":
        return "Vidéo School";
      case "internal-video":
        return "Vidéo";
      case "pdf":
        return "PDF";
      case "guide":
        return "Guide";
      case "module-link":
        return "Module";
      default:
        return null;
    }
  })();

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px",
        background: "var(--ls-surface)",
        border: "0.5px solid var(--ls-border)",
        borderRadius: 14,
        cursor: "pointer",
        fontFamily: "DM Sans, sans-serif",
        color: "var(--ls-text)",
        textAlign: "left",
        transition: "transform 0.18s, border-color 0.18s, box-shadow 0.18s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.borderColor = `color-mix(in srgb, ${accentVar} 35%, var(--ls-border))`;
        e.currentTarget.style.boxShadow = `0 4px 14px -6px color-mix(in srgb, ${accentVar} 30%, transparent)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.borderColor = "var(--ls-border)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 44,
          height: 44,
          borderRadius: 11,
          background: `color-mix(in srgb, ${accentVar} 14%, transparent)`,
          color: accentVar,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: 20,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ls-text)", marginBottom: 2 }}>
          {resource.title}
        </div>
        <div style={{ fontSize: 12, color: "var(--ls-text-muted)", lineHeight: 1.45 }}>
          {resource.description}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
          {kindLabel ? (
            <span
              style={{
                fontSize: 10,
                padding: "2px 7px",
                borderRadius: 999,
                background: `color-mix(in srgb, ${accentVar} 14%, transparent)`,
                color: accentVar,
                fontWeight: 700,
                letterSpacing: "0.03em",
              }}
            >
              {kindLabel}
            </span>
          ) : null}
          {resource.tag ? (
            <span
              style={{
                fontSize: 10,
                padding: "2px 7px",
                borderRadius: 999,
                background: "var(--ls-surface2)",
                color: "var(--ls-text-muted)",
                fontWeight: 500,
              }}
            >
              {resource.tag}
            </span>
          ) : null}
          {resource.durationMin ? (
            <span style={{ fontSize: 10, color: "var(--ls-text-hint)" }}>
              ⏱ {resource.durationMin} min
            </span>
          ) : null}
          {resource.isNew ? (
            <span
              style={{
                fontSize: 9,
                padding: "1px 7px",
                borderRadius: 6,
                background: "var(--ls-coral)",
                color: "var(--ls-coral-contrast, #FFFFFF)",
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Nouveau
            </span>
          ) : null}
        </div>
      </div>
      <span style={{ color: "var(--ls-text-muted)", fontSize: 18, flexShrink: 0 }}>→</span>
    </button>
  );
}

function VideoModal({ videoUrl, onClose }: { videoUrl: string; onClose: () => void }) {
  // Extract YouTube ID si format URL standard
  const youtubeId = (() => {
    try {
      const u = new URL(videoUrl);
      if (u.hostname === "youtu.be") return u.pathname.slice(1);
      if (u.hostname.endsWith("youtube.com")) {
        if (u.pathname === "/watch") return u.searchParams.get("v");
        if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2];
      }
    } catch {
      /* fallthrough */
    }
    return null;
  })();
  const embedUrl = youtubeId
    ? `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`
    : videoUrl;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Fermer la vidéo"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 900,
          aspectRatio: "16/9",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          background: "#000",
        }}
      >
        <iframe
          src={embedUrl}
          title="Formation"
          width="100%"
          height="100%"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ border: "none", display: "block" }}
        />
      </div>
    </div>
  );
}
