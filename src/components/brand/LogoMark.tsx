// =============================================================================
// LogoMark — le monogramme La Base 360, en SVG inline (2026-08-09)
// =============================================================================
//
// POURQUOI UN COMPOSANT ET PAS UN <img src="...svg"> :
// un SVG chargé via <img> est un document isolé — il n'hérite NI des polices
// NI des variables CSS de la page. Impossible donc de le faire suivre le thème.
//
// Or le monogramme a un B plein, et l'app a deux thèmes :
//   - sombre : sidebar #1E3330  → il faut un B clair
//   - clair  : sidebar #FFFFFF  → il faut un B foncé
//
// Un B blanc en dur disparaît sur le thème clair ; lui coller une pastille
// sombre règle le contraste mais pose un vilain carré sur les fonds déjà
// sombres (retour Thomas 2026-08-09 : « c'est moche, pourquoi le fond carré »).
//
// D'où ce composant : les 3 couleurs sont des tokens, le fond reste
// TRANSPARENT. Il se fond partout et suit le thème tout seul.
//
// La pastille (fond vert profond + monogramme) reste le bon choix pour une
// vraie ICÔNE D'APPLICATION — favicon, écran d'accueil du téléphone, PWA — où
// une plaque est attendue. Ces fichiers-là sont dans public/brand/labase360/.
//
// Charte : docs/IDENTITE-GRAPHIQUE.md
// =============================================================================

interface Props {
  /** Taille en px (carré). Défaut 40. */
  size?: number;
  /** Couleur du B. Défaut : la couleur de texte du thème. */
  letterColor?: string;
  className?: string;
  style?: React.CSSProperties;
  /** Texte alternatif ; si vide, le logo est décoratif (masqué aux lecteurs d'écran). */
  title?: string;
}

export function LogoMark({
  size = 40,
  letterColor = "var(--ls-text)",
  className,
  style,
  title = "La Base 360",
}: Props) {
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      style={{ display: "block", flexShrink: 0, ...style }}
      role={title ? "img" : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      {/* L'anneau, ouvert en haut à droite — la signature du logo */}
      <path
        d="M 176.3 71.6 A 80 80 0 1 1 128.3 23.6"
        fill="none"
        stroke="var(--ls-teal)"
        strokeWidth="13"
        strokeLinecap="round"
      />
      {/* La barre lime posée dans l'ouverture */}
      <rect
        x="-24"
        y="-6.5"
        width="48"
        height="13"
        rx="6.5"
        fill="var(--ls-lime)"
        transform="translate(159 41) rotate(-45)"
      />
      {/* Le B plein — suit la couleur du texte, donc lisible dans les 2 thèmes */}
      <path
        fillRule="evenodd"
        fill={letterColor}
        d="M 66 52 L 111 52 C 131 52 144 63.5 144 77 C 144 88 137 95.5 127 99.5 C 139.5 103 149 112.5 149 126 C 149 140.5 135 151 113 151 L 66 151 Z M 87 70 L 87 91 L 109 91 C 118.5 91 124 86.5 124 80.5 C 124 74.5 118.5 70 109 70 Z M 87 110 L 87 133 L 112 133 C 122 133 128 128 128 121.5 C 128 115 122 110 112 110 Z"
      />
    </svg>
  );
}
