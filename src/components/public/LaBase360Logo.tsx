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
//   - "mark"       → le monogramme : B blanc plein dans un anneau teal ouvert
//                    en haut à droite + barre lime à 45°. Idéal pour eyebrows,
//                    cards, coach cards (remplace l'avatar initiales).
//   - "horizontal" → historiquement le lockup logo + wordmark. ⚠️ N'est
//                    utilisé NULLE PART aujourd'hui, et sert le même fichier
//                    que "mark". Le lockup avec texte se compose en HTML
//                    (mark + vrai Anton), jamais en SVG : un SVG chargé en
//                    <img> n'hérite pas des polices de la page.
//
// Fallback gracieux : si le fichier ne charge pas (404), affiche une pastille
// teal pleine. Jamais d'image cassée.
//
// Logo mis à jour le 2026-08-09 (charte docs/IDENTITE-GRAPHIQUE.md). L'ancien
// dégradé émeraude→cyan→violet est abandonné — ne pas le réintroduire.
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
    // Fallback : pastille teal pour ne JAMAIS afficher d'image cassée.
    // Palette de la charte 2026-08 (le dégradé émeraude→cyan→violet de
    // l'ancienne identité a été retiré avec le reste du doré/violet).
    return (
      <div
        className={className}
        aria-label={alt}
        role="img"
        style={{
          width: px,
          height: px,
          borderRadius: "50%",
          background: "var(--ls-teal, #2DD4BF)",
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
