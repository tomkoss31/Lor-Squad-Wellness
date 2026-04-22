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
    footer: "Ton icône Lor'Squad s'affichera comme une vraie appli.",
  },
  android: {
    title: "Installe sur Android",
    steps: [
      "Touche le menu (3 points) en haut à droite",
      "Choisis « Installer l'app » ou « Ajouter à l'écran d'accueil »",
      "Confirme",
    ],
    footer: "Ton icône Lor'Squad s'affichera sur ton écran d'accueil.",
  },
  desktop: {
    title: "Installe sur ton ordinateur",
    steps: [
      "Clique sur l'icône + dans la barre d'adresse (à droite de l'URL)",
      "Clique « Installer »",
      "Lor'Squad s'ouvrira comme une vraie appli",
    ],
    footer: "L'icône sera ajoutée à ton bureau / menu démarrer.",
  },
};

export function InstallPwaInstructions({
  device,
  compact,
}: {
  device?: DeviceKind;
  compact?: boolean;
}) {
  const resolvedDevice = device ?? useMemo(() => detectDevice(), []);
  const copy = COPY[resolvedDevice];

  return (
    <div>
      <p
        style={{
          fontFamily: "Syne, sans-serif",
          fontSize: compact ? 16 : 20,
          fontWeight: 700,
          color: "#111827",
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
                background: "rgba(186,117,23,0.12)",
                color: "#BA7517",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "Syne, sans-serif",
                flexShrink: 0,
              }}
            >
              {String(idx + 1).padStart(2, "0")}
            </div>
            <div
              style={{
                fontSize: 14,
                color: "#111827",
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
          color: "#6B7280",
          lineHeight: 1.55,
        }}
      >
        {copy.footer}
      </p>
    </div>
  );
}
