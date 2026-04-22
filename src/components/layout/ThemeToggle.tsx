// Chantier Polish V3 (2026-04-24).
// Toggle light/dark mode affiché dans la sidebar, AU-DESSUS du bloc
// profil Thomas. Style custom soleil/lune avec piste qui glisse.
// État via hook useTheme existant.

import { useTheme } from "../../hooks/useTheme";

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
      title={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "10px 14px",
        borderRadius: 10,
        background: "transparent",
        border: "1px solid var(--ls-border)",
        cursor: "pointer",
        transition: "background 0.15s, border-color 0.15s",
        fontFamily: "DM Sans, sans-serif",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--ls-surface2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {/* Icône soleil à gauche */}
      <span
        aria-hidden="true"
        style={{
          fontSize: 15,
          lineHeight: 1,
          opacity: isDark ? 0.4 : 1,
          transition: "opacity 0.2s",
        }}
      >
        ☀️
      </span>

      {/* Label + switch au milieu */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, justifyContent: "center" }}>
        <span
          style={{
            fontSize: 12,
            color: "var(--ls-text-muted)",
            fontWeight: 500,
          }}
        >
          Mode
        </span>
        <div
          aria-hidden="true"
          style={{
            width: 44,
            height: 24,
            borderRadius: 999,
            background: isDark ? "#BA7517" : "var(--ls-border)",
            position: "relative",
            transition: "background 0.2s ease",
            flexShrink: 0,
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.15)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 2,
              left: isDark ? 22 : 2,
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "#FFFFFF",
              transition: "left 0.2s ease",
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }}
          />
        </div>
      </div>

      {/* Icône lune à droite */}
      <span
        aria-hidden="true"
        style={{
          fontSize: 15,
          lineHeight: 1,
          opacity: isDark ? 1 : 0.4,
          transition: "opacity 0.2s",
        }}
      >
        🌙
      </span>
    </button>
  );
}
