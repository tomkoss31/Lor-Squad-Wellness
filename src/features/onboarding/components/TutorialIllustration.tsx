// Chantier Academy polish C (2026-04-28).
// Mini-illustrations SVG inline pour les modales center du tour Academy.
// Palette Lor'Squad : gold #B8922A / teal #1D9E75 / coral #D85A30 /
// purple #7F77DD / cream #FAF6E8.
//
// Tailles : 240x140 box, design "premium pictogramme" (pas illustration
// detaillee), aligne sur le ton de l app.

import type { TutorialIllustrationKind } from "../types";

const GOLD = "#B8922A";
const GOLD_LIGHT = "#EF9F27";
const TEAL = "#1D9E75";
const CORAL = "#D85A30";
const PURPLE = "#7F77DD";
const CREAM = "#FAF6E8";
const CREAM_DARK = "#E5DFCF";
const INK = "#2C2C2A";

interface Props {
  kind: TutorialIllustrationKind;
}

export function TutorialIllustration({ kind }: Props) {
  const svg = renderSvg(kind);
  if (!svg) return null;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        marginBottom: 14,
        animation: "ls-illustration-float 3.4s ease-in-out infinite",
      }}
    >
      <style>{`
        @keyframes ls-illustration-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      `}</style>
      {svg}
    </div>
  );
}

