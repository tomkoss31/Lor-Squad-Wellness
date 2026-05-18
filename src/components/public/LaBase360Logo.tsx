// =============================================================================
// LaBase360Logo — lecteur SVG du logo officiel La Base 360 (2026-05-18)
// =============================================================================
//
// Wrapper léger autour des SVG officiels dans /public/brand/labase360/. Permet
// d'utiliser le logo brand de manière cohérente sur les pages publiques
// (Welcome bilan, Thank you, témoignage, business, future newsletter) sans
// dupliquer les URLs en dur.
//
// Deux variants disponibles :
//   - "mark"       → carré gradient seul (Vital Fusion emerald→cyan→violet)
//                    avec lettre B + pastille 360. Idéal pour eyebrows, cards,
//                    coach cards (remplace l'avatar initiales).
//   - "horizontal" → version horizontale (logo + wordmark côte à côte).
//                    Idéal pour headers / footers.
//
// Fallback gracieux : si le fichier ne charge pas (404), affiche un cercle
// gradient teal→violet vide. Jamais d'image cassée.
// =============================================================================

import { useState } from "react";

export type LaBase360LogoVariant = "mark" | "horizontal";

interface Props {
  /** Default "mark". */
  variant?: LaBase360LogoVariant;
  /** Taille en px (hauteur). Default 48 pour mark, 36 pour horizontal. */
  size?: number;
  /** Texte alternatif. Default "La Base 360". */
  alt?: string;
  /** className optionnel pour styling parent. */
  className?: string;
  /** style optionnel. */
  style?: React.CSSProperties;
}

const FILE_BY_VARIANT: Record<LaBase360LogoVariant, string> = {
  mark: "/brand/labase360/logo-primary.svg",
  horizontal: "/brand/labase360/logo-horizontal.svg",
};

export function LaBase360Logo({
  variant = "mark",
  size,
  alt = "La Base 360",
  className,
  style,
}: Props) {
  const [errored, setErrored] = useState(false);
  const px = size ?? (variant === "horizontal" ? 36 : 48);

  if (errored) {
    // Fallback : cercle gradient teal→violet pour ne JAMAIS afficher
    // d'image cassée. Respecte la palette brand publique.
    return (
      <div
        className={className}
        aria-label={alt}
        role="img"
        style={{
          width: px,
          height: px,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%)",
          flexShrink: 0,
          ...style,
        }}
      />
    );
  }

  return (
    <img
      src={FILE_BY_VARIANT[variant]}
      alt={alt}
      className={className}
      onError={() => setErrored(true)}
      style={{
        height: px,
        width: variant === "mark" ? px : "auto",
        objectFit: "contain",
        display: "inline-block",
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
