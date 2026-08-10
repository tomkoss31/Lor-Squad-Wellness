// =============================================================================
// LogoSting — le logo qui se dessine, pour les écrans d'attente (2026-08-09)
// =============================================================================
//
// Séquence (reprise du sting animé conçu sur Claude Design, validé par Thomas) :
//   1. l'anneau teal se DESSINE          (0 → 0.9 s)
//   2. la barre lime CLAQUE en place     (0.85 → 1.2 s, avec rebond)
//   3. une onde s'échappe et s'efface    (1.1 → 1.9 s)
//   4. le B se RÉVÈLE par le bas         (1.0 → 1.7 s)
//   5. respiration lente en boucle       (à partir de 2 s)
//
// POURQUOI RÉÉCRIT EN CSS et pas importé tel quel : le projet Claude Design
// s'appuie sur un moteur d'animation (support.js, 69 Ko) et sur des variables
// globales window.* absentes de l'app. Ici : ~2 Ko, aucune dépendance, et ça
// tourne sur le compositeur du navigateur (donc fluide même pendant que l'app
// charge — ce qui est précisément le moment où on l'affiche).
//
// Les tracés sont RIGOUREUSEMENT ceux de LogoMark — une seule vérité de forme.
// Couleurs = tokens, donc l'écran d'attente suit le thème comme le reste.
// =============================================================================

interface Props {
  /** Taille en px (carré). Défaut 116. */
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Texte pour les lecteurs d'écran. Défaut « Chargement… ». */
  title?: string;
}

export function LogoSting({ size = 116, className, style, title = "Chargement…" }: Props) {
  return (
    <>
      <style>{`
        @keyframes lbst-ring   { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
        @keyframes lbst-bar    {
          0%   { transform: translate(52.3px, -52.3px); opacity: 0; }
          60%  { opacity: 1; }
          80%  { transform: translate(-4px, 4px); }
          100% { transform: translate(0, 0); opacity: 1; }
        }
        @keyframes lbst-echo   {
          from { r: 86px; opacity: .32; }
          to   { r: 132px; opacity: 0; }
        }
        @keyframes lbst-wipe   { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        @keyframes lbst-breathe{ 0%,100% { transform: scale(1); } 50% { transform: scale(1.035); } }

        .lbst { animation: lbst-breathe 3.6s ease-in-out 2s infinite; transform-origin: 50% 50%; }
        .lbst-ring { animation: lbst-ring .9s cubic-bezier(.65,0,.35,1) both; }
        .lbst-bar  { animation: lbst-bar .38s cubic-bezier(.34,1.56,.64,1) .85s both; }
        .lbst-echo { animation: lbst-echo .8s ease-out 1.1s both; }
        .lbst-wipe { animation: lbst-wipe .7s cubic-bezier(.65,0,.35,1) 1s both;
                     transform-origin: 100px 151px; }

        /* Respect du réglage système : on montre le logo posé, sans mouvement. */
        @media (prefers-reduced-motion: reduce) {
          .lbst, .lbst-ring, .lbst-bar, .lbst-echo, .lbst-wipe { animation: none !important; }
          .lbst-echo { opacity: 0; }
        }
      `}</style>
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        className={className ? `lbst ${className}` : "lbst"}
        style={{ display: "block", flexShrink: 0, overflow: "visible", ...style }}
        role="img"
        aria-label={title}
      >
        <title>{title}</title>

        {/* 3. l'onde qui s'échappe */}
        <circle className="lbst-echo" cx="100" cy="100" r="86" fill="none" stroke="var(--ls-teal)" strokeWidth="2" />

        {/* 1. l'anneau qui se dessine — pathLength=1 rend la longueur indépendante de l'échelle */}
        <path
          className="lbst-ring"
          d="M 176.3 71.6 A 80 80 0 1 1 128.3 23.6"
          fill="none"
          stroke="var(--ls-teal)"
          strokeWidth="13"
          strokeLinecap="round"
          pathLength="1"
          strokeDasharray="1 1"
        />

        {/* 2. la barre lime qui claque en place */}
        <g className="lbst-bar">
          <rect
            x="-24" y="-6.5" width="48" height="13" rx="6.5"
            fill="var(--ls-lime)"
            transform="translate(159 41) rotate(-45)"
          />
        </g>

        {/* 4. le B révélé par le bas (le rect du clip grandit vers le haut) */}
        <clipPath id="lbst-clip">
          <rect className="lbst-wipe" x="60" y="46" width="100" height="105" />
        </clipPath>
        <path
          clipPath="url(#lbst-clip)"
          fillRule="evenodd"
          fill="var(--ls-text)"
          d="M 66 52 L 111 52 C 131 52 144 63.5 144 77 C 144 88 137 95.5 127 99.5 C 139.5 103 149 112.5 149 126 C 149 140.5 135 151 113 151 L 66 151 Z M 87 70 L 87 91 L 109 91 C 118.5 91 124 86.5 124 80.5 C 124 74.5 118.5 70 109 70 Z M 87 110 L 87 133 L 112 133 C 122 133 128 128 128 121.5 C 128 115 122 110 112 110 Z"
        />
      </svg>
    </>
  );
}
