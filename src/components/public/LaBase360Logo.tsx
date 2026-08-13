// =============================================================================
// LaBase360Logo — lecteur SVG du logo officiel La Base 360 (2026-05-18)
// Assets régénérés le 2026-08-13 (cf. scripts/generate-brand-assets.py)
// =============================================================================
//
// Wrapper léger autour des SVG officiels dans /public/brand/labase360/. Permet
// d'utiliser le logo brand de manière cohérente sur les pages publiques
// (Welcome bilan, Thank you, témoignage, business, newsletter) sans dupliquer
// les URLs en dur.
//
// Le symbole officiel est une construction PLATE : anneau teal ouvert (#2DD4BF)
// + barre lime à 45° (#C5F82A) + B blanc. Jamais d'ombre, de brillance ni de
// dégradé — les anciens assets « Vital Fusion » violaient ces trois règles et
// ont été remplacés.
//
// Variants :
//   - "mark"       → badge auto-porteur : symbole sur le fond de marque
//                    (vert profond, coins squircle). Lisible sur n'importe
//                    quel fond, clair comme sombre. Défaut.
//   - "horizontal" → lockup symbole + wordmark. Le wordmark est vectorisé
//                    (Anton) car un <img> ne peut pas hériter d'une police de
//                    la page. Pour un header où le texte doit rester vivant,
//                    composer en HTML : <mark /> + texte en Anton, plutôt que
//                    ce fichier.
//
// Fallback gracieux : si le fichier ne charge pas (404), on affiche une
// pastille pleine au fond de marque. Jamais d'image cassée.
// =============================================================================

import { useState } from "react";

export type LaBase360LogoVariant = "mark" | "horizontal";

/** Vert profond de la marque — sert aussi de fond au fallback. */
const BRAND_GROUND = "#162624";

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
    // Fallback : pastille pleine au fond de marque pour ne JAMAIS afficher
    // d'image cassée. Aplat uni — surtout pas de dégradé, la charte l'interdit
    // sur tout ce qui représente la marque.
    return (
      <div
        className={className}
        aria-label={alt}
        role="img"
        style={{
          width: px,
          height: px,
          borderRadius: "22%",
          background: BRAND_GROUND,
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