function renderSvg(kind: TutorialIllustrationKind) {
  switch (kind) {
    case "wave":
      return (
        <svg width="240" height="140" viewBox="0 0 240 140" fill="none">
          <ellipse cx="120" cy="120" rx="90" ry="10" fill={CREAM_DARK} opacity="0.4" />
          <circle cx="120" cy="68" r="42" fill={CREAM} stroke={GOLD} strokeWidth="2.5" />
          <circle cx="108" cy="62" r="3.5" fill={INK} />
          <circle cx="132" cy="62" r="3.5" fill={INK} />
          <path d="M105 80 Q120 92 135 80" stroke={INK} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <circle cx="86" cy="50" r="6" fill={CORAL} opacity="0.85" />
          <circle cx="158" cy="44" r="5" fill={TEAL} opacity="0.75" />
          <path d="M180 30 L188 38 M188 30 L180 38" stroke={GOLD_LIGHT} strokeWidth="2" strokeLinecap="round" />
          <path d="M48 38 L52 34 L56 38 L52 42 Z" fill={PURPLE} opacity="0.8" />
        </svg>
      );

    case "rocket":
      return (
        <svg width="240" height="140" viewBox="0 0 240 140" fill="none">
          <ellipse cx="120" cy="125" rx="80" ry="6" fill={CREAM_DARK} opacity="0.4" />
          <path
            d="M120 20 Q140 40 140 70 L140 90 L100 90 L100 70 Q100 40 120 20 Z"
            fill={CREAM}
            stroke={GOLD}
            strokeWidth="2.5"
          />
          <circle cx="120" cy="58" r="9" fill={TEAL} stroke={INK} strokeWidth="1.5" />
          <path d="M100 80 L80 100 L100 92 Z" fill={CORAL} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M140 80 L160 100 L140 92 Z" fill={CORAL} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
          <path
            d="M115 95 Q118 110 110 120 M120 96 Q120 112 120 122 M125 95 Q122 110 130 120"
            stroke={GOLD_LIGHT}
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="60" cy="40" r="2" fill={GOLD_LIGHT} />
          <circle cx="180" cy="32" r="2.5" fill={PURPLE} />
          <circle cx="200" cy="60" r="2" fill={TEAL} />
          <circle cx="40" cy="78" r="2" fill={CORAL} />
        </svg>
      );

    case "person-card":
      return (
        <svg width="240" height="140" viewBox="0 0 240 140" fill="none">
          <rect x="40" y="30" width="160" height="80" rx="14" fill={CREAM} stroke={GOLD} strokeWidth="2" />
          <circle cx="70" cy="60" r="14" fill={GOLD} />
          <text x="70" y="65" fontFamily="Syne, serif" fontSize="13" fontWeight="600" fill="white" textAnchor="middle">
            SM
          </text>
          <rect x="92" y="50" width="90" height="6" rx="3" fill={INK} opacity="0.75" />
          <rect x="92" y="62" width="60" height="4" rx="2" fill={INK} opacity="0.4" />
          <rect x="56" y="86" width="40" height="14" rx="7" fill={TEAL} />
          <rect x="100" y="86" width="40" height="14" rx="7" fill={CREAM_DARK} />
          <rect x="144" y="86" width="40" height="14" rx="7" fill={CREAM_DARK} />
          <circle cx="190" cy="42" r="8" fill={CORAL} />
          <text x="190" y="46" fontFamily="DM Sans" fontSize="10" fontWeight="700" fill="white" textAnchor="middle">
            ★
          </text>
        </svg>
      );

    case "calendar-glow":
      return (
        <svg width="240" height="140" viewBox="0 0 240 140" fill="none">
          <rect x="60" y="30" width="120" height="92" rx="10" fill={CREAM} stroke={GOLD} strokeWidth="2" />
          <rect x="60" y="30" width="120" height="22" rx="10" fill={GOLD} />
          <circle cx="84" cy="22" r="4" fill={INK} />
          <circle cx="156" cy="22" r="4" fill={INK} />
          <line x1="84" y1="14" x2="84" y2="34" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="156" y1="14" x2="156" y2="34" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
          {/* Grille jours */}
          {[0, 1, 2, 3].map((row) =>
            [0, 1, 2, 3, 4].map((col) => (
              <circle
                key={`${row}-${col}`}
                cx={76 + col * 22}
                cy={66 + row * 14}
                r={3.5}
                fill={CREAM_DARK}
              />
            )),
          )}
          {/* RDV highlights */}
          <circle cx="120" cy="80" r="6" fill={TEAL} />
          <circle cx="142" cy="94" r="6" fill={CORAL} />
          <circle cx="98" cy="108" r="6" fill={PURPLE} />
        </svg>
      );

    case "chat-bubble":
      return (
        <svg width="240" height="140" viewBox="0 0 240 140" fill="none">
          <path
            d="M50 36 Q50 24 62 24 L154 24 Q166 24 166 36 L166 70 Q166 82 154 82 L80 82 L62 96 L62 82 Q50 82 50 70 Z"
            fill={CREAM}
            stroke={GOLD}
            strokeWidth="2"
          />
          <rect x="64" y="38" width="80" height="5" rx="2.5" fill={INK} opacity="0.7" />
          <rect x="64" y="50" width="62" height="4" rx="2" fill={INK} opacity="0.4" />
          <rect x="64" y="60" width="48" height="4" rx="2" fill={INK} opacity="0.4" />
          {/* Bulle réponse client */}
          <path
            d="M88 90 Q88 80 100 80 L184 80 Q196 80 196 90 L196 116 Q196 126 184 126 L172 126 L160 138 L160 126 L100 126 Q88 126 88 116 Z"
            fill={TEAL}
            opacity="0.92"
          />
          <rect x="102" y="94" width="70" height="5" rx="2.5" fill="white" />
          <rect x="102" y="106" width="50" height="4" rx="2" fill="white" opacity="0.7" />
          {/* Badge notif */}
          <circle cx="166" cy="24" r="9" fill={CORAL} />
          <text x="166" y="28" fontFamily="DM Sans" fontSize="11" fontWeight="700" fill="white" textAnchor="middle">
            2
          </text>
        </svg>
      );

    case "shopping-bag":
      return (
        <svg width="240" height="140" viewBox="0 0 240 140" fill="none">
          <path
            d="M82 50 L82 40 Q82 24 100 24 L140 24 Q158 24 158 40 L158 50"
            stroke={GOLD}
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M70 50 L170 50 L162 120 Q160 128 152 128 L88 128 Q80 128 78 120 Z"
            fill={CREAM}
            stroke={GOLD}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* 3 produits stylisés */}
          <rect x="92" y="68" width="14" height="42" rx="3" fill={TEAL} />
          <rect x="113" y="62" width="14" height="48" rx="3" fill={CORAL} />
          <rect x="134" y="72" width="14" height="38" rx="3" fill={PURPLE} />
          <text x="120" y="50" fontFamily="DM Sans" fontSize="10" fontWeight="700" fill={GOLD} textAnchor="middle">
            ★
          </text>
        </svg>
      );

    case "phone-pwa":
      return (
        <svg width="240" height="140" viewBox="0 0 240 140" fill="none">
          <rect x="86" y="14" width="68" height="116" rx="10" fill={INK} />
          <rect x="91" y="22" width="58" height="100" rx="4" fill={CREAM} />
          {/* Notch */}
          <rect x="108" y="22" width="24" height="3" rx="1.5" fill={INK} opacity="0.4" />
          {/* App grid */}
          <rect x="98" y="34" width="14" height="14" rx="3" fill={GOLD} />
          <rect x="116" y="34" width="14" height="14" rx="3" fill={TEAL} />
          <rect x="134" y="34" width="14" height="14" rx="3" fill={CORAL} />
          <rect x="98" y="52" width="14" height="14" rx="3" fill={PURPLE} />
          {/* Logo Lor'Squad agrandi */}
          <rect x="116" y="52" width="32" height="32" rx="7" fill={GOLD} />
          <text x="132" y="73" fontFamily="Syne, serif" fontSize="14" fontWeight="700" fill="white" textAnchor="middle">
            L
          </text>
          <text x="120" y="100" fontFamily="DM Sans" fontSize="6" fill={INK} textAnchor="middle" opacity="0.7">
            Lor&apos;Squad
          </text>
          {/* Sparkles autour pour évoquer "installé" */}
          <path d="M60 30 L66 30 M63 27 L63 33" stroke={GOLD_LIGHT} strokeWidth="2" strokeLinecap="round" />
          <path d="M178 50 L184 50 M181 47 L181 53" stroke={CORAL} strokeWidth="2" strokeLinecap="round" />
          <path d="M168 100 L172 100 M170 98 L170 102" stroke={TEAL} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case "trophy":
      return (
        <svg width="240" height="140" viewBox="0 0 240 140" fill="none">
          <ellipse cx="120" cy="128" rx="60" ry="6" fill={CREAM_DARK} opacity="0.4" />
          {/* Anses */}
          <path
            d="M86 50 Q70 50 70 65 Q70 78 88 80"
            stroke={GOLD}
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M154 50 Q170 50 170 65 Q170 78 152 80"
            stroke={GOLD}
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          {/* Coupe */}
          <path
            d="M88 36 L152 36 L148 86 Q146 96 138 96 L102 96 Q94 96 92 86 Z"
            fill={GOLD_LIGHT}
            stroke={GOLD}
            strokeWidth="2"
          />
          <path
            d="M96 44 L144 44"
            stroke="white"
            strokeWidth="2"
            opacity="0.6"
            strokeLinecap="round"
          />
          {/* Étoile centrale */}
          <path
            d="M120 56 L124 64 L132 65 L126 70 L128 78 L120 74 L112 78 L114 70 L108 65 L116 64 Z"
            fill="white"
          />
          {/* Pied + base */}
          <rect x="112" y="96" width="16" height="14" fill={GOLD} />
          <rect x="100" y="108" width="40" height="8" rx="2" fill={GOLD} />
          {/* Étincelles */}
          <path d="M58 60 L62 60 M60 58 L60 62" stroke={CORAL} strokeWidth="2" strokeLinecap="round" />
          <path d="M178 80 L184 80 M181 77 L181 83" stroke={TEAL} strokeWidth="2" strokeLinecap="round" />
          <path d="M64 30 L68 30 M66 28 L66 32" stroke={PURPLE} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case "sparkles":
      return (
        <svg width="240" height="140" viewBox="0 0 240 140" fill="none">
          <path d="M120 30 L126 56 L152 62 L126 68 L120 94 L114 68 L88 62 L114 56 Z" fill={GOLD} />
          <path d="M70 50 L73 60 L83 63 L73 66 L70 76 L67 66 L57 63 L67 60 Z" fill={TEAL} opacity="0.85" />
          <path d="M176 36 L179 46 L189 49 L179 52 L176 62 L173 52 L163 49 L173 46 Z" fill={CORAL} opacity="0.85" />
          <path d="M186 96 L188 104 L196 106 L188 108 L186 116 L184 108 L176 106 L184 104 Z" fill={PURPLE} opacity="0.8" />
          <path d="M52 100 L54 108 L62 110 L54 112 L52 120 L50 112 L42 110 L50 108 Z" fill={GOLD_LIGHT} opacity="0.85" />
        </svg>
      );

    case "ring-progress":
      return (
        <svg width="240" height="140" viewBox="0 0 240 140" fill="none">
          <circle cx="120" cy="70" r="44" fill="none" stroke={CREAM_DARK} strokeWidth="8" />
          <circle
            cx="120"
            cy="70"
            r="44"
            fill="none"
            stroke={GOLD}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="276"
            strokeDashoffset="138"
            transform="rotate(-90 120 70)"
          />
          <text
            x="120"
            y="76"
            fontFamily="Syne, serif"
            fontSize="22"
            fontWeight="600"
            fill={INK}
            textAnchor="middle"
          >
            50%
          </text>
          <path d="M52 50 L56 50 M54 48 L54 52" stroke={CORAL} strokeWidth="2" strokeLinecap="round" />
          <path d="M186 96 L190 96 M188 94 L188 98" stroke={TEAL} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case "alert-shield":
      return (
        <svg width="240" height="140" viewBox="0 0 240 140" fill="none">
          <path
            d="M120 24 L160 36 L160 78 Q160 102 120 120 Q80 102 80 78 L80 36 Z"
            fill={CREAM}
            stroke={GOLD}
            strokeWidth="2"
          />
          <circle cx="120" cy="68" r="22" fill={CORAL} opacity="0.18" />
          <text x="120" y="78" fontFamily="DM Sans" fontSize="32" fontWeight="700" fill={CORAL} textAnchor="middle">
            !
          </text>
          {/* 6 dots autour évoquant les 6 alertes */}
          <circle cx="92" cy="48" r="3" fill={CORAL} />
          <circle cx="148" cy="48" r="3" fill={CORAL} />
          <circle cx="98" cy="100" r="3" fill={CORAL} />
          <circle cx="142" cy="100" r="3" fill={CORAL} />
          <circle cx="86" cy="76" r="3" fill={GOLD} />
          <circle cx="154" cy="76" r="3" fill={GOLD} />
        </svg>
      );

    case "qr-share":
      return (
        <svg width="240" height="140" viewBox="0 0 240 140" fill="none">
          <rect x="60" y="20" width="100" height="100" rx="10" fill={CREAM} stroke={GOLD} strokeWidth="2" />
          {/* Faux QR — pattern modules */}
          {[
            [70, 30], [82, 30], [94, 30], [106, 30], [142, 30], [70, 42], [94, 42], [142, 42],
            [70, 54], [82, 54], [106, 54], [142, 54], [70, 66], [94, 66], [142, 66],
            [82, 78], [106, 78], [130, 78], [142, 78],
            [70, 90], [94, 90], [118, 90], [142, 90],
            [70, 102], [82, 102], [106, 102], [130, 102], [142, 102],
          ].map(([x, y], i) => (
            <rect key={i} x={x} y={y} width="8" height="8" rx="1" fill={INK} />
          ))}
          {/* Coin top-left + top-right markers */}
          <rect x="68" y="28" width="14" height="14" rx="2" fill="none" stroke={INK} strokeWidth="2" />
          <rect x="138" y="28" width="14" height="14" rx="2" fill="none" stroke={INK} strokeWidth="2" />
          <rect x="68" y="98" width="14" height="14" rx="2" fill="none" stroke={INK} strokeWidth="2" />
          {/* Boutons share à droite */}
          <circle cx="184" cy="42" r="14" fill="#25D366" />
          <text x="184" y="47" fontFamily="DM Sans" fontSize="14" fill="white" textAnchor="middle">
            ✓
          </text>
          <circle cx="184" cy="74" r="14" fill={TEAL} opacity="0.85" />
          <text x="184" y="79" fontFamily="DM Sans" fontSize="11" fontWeight="700" fill="white" textAnchor="middle">
            SMS
          </text>
          <circle cx="184" cy="106" r="14" fill={GOLD} />
          <text x="184" y="111" fontFamily="DM Sans" fontSize="14" fill="white" textAnchor="middle">
            🔗
          </text>
        </svg>
      );

    default:
      return null;
  }
}
