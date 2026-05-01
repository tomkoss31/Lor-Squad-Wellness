// Chantier Centre de Formation V1 (2026-04-23).
// Card ressource dans la page catégorie.
//
// Refactor theme-aware (2026-04-30) : couleurs Tailwind-like remplacees
// par les tokens var(--ls-*) qui suivent le toggle clair/sombre.

import type { TrainingResource } from "../../types/training";

interface TypePalette {
  /** Token CSS de la couleur d accent. */
  accentVar: string;
  label: string;
}

const TYPE_PALETTES: Record<string, TypePalette> = {
  video: { accentVar: "var(--ls-coral)", label: "Vidéo" },
  pdf: { accentVar: "var(--ls-gold)", label: "PDF" },
  guide: { accentVar: "var(--ls-teal)", label: "Guide" },
  external: { accentVar: "var(--ls-purple)", label: "Externe" },
} as const;

function TypeIcon({ type, color }: { type: keyof typeof TYPE_PALETTES; color: string }) {
  switch (type) {
    case "video":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={color}>
          <polygon points="8 5 19 12 8 19 8 5" />
        </svg>
      );
    case "pdf":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <text x="8" y="17" fontSize="6" fontWeight="700" fill={color}>PDF</text>
        </svg>
      );
    case "guide":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      );
    case "external":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      );
  }
}

export function ResourceCard({
  resource,
  isCompleted,
  onClick,
}: {
  resource: TrainingResource;
  isCompleted: boolean;
  onClick: () => void;
}) {
  const palette = TYPE_PALETTES[resource.resource_type];

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: 14,
        borderRadius: 12,
        background: "var(--ls-surface)",
        border: "1px solid var(--ls-border)",
        textAlign: "left",
        cursor: "pointer",
        fontFamily: "DM Sans, sans-serif",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--ls-surface2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--ls-surface)";
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          background: `color-mix(in srgb, ${palette.accentVar} 14%, transparent)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <TypeIcon type={resource.resource_type} color={palette.accentVar} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
          <span
            style={{
              padding: "1px 7px",
              borderRadius: 6,
              background: `color-mix(in srgb, ${palette.accentVar} 14%, transparent)`,
              color: palette.accentVar,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.03em",
            }}
          >
            {palette.label}
          </span>
          {resource.duration_minutes ? (
            <span style={{ fontSize: 11, color: "var(--ls-text-hint)" }}>
              {resource.duration_minutes} min
            </span>
          ) : null}
          {resource.is_new ? (
            <span
              style={{
                padding: "1px 7px",
                borderRadius: 6,
                background: "var(--ls-coral)",
                color: "var(--ls-coral-contrast, #FFFFFF)",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Nouveau
            </span>
          ) : null}
        </div>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ls-text)" }}>
          {resource.title}
        </div>
        {resource.subtitle ? (
          <div style={{ fontSize: 12, color: "var(--ls-text-muted)", marginTop: 2 }}>
            {resource.subtitle}
          </div>
        ) : null}
      </div>

      <div
        style={{
          flexShrink: 0,
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: isCompleted ? "var(--ls-teal)" : "transparent",
          border: isCompleted ? "none" : "2px solid var(--ls-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isCompleted ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ls-teal-contrast, #FFFFFF)" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : null}
      </div>
    </button>
  );
}
