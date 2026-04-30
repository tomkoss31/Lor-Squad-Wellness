// CoachInstallPwaButton V2 (2026-04-30).
// Bouton "Installer Lor'Squad" sidebar coach.
//
// V2 :
// - Sur Android/Desktop avec prompt natif → tap = appel direct du prompt
// - Sur iOS Safari (pas de prompt natif) → tap = ouverture du tuto modale
//   pas-a-pas avec illustrations SVG (V2 — solution Mendy)
// - Si deja installe (isStandalone) → bouton cache

import { useState } from "react";
import { useInstallPrompt } from "../../context/InstallPromptContext";
import { detectDevice } from "../../lib/utils/detectDevice";
import { InstallPwaTutorialModal } from "./InstallPwaTutorialModal";

export function CoachInstallPwaButton() {
  const { canPromptInstall, isStandalone, promptInstall } = useInstallPrompt();
  const [showTutorial, setShowTutorial] = useState(false);

  // Deja installe / standalone → pas de bouton
  if (isStandalone) return null;

  const device = detectDevice();
  const hasNativePrompt = canPromptInstall;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          // Si prompt natif dispo (Android Chrome / Desktop), on l'appelle.
          if (hasNativePrompt) {
            void promptInstall();
          } else {
            // iOS Safari ou autre → tuto guide
            setShowTutorial(true);
          }
        }}
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
          transition: "transform 0.15s ease, border-color 0.15s ease, color 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.borderColor = "color-mix(in srgb, var(--ls-gold) 40%, var(--ls-border))";
          e.currentTarget.style.color = "var(--ls-gold)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "none";
          e.currentTarget.style.borderColor = "var(--ls-border)";
          e.currentTarget.style.color = "var(--ls-text-muted)";
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
      {showTutorial && (
        <InstallPwaTutorialModal
          open={true}
          onClose={() => setShowTutorial(false)}
          deviceOverride={device}
        />
      )}
    </>
  );
}
