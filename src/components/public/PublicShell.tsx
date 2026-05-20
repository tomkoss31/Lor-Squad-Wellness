// =============================================================================
// PublicShell — Conteneur partage des pages publiques V2 dark (2026-05-18)
// =============================================================================
//
// Source de verite visuelle : docs/mockups/bilan-online-v2.html + temoignage-v2
// (validation Thomas 17/05). Utilise par : BilanOnlineWelcomePage / BilanOnlinePage
// / BilanOnlineThankYouPage / TestimonialFormPage / Newsletter publique (#8).
//
// Apporte :
// - Wrapper .public-shell avec data-public-theme="dark|light" (toggle utilisateur)
// - Background mesh fixe G3 (radials teal/violet/coral)
// - Single column max-width 560 mobile-first
// - Bouton ThemeToggle fixed top-right (optionnel)
// - Persistance localStorage cle ls-public-theme
// =============================================================================

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  PUBLIC_TOKENS,
  PUBLIC_FONTS,
  PUBLIC_THEME_STORAGE_KEY,
  publicGradText,
  type PublicTheme,
} from "../../styles/public-tokens";
import { ThemeToggle } from "./ThemeToggle";
import "../../styles/public-shell.css";

export interface PublicShellProps {
  children: ReactNode;
  /** Theme par defaut au montage si rien dans localStorage. Default 'dark'. */
  defaultTheme?: PublicTheme;
  /** Affiche le bouton toggle dark/light en haut a droite. Default true. */
  showThemeToggle?: boolean;
  /** Active le background mesh (radials teal/violet/coral). Default true. */
  showBgMesh?: boolean;
  /** Classe optionnelle sur le wrapper interne (.ps-shell). */
  className?: string;
  /** Style optionnel sur le wrapper interne. */
  style?: CSSProperties;
}

function readStoredTheme(): PublicTheme | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(PUBLIC_THEME_STORAGE_KEY);
    return v === "dark" || v === "light" ? v : null;
  } catch {
    return null;
  }
}

export function PublicShell({
  children,
  defaultTheme = "dark",
  showThemeToggle = true,
  showBgMesh = true,
  className,
  style,
}: PublicShellProps) {
  const [theme, setTheme] = useState<PublicTheme>(() => readStoredTheme() ?? defaultTheme);

  useEffect(() => {
    try {
      window.localStorage.setItem(PUBLIC_THEME_STORAGE_KEY, theme);
    } catch {
      // ignore quota / private mode
    }
  }, [theme]);

  return (
    <div
      className="public-shell"
      data-public-theme={theme}
      style={{ minHeight: "100dvh", colorScheme: theme === "dark" ? "dark" : "light" }}
    >
      {showBgMesh && <div className="ps-bg-mesh" aria-hidden="true" />}
      {showThemeToggle && <ThemeToggle theme={theme} onToggle={setTheme} />}
      <div className={`ps-shell${className ? ` ${className}` : ""}`} style={style}>
        {children}
      </div>
    </div>
  );
}

// ─── CTA primary partage (gradient teal -> violet) ────────────────────────────
interface CtaProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  style?: CSSProperties;
  className?: string;
}
export function PublicCtaPrimary({
  children,
  onClick,
  disabled,
  type = "button",
  style,
  className,
}: CtaProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`ps-cta-primary${className ? ` ${className}` : ""}`}
      style={{
        display: "block",
        width: "100%",
        padding: "16px 24px",
        background: disabled
          ? "rgba(251, 247, 240, 0.12)"
          : PUBLIC_TOKENS.gradCta,
        color: disabled ? PUBLIC_TOKENS.textOnDarkHint : PUBLIC_TOKENS.cream,
        border: "none",
        borderRadius: 14,
        fontFamily: PUBLIC_FONTS.display,
        fontSize: 16,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled ? "none" : "0 8px 22px rgba(45, 212, 191, 0.25)",
        transition: "transform 0.18s, box-shadow 0.18s, background 0.18s",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.background = PUBLIC_TOKENS.gradCtaHover;
        e.currentTarget.style.boxShadow = "0 12px 32px rgba(167, 139, 250, 0.35)";
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.background = PUBLIC_TOKENS.gradCta;
        e.currentTarget.style.boxShadow = "0 8px 22px rgba(45, 212, 191, 0.25)";
      }}
    >
      {children}
    </button>
  );
}

// ─── Brand eyebrow "La Base 360 · Bilan" + dot teal glow + filets ─────────────
export function PublicBrand({ label }: { label?: string }) {
  return (
    <div className="ps-eyebrow ps-fade-in">
      <span className="ps-eyebrow-logo" aria-hidden="true" />
      La Base 360
      <span className="ps-eyebrow-dot" aria-hidden="true" />
      {label ?? "Bilan"}
    </div>
  );
}

// Re-exports pour acces direct depuis les pages
export { PUBLIC_TOKENS, PUBLIC_FONTS, publicGradText };
export type { PublicTheme };

export default PublicShell;
