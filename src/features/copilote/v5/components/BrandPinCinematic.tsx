// =============================================================================
// BrandPinCinematic — pin's "B" La Base 360 cinematique (Phase 3 V7, 2026-05-08)
//
// Remplace PinAWTCinematic (sceau Herbalife) qui posait probleme :
//   1. Identite visuelle Herbalife = potentiel risque copyright dans une
//      page coach La Base 360 publique-friendly.
//   2. Esprit "automnal" gold/brown qui jurait avec la nouvelle identite
//      G3 Vital Fusion (emerald / cyan / violet).
//
// Ce composant affiche en filigrane :
//   - Un watermark "360" italique XL en background (heritage brand)
//   - Un disque gradient G3 en transparence avec une lettre "B" centree
//   - Rotation lente du disque (38s) + contre-rotation de la lettre
//     (38s) pour que le "B" reste lisible meme quand le disque tourne
//   - Float vertical (7s) pour vie discrete
//
// Tous les decorateurs sont masques sur mobile (<480px) via CSS perf.
// =============================================================================

import "./BrandPinCinematic.css";

interface BrandPinCinematicProps {
  /** Taille du disque pin's (px). Default 240. */
  size?: number;
  /** Opacite du disque (0-1). Default 0.42 — assez visible mais pas dominant. */
  opacity?: number;
}

export function BrandPinCinematic({
  size = 240,
  opacity = 0.42,
}: BrandPinCinematicProps) {
  return (
    <div
      className="brand-pin-cinematic"
      aria-hidden="true"
      style={
        {
          "--bpc-size": `${size}px`,
          "--bpc-opacity": opacity,
        } as React.CSSProperties
      }
    >
      {/* Watermark "360" italique XL en profondeur — heritage brand,
          c est le marqueur de la sphere editoriale "La Base 360". */}
      <div className="brand-pin-watermark">360</div>

      {/* Rings concentriques decoratifs (style "orbite cosmetique") */}
      <div className="brand-pin-ring brand-pin-ring--outer" />
      <div className="brand-pin-ring brand-pin-ring--inner" />

      {/* Disque pin's "B" gradient G3 + lettre centree. */}
      <div className="brand-pin-disc">
        <span className="brand-pin-letter">B</span>
      </div>

      {/* Label "LA BASE 360" en pastille mono au-dessus du disque (top-right) */}
      <div className="brand-pin-label">LA BASE 360</div>
    </div>
  );
}
