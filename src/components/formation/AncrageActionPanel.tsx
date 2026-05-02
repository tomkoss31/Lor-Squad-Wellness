// =============================================================================
// AncrageActionPanel — citation + action concrete (Phase F-UI)
//
// Affichage en bas de la page module : ancrage (citation memorable) +
// action (concret a faire apres lecture).
// =============================================================================

interface Props {
  ancrage?: string;
  action?: string;
}

export function AncrageActionPanel({ ancrage, action }: Props) {
  if (!ancrage && !action) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {ancrage ? (
        <blockquote
          style={{
            position: "relative",
            margin: 0,
            padding: "20px 24px",
            background: "color-mix(in srgb, var(--ls-purple) 8%, var(--ls-surface))",
            border: "0.5px solid color-mix(in srgb, var(--ls-purple) 28%, transparent)",
            borderRadius: 16,
            fontFamily: "Syne, serif",
            fontSize: 17,
            fontWeight: 600,
            fontStyle: "italic",
            color: "var(--ls-text)",
            lineHeight: 1.5,
            textAlign: "center",
            letterSpacing: "-0.005em",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 8,
              left: 14,
              fontSize: 30,
              opacity: 0.18,
              color: "var(--ls-purple)",
            }}
          >
            "
          </span>
          {ancrage}
        </blockquote>
      ) : null}

      {action ? (
        <div
          style={{
            background: "color-mix(in srgb, var(--ls-teal) 7%, var(--ls-surface))",
            border: "0.5px solid color-mix(in srgb, var(--ls-teal) 30%, transparent)",
            borderLeft: "3px solid var(--ls-teal)",
            borderRadius: 14,
            padding: "16px 18px",
            display: "flex",
            gap: 12,
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          <span style={{ fontSize: 22, flexShrink: 0 }} aria-hidden="true">
            🎯
          </span>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 9.5,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontWeight: 700,
                color: "var(--ls-teal)",
                marginBottom: 6,
              }}
            >
              Action concrète
            </div>
            <p
              style={{
                fontSize: 13.5,
                color: "var(--ls-text)",
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              {action}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
