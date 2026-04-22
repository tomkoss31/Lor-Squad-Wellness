// Chantier Centre de Formation V1 (2026-04-23).
// Card catégorie affichée sur la home /formation.

import { Link } from "react-router-dom";
import type { TrainingCategoryStats } from "../../types/training";

const COLOR_PALETTES: Record<
  string,
  { bg: string; icon: string; iconBg: string; label: string }
> = {
  teal: { bg: "#E1F5EE", icon: "#0F6E56", iconBg: "rgba(13,110,86,0.15)", label: "DÉBUTANT" },
  amber: { bg: "#FAEEDA", icon: "#854F0B", iconBg: "rgba(133,79,11,0.15)", label: "INTERMÉDIAIRE" },
  purple: { bg: "#EEEDFE", icon: "#534AB7", iconBg: "rgba(83,74,183,0.15)", label: "AVANCÉ" },
};

const ICONS: Record<string, JSX.Element> = {
  circle: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  ),
  quote: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.75-2-2-2H4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h3" />
      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.75-2-2-2h-4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h3" />
    </svg>
  ),
  chart: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
};

export function CategoryCard({ stats }: { stats: TrainingCategoryStats }) {
  const { category, total, completed, hasNew } = stats;
  const palette = COLOR_PALETTES[category.color_ramp] ?? COLOR_PALETTES.teal;
  const icon = category.icon_name ? ICONS[category.icon_name] : null;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Link
      to={`/formation/${category.slug}`}
      style={{
        display: "flex",
        flexDirection: "column",
        padding: 16,
        borderRadius: 14,
        background: "var(--ls-surface)",
        border: "1px solid var(--ls-border)",
        textDecoration: "none",
        color: "var(--ls-text)",
        transition: "all 0.15s",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {hasNew ? (
        <span
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            padding: "2px 8px",
            borderRadius: 8,
            background: "#A32D2D",
            color: "#FFFFFF",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          Nouveau
        </span>
      ) : null}

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: palette.bg,
            color: palette.icon,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.08em",
              fontWeight: 700,
              color: palette.icon,
              marginBottom: 2,
            }}
          >
            {palette.label}
          </div>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: 16, fontWeight: 700, color: "var(--ls-text)" }}>
            {category.title}
          </div>
        </div>
      </div>

      {category.description ? (
        <p style={{ fontSize: 12, color: "var(--ls-text-muted)", lineHeight: 1.5, margin: 0, marginBottom: 12 }}>
          {category.description}
        </p>
      ) : null}

      <div
        style={{
          borderTop: "1px solid var(--ls-border)",
          paddingTop: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>
          {completed} / {total} ressource{total > 1 ? "s" : ""}
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: palette.icon }}>
          {percent}%
        </div>
      </div>

      <div
        style={{
          marginTop: 8,
          height: 4,
          borderRadius: 2,
          background: "var(--ls-surface2)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: "100%",
            background: palette.icon,
            transition: "width 0.3s",
          }}
        />
      </div>
    </Link>
  );
}
