// Chantier Academy refonte premium (2026-04-27).
// Bouton "Installer Lor'Squad" visible cote coach dans le footer de la
// sidebar. Permet a la section "rituals" de l Academy d avoir une cible
// reelle (data-tour-id="pwa-install").
//
// Visible uniquement si le navigateur expose le prompt PWA (Chrome,
// Edge, Samsung Browser). Sur iOS Safari, le prompt natif n existe pas
// — l utilisateur doit utiliser le menu Partage > Sur l ecran d accueil
// (instruction donnee par le tour Academy en center modale fallback).

import { useInstallPrompt } from "../../context/InstallPromptContext";

export function CoachInstallPwaButton() {
  const { canPromptInstall, isStandalone, promptInstall } = useInstallPrompt();

  // Deja installe / standalone → pas de bouton
  if (isStandalone) return null;
  // Pas de prompt natif disponible → on n affiche pas le bouton (iOS Safari).
  // La section rituals de l Academy gere ce cas via une copy textuelle.
  if (!canPromptInstall) return null;

  return (
    <button
      type="button"
      onClick={() => void promptInstall()}
      data-tour-id="pwa-install"
      className="flex items-center gap-2 text-[13px] transition"
      style={{
        margin: "8px 6px",
        padding: "9px 12px",
        borderRadius: 10,
        background: "var(--ls-surface2)",
        color: "var(--ls-text-muted)",
        border: "1px solid var(--ls-border)",
        fontFamily: "DM Sans, sans-serif",
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
        width: "100%",
        justifyContent: "center",
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <line x1="12" y1="18" x2="12" y2="18" />
      </svg>
      <span>Installer Lor&apos;Squad</span>
    </button>
  );
}
