// =============================================================================
// ThemeToggle — Bouton rond top-right pour basculer dark/light sur pages publiques
// =============================================================================
// Sauvegarde la preference dans localStorage (cle ls-public-theme).
// Independant du theme system app interne (html.theme-light du Co-pilote).
// =============================================================================

import { type PublicTheme } from "../../styles/public-tokens";

interface Props {
  theme: PublicTheme;
  onToggle: (next: PublicTheme) => void;
  className?: string;
}

export function ThemeToggle({ theme, onToggle, className }: Props) {
  const next: PublicTheme = theme === "dark" ? "light" : "dark";
  const label = theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre";
  return (
    <button
      type="button"
      className={`ps-theme-toggle${className ? ` ${className}` : ""}`}
      aria-label={label}
      title={label}
      onClick={() => onToggle(next)}
    >
      <span aria-hidden="true">{theme === "dark" ? "☀" : "🌙"}</span>
    </button>
  );
}

export default ThemeToggle;
