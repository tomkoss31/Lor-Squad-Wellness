// =============================================================================
// Tabs — barre d'onglets partagée (chantier design system 2026-07-03).
//
// Remplace les 7+ barres d'onglets réinventées à la main (ParametresPage,
// TeamPage, ClientsPage, UsersPage, DistributorPortfolioPage, GuidePage,
// ClientDetailPage…). Un seul style, un seul comportement, ARIA correct.
//
// 2 variantes :
//   - "cockpit" : JetBrains Mono capitales, actif = pastille teal (identité v2)
//   - "soft"    : DM Sans, actif = surface2 (plus discret, pages denses)
//
// 100 % tokens var(--ls-*) → suit le toggle clair/sombre. Emojis conservés.
// =============================================================================

import type { CSSProperties } from "react";

export interface TabDef<K extends string = string> {
  key: K;
  label: string;
  /** Emoji d'onglet (optionnel). */
  icon?: string;
  /** Couleur d'accent de l'onglet actif (défaut var(--ls-teal)). */
  color?: string;
  /** Pastille compteur (nombre > 0 affiché). */
  badge?: number;
}

interface Props<K extends string> {
  tabs: TabDef<K>[];
  active: K;
  onChange: (key: K) => void;
  variant?: "cockpit" | "soft";
  /** Élément optionnel rendu à droite de la barre (ex. menu « ⋯ Plus »). */
  trailing?: React.ReactNode;
  ariaLabel?: string;
}

export function Tabs<K extends string>({
  tabs,
  active,
  onChange,
  variant = "cockpit",
  trailing,
  ariaLabel = "Onglets",
}: Props<K>) {
  const cockpit = variant === "cockpit";

  const containerStyle: CSSProperties = cockpit
    ? { display: "flex", gap: 7, flexWrap: "wrap", position: "relative", alignItems: "center" }
    : {
        display: "flex",
        gap: 4,
        flexWrap: "wrap",
        background: "var(--ls-surface2)",
        border: "1px solid var(--ls-border)",
        borderRadius: 12,
        padding: 4,
        width: "fit-content",
        maxWidth: "100%",
        alignItems: "center",
      };

  const tabStyle = (isActive: boolean, color: string): CSSProperties =>
    cockpit
      ? {
          padding: "9px 13px",
          borderRadius: 9,
          border: "1px solid transparent",
          cursor: "pointer",
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: isActive ? 600 : 500,
          letterSpacing: "0.13em",
          textTransform: "uppercase",
          background: isActive ? color : "transparent",
          color: isActive ? "var(--ls-bg)" : "var(--ls-text-muted)",
          display: "flex",
          alignItems: "center",
          gap: 7,
          transition: "all 0.15s",
          whiteSpace: "nowrap",
        }
      : {
          padding: "8px 14px",
          borderRadius: 8,
          border: "none",
          cursor: "pointer",
          fontSize: 13,
          fontFamily: "DM Sans, sans-serif",
          fontWeight: isActive ? 600 : 400,
          background: isActive ? "var(--ls-surface)" : "transparent",
          color: isActive ? "var(--ls-text)" : "var(--ls-text-muted)",
          display: "flex",
          alignItems: "center",
          gap: 6,
          transition: "all 0.15s",
          whiteSpace: "nowrap",
        };

  return (
    <div role="tablist" aria-label={ariaLabel} style={containerStyle}>
      {tabs.map((t) => {
        const isActive = active === t.key;
        const color = t.color ?? "var(--ls-teal)";
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.key)}
            style={tabStyle(isActive, color)}
          >
            {t.icon ? (
              <span aria-hidden="true" style={{ fontSize: 14 }}>
                {t.icon}
              </span>
            ) : null}
            {t.label}
            {typeof t.badge === "number" && t.badge > 0 ? (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  lineHeight: 1,
                  padding: "2px 6px",
                  borderRadius: 999,
                  background: isActive ? "var(--ls-bg)" : "var(--ls-coral)",
                  color: isActive ? color : "var(--ls-bg)",
                }}
              >
                {t.badge}
              </span>
            ) : null}
          </button>
        );
      })}
      {trailing}
    </div>
  );
}
