// =============================================================================
// RentabilityGauge — jauge ronde animée premium (2026-05-05)
//
// Effet WOW : SVG donut 270° avec gradient rouge → orange → vert,
// animation count-up + arc fill, glow pulse subtil dans le vert.
//
// V2 (2026-05-05) — fix UX Thomas : compact resserré (140px au lieu de 180),
// retire les sub-labels qui doublonnent avec le widget parent. Hero garde
// les labels (page dédiée).
// =============================================================================

import { useEffect, useRef, useState } from "react";
import {
  rentabilityZone,
  type RentabilityData,
  type RentabilityZone,
} from "../../hooks/useUserRentability";

interface RentabilityGaugeProps {
  data: RentabilityData;
  size?: "compact" | "hero";
  onClick?: () => void;
  delay?: number;
  /** Si false, on n'affiche pas les labels sous la jauge (pour widget compact). */
  showLabels?: boolean;
}

const ZONE_META: Record<RentabilityZone, { color: string; label: string; emoji: string; gradient: string[] }> = {
  red: {
    color: "var(--ls-coral)",
    label: "À booster",
    emoji: "🔥",
    gradient: ["#DC6B5C", "#F08C7A"],
  },
  orange: {
    color: "var(--ls-gold)",
    label: "En route",
    emoji: "⚡",
    gradient: ["#B8922A", "#E5B546"],
  },
  green: {
    color: "var(--ls-teal)",
    label: "Carton plein",
    emoji: "✨",
    gradient: ["#0D9488", "#34D399"],
  },
};

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function RentabilityGauge({
  data,
  size = "compact",
  onClick,
  delay = 0,
  showLabels = true,
}: RentabilityGaugeProps) {
  const isHero = size === "hero";
  // Compact resserré : 140 au lieu de 180 (gain ~22 % de hauteur sur Co-pilote)
  const dim = isHero ? 280 : 140;
  const stroke = isHero ? 22 : 12;
  const radius = dim / 2 - stroke / 2 - 4;
  const center = dim / 2;

  const startAngle = 135;
  const endAngle = 405;
  const totalAngle = endAngle - startAngle;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (totalAngle / 360) * circumference;

  const zone = rentabilityZone(data.margin_eur);
  const meta = ZONE_META[zone];

  const maxScale = Math.max(data.projection_eur, data.margin_eur * 1.5, 800);
  const fillRatio = Math.min(data.margin_eur / maxScale, 1);

  const [animatedValue, setAnimatedValue] = useState(0);
  const [animatedFill, setAnimatedFill] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    // BUG FIX 2026-11-07 : startedRef guard empechait les updates apres
    // le premier render. Quand data.margin_eur change (manual entries
    // chargees en async, ou breakdown sauve), la jauge restait bloquee
    // sur l'ancienne valeur.
    // - Premier mount : animation count-up depuis 0
    // - Updates ulterieurs : update direct sans animation (sinon flicker)
    if (startedRef.current) {
      setAnimatedValue(data.margin_eur);
      setAnimatedFill(fillRatio);
      return;
    }
    startedRef.current = true;

    const startTimer = setTimeout(() => {
      const duration = 1400;
      const startTime = performance.now();
      const tick = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutCubic(progress);
        setAnimatedValue(data.margin_eur * eased);
        setAnimatedFill(fillRatio * eased);
        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          setAnimatedValue(data.margin_eur);
          setAnimatedFill(fillRatio);
        }
      };
      requestAnimationFrame(tick);
    }, delay);

    return () => clearTimeout(startTimer);
  }, [data.margin_eur, fillRatio, delay]);

  const polarToCartesian = (angleDeg: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad),
    };
  };

  const start = polarToCartesian(startAngle);
  const end = polarToCartesian(endAngle);
  const largeArc = totalAngle > 180 ? 1 : 0;
  const arcPathBg = `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;

  const projFillRatio =
    data.projection_eur > 0 ? Math.min(data.projection_eur / maxScale, 1) : 0;

  const gradientId = `rent-gauge-${zone}-${size}`;
  const glowId = `rent-glow-${zone}-${size}`;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...wrapperStyle,
        cursor: onClick ? "pointer" : "default",
        width: dim,
        // Hauteur réduite si pas de labels (widget compact)
        height: dim + (showLabels ? (isHero ? 70 : 30) : 0),
      }}
      className="ls-rent-gauge-wrapper"
      aria-label={`Rentabilité : ${Math.round(data.margin_eur)} €, zone ${meta.label}`}
    >
      <div style={{ position: "relative", width: dim, height: dim }}>
        <svg width={dim} height={dim} style={{ display: "block" }}>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={meta.gradient[0]} />
              <stop offset="100%" stopColor={meta.gradient[1]} />
            </linearGradient>
            <linearGradient id={`${gradientId}-track`} x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#DC6B5C" stopOpacity="0.28" />
              <stop offset="50%" stopColor="#B8922A" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#0D9488" stopOpacity="0.28" />
            </linearGradient>
            <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path
            d={arcPathBg}
            fill="none"
            stroke={`url(#${gradientId}-track)`}
            strokeWidth={stroke}
            strokeLinecap="round"
          />

          {data.projection_eur > data.margin_eur && (
            <path
              d={arcPathBg}
              fill="none"
              stroke={meta.color}
              strokeWidth={stroke - 4}
              strokeLinecap="round"
              strokeDasharray={`${arcLength * projFillRatio * animatedFill} ${arcLength}`}
              opacity={0.25}
              style={{ transition: "stroke-dasharray 0.4s ease" }}
            />
          )}

          <path
            d={arcPathBg}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${arcLength * animatedFill} ${arcLength}`}
            filter={zone === "green" ? `url(#${glowId})` : undefined}
            className={zone === "green" ? "ls-rent-gauge-pulse" : ""}
          />

          <g style={{ pointerEvents: "none" }}>
            <text
              x={center}
              y={center - (isHero ? 4 : 2)}
              textAnchor="middle"
              fontFamily="Syne, sans-serif"
              fontSize={isHero ? 44 : 22}
              fontWeight="800"
              fill={meta.color}
              dominantBaseline="middle"
            >
              {Math.round(animatedValue).toLocaleString("fr-FR")}
              <tspan fontSize={isHero ? 22 : 12} fontWeight="600" dy={isHero ? -10 : -5}>
                {" €"}
              </tspan>
            </text>
            <text
              x={center}
              y={center + (isHero ? 28 : 16)}
              textAnchor="middle"
              fontFamily="DM Sans, sans-serif"
              fontSize={isHero ? 11 : 8}
              fontWeight="600"
              fill="var(--ls-text-muted)"
              letterSpacing="1pt"
              dominantBaseline="middle"
            >
              {meta.emoji} {meta.label.toUpperCase()}
            </text>
          </g>
        </svg>
      </div>

      {/* Labels sous la jauge — uniquement en mode hero (page dédiée) */}
      {showLabels && isHero && (
        <div style={labelsStyle}>
          <div style={{ ...subTitleStyle, color: meta.color }}>
            Ma rentabilité {monthLabel(data.month_start)}
          </div>
          {data.projection_eur > data.margin_eur && (
            <div style={projectionStyle}>
              🎯 Projection fin de mois : <strong style={{ color: meta.color }}>{Math.round(data.projection_eur).toLocaleString("fr-FR")} €</strong>
            </div>
          )}
        </div>
      )}

      <style>{`
        .ls-rent-gauge-wrapper {
          background: transparent;
          border: none;
          padding: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
        }
        .ls-rent-gauge-pulse {
          animation: ls-rent-pulse 2.4s ease-in-out infinite;
        }
        @keyframes ls-rent-pulse {
          0%, 100% { opacity: 1; filter: drop-shadow(0 0 8px var(--ls-teal)); }
          50% { opacity: 0.92; filter: drop-shadow(0 0 16px var(--ls-teal)); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ls-rent-gauge-pulse {
            animation: none;
          }
        }
      `}</style>
    </button>
  );
}

function monthLabel(iso: string): string {
  try {
    const d = new Date(iso + "T12:00:00Z");
    return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(d);
  } catch {
    return "";
  }
}

const wrapperStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
};

const labelsStyle: React.CSSProperties = {
  textAlign: "center",
  marginTop: 6,
};

const subTitleStyle: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontSize: 12,
  fontWeight: 700,
  textTransform: "capitalize",
  letterSpacing: 0.4,
};

const projectionStyle: React.CSSProperties = {
  fontFamily: "DM Sans, sans-serif",
  fontSize: 10,
  color: "var(--ls-text-muted)",
  marginTop: 3,
  letterSpacing: 0.3,
};
