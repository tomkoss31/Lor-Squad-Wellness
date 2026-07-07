// Hotfix client-login + PWA install (2026-04-24).
// Composant réutilisable qui affiche les instructions d'installation PWA
// selon le device détecté. Utilisé :
//   - inline sur la page /bienvenue (étape intermédiaire post-création compte)
//   - dans une modale ouverte depuis la bannière InstallPwaBanner sur /client/:token

import { useMemo } from "react";
import { detectDevice, type DeviceKind } from "../../lib/utils/detectDevice";

interface Instruction {
  title: string;
  steps: string[];
  footer: string;
}

const COPY: Record<DeviceKind, Instruction> = {
  ios: {
    title: "Installe sur iPhone",
    steps: [
      "Touche le bouton Partager en bas de Safari",
      "Fais défiler et choisis « Sur l'écran d'accueil »",
      "Touche « Ajouter » en haut à droite",
    ],
    footer: "Ton icône La Base 360 s'affichera comme une vraie appli.",
  },
  android: {
    title: "Installe sur Android",
    steps: [
      "Touche le menu (3 points) en haut à droite",
      "Choisis « Installer l'app » ou « Ajouter à l'écran d'accueil »",
      "Confirme",
    ],
    footer: "Ton icône La Base 360 s'affichera sur ton écran d'accueil.",
  },
  desktop: {
    title: "Installe sur ton ordinateur",
    steps: [
      "Clique sur l'icône + dans la barre d'adresse (à droite de l'URL)",
      "Clique « Installer »",
      "La Base 360 s'ouvrira comme une vraie appli",
    ],
    footer: "L'icône sera ajoutée à ton bureau / menu démarrer.",
  },
};

export function InstallPwaInstructions({
  device,
  compact,
  accent = "#BA7517",
  accentBg = "rgba(186,117,23,0.12)",
}: {
  device?: DeviceKind;
  compact?: boolean;
  /** Accent des pastilles. Défaut or (flux client, card claire) ; passer lime pour le distri v2. */
  accent?: string;
  accentBg?: string;
}) {
  // Audit 2026-04-30 : useMemo etait appele conditionnellement via ??
  // → rules-of-hooks. On l appelle TOUJOURS, et on prend `device` en
  // override apres si fourni.
  const detected = useMemo(() => detectDevice(), []);
  const resolvedDevice = device ?? detected;
  const copy = COPY[resolvedDevice];

  return (
    // color: inherit → s'adapte au parent (card claire = texte sombre ; card
    // dark distri = texte clair). Seul l'accent des pastilles est piloté en prop.
    <div style={{ color: "inherit" }}>
      <p
        style={{
          fontFamily: "'Anton', 'Syne', sans-serif",
          fontSize: compact ? 16 : 20,
          fontWeight: 700,
          color: "inherit",
          margin: 0,
          marginBottom: compact ? 8 : 14,
        }}
      >
        {copy.title}
      </p>

      <ol
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: compact ? 10 : 14,
        }}
      >
        {copy.steps.map((step, idx) => (
          <li
            key={idx}
            style={{ display: "flex", alignItems: "flex-start", gap: 12 }}
          >
            <div
              aria-hidden="true"
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: accentBg,
                color: accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                flexShrink: 0,
              }}
            >
              {String(idx + 1).padStart(2, "0")}
            </div>
            <div
              style={{
                fontSize: 14,
                color: "inherit",
                lineHeight: 1.55,
                paddingTop: 2,
              }}
            >
              {step}
            </div>
          </li>
        ))}
      </ol>

      <p
        style={{
          marginTop: compact ? 12 : 18,
          fontSize: 12,
          color: "inherit",
          opacity: 0.62,
          lineHeight: 1.55,
        }}
      >
        {copy.footer}
      </p>
    </div>
  );
}
