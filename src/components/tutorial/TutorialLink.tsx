// =============================================================================
// TutorialLink — déclencheur réutilisable de tutoriel vidéo (#6, 2026-06-09).
//
// Usage simple (recommandé) : <TutorialLink tutorialKey="flex" />
//   → titre/URL lus depuis data/tutorials.ts (Thomas n'édite que ce fichier).
// Usage direct : <TutorialLink url="https://youtu.be/..." title="..." />
//
// Variants : "pill" (défaut, bouton « ▶ Tuto vidéo ») · "icon" (petit ? rond,
// à coller à côté d'un libellé de feature).
// État vide : si l'URL n'est pas encore renseignée → chip « 🎬 bientôt » discret
// non cliquable (sauf hideIfEmpty → ne rend rien).
// =============================================================================

import { useState, type CSSProperties } from "react";
import { TUTORIALS, type TutorialKey } from "../../data/tutorials";
import { TutorialVideoModal } from "./TutorialVideoModal";

interface Props {
  tutorialKey?: TutorialKey;
  /** Alternative au registre : passer l'URL/titre directement. */
  url?: string;
  title?: string;
  description?: string;
  variant?: "pill" | "icon";
  /** Texte personnalisé du bouton pill (défaut « Tuto vidéo »). */
  label?: string;
  /** Ne rien afficher tant que la vidéo n'est pas dispo. Défaut false. */
  hideIfEmpty?: boolean;
  style?: CSSProperties;
}

export function TutorialLink({
  tutorialKey,
  url,
  title,
  description,
  variant = "pill",
  label = "Tuto vidéo",
  hideIfEmpty = false,
  style,
}: Props) {
  const [open, setOpen] = useState(false);

  const entry = tutorialKey ? TUTORIALS[tutorialKey] : undefined;
  const resolvedUrl = (url ?? entry?.youtubeUrl ?? "").trim();
  const resolvedTitle = title ?? entry?.title ?? "Tutoriel vidéo";
  const resolvedDesc = description ?? entry?.description;
  const ready = resolvedUrl.length > 0;

  if (!ready && hideIfEmpty) return null;

  // ── État « bientôt » (URL pas encore renseignée) : chip discret non cliquable
  if (!ready) {
    if (variant === "icon") {
      return (
        <span
          title="Tutoriel vidéo bientôt disponible"
          aria-label="Tutoriel vidéo bientôt disponible"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 20,
            height: 20,
            borderRadius: 999,
            fontSize: 11,
            background: "var(--ls-surface2)",
            color: "var(--ls-text-hint)",
            border: "1px solid var(--ls-border)",
            ...style,
          }}
        >
          🎬
        </span>
      );
    }
    return (
      <span
        title="Tutoriel vidéo bientôt disponible"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 10px",
          borderRadius: 999,
          fontSize: 12,
          fontFamily: "DM Sans, sans-serif",
          fontWeight: 500,
          background: "var(--ls-surface2)",
          color: "var(--ls-text-hint)",
          border: "1px dashed var(--ls-border)",
          ...style,
        }}
      >
        🎬 {label} (bientôt)
      </span>
    );
  }

  // ── État actif : bouton cliquable → ouvre la modale
  const trigger =
    variant === "icon" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={resolvedTitle}
        aria-label={`Voir le tutoriel : ${resolvedTitle}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 20,
          height: 20,
          borderRadius: 999,
          fontSize: 11,
          cursor: "pointer",
          background: "color-mix(in srgb, var(--ls-teal) 16%, var(--ls-surface2))",
          color: "var(--ls-teal)",
          border: "1px solid color-mix(in srgb, var(--ls-teal) 40%, transparent)",
          ...style,
        }}
      >
        ▶
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={resolvedDesc ?? resolvedTitle}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          borderRadius: 999,
          fontSize: 12,
          fontFamily: "DM Sans, sans-serif",
          fontWeight: 600,
          cursor: "pointer",
          background: "color-mix(in srgb, var(--ls-teal) 14%, var(--ls-surface2))",
          color: "var(--ls-teal)",
          border: "1px solid color-mix(in srgb, var(--ls-teal) 35%, transparent)",
          transition: "background 0.15s",
          ...style,
        }}
      >
        ▶ {label}
      </button>
    );

  return (
    <>
      {trigger}
      {open ? (
        <TutorialVideoModal
          youtubeUrl={resolvedUrl}
          title={resolvedTitle}
          description={resolvedDesc}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
