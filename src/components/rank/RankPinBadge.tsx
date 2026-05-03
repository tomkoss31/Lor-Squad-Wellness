// =============================================================================
// RankPinBadge — affiche le pin Herbalife officiel selon le rang (2026-05-03)
//
// Affiche les pins officiels Herbalife (Distributor → President's Team) qui
// servent de référence visuelle universelle dans l'écosystème Herbalife.
//
// Les images sont stockées dans /public/pins/ (PNG fond transparent).
// Cf. /public/pins/README.md pour la liste exacte des fichiers attendus.
//
// Si un pin est absent du dossier (ex. en dev avant que Thomas dépose les
// fichiers), un fallback initiales gris s'affiche, jamais d'image cassée.
//
// Usage :
//   <RankPinBadge rank={user.currentRank} size="sm" />
//   <RankPinBadge rank="supervisor_50" size="lg" showLabel glow />
// =============================================================================

import { useState } from "react";
import type { HerbalifeRank } from "../../types/domain";
import { RANK_LABELS } from "../../types/domain";

export type RankPinSize = "sm" | "md" | "lg" | "xl";

interface Props {
  rank: HerbalifeRank;
  size?: RankPinSize;
  /** Affiche le label dessous (rang court). Default false. */
  showLabel?: boolean;
  /** Glow animé subtil pour highlight (ex. "c'est mon rang actuel"). */
  glow?: boolean;
  /** className optionnel pour styling parent. */
  className?: string;
}

const PIN_FILE: Record<HerbalifeRank, string> = {
  distributor_25: "/pins/distributor.webp",
  senior_consultant_35: "/pins/senior-consultant.webp",
  success_builder_42: "/pins/success-builder.webp",
  supervisor_50: "/pins/supervisor.webp",
  active_supervisor_50: "/pins/active-supervisor.webp",
  world_team_50: "/pins/world-team.webp",
  active_world_team_50: "/pins/active-world-team.webp",
  get_team_50: "/pins/get-team.webp",
  get_team_2500_50: "/pins/get-team-2500.webp",
  millionaire_50: "/pins/millionaire-team.webp",
  millionaire_7500_50: "/pins/millionaire-team-7500.webp",
  // Note : Thomas a nommé le fichier "president-team" (singulier) au
  // lieu de "presidents-team" comme prévu initialement. On suit ses
  // fichiers, pas la spec.
  presidents_50: "/pins/president-team.webp",
};

/**
 * Pins décoratifs/branding additionnels disponibles (non-rang).
 * Réutilisables pour les certificats, hero pages, ou autres éléments
 * visuels qui ont besoin d'un emblème Herbalife générique.
 */
export const PIN_DECORATIVE = {
  fleur: "/pins/fleur.webp",
  herbalife_logo: "/pins/herbalife.webp",
  live_your_best_life: "/pins/live-your-best-life.webp",
} as const;

const SHORT_LABEL: Record<HerbalifeRank, string> = {
  distributor_25: "Distributor",
  senior_consultant_35: "Senior Cons.",
  success_builder_42: "Success B.",
  supervisor_50: "Supervisor",
  active_supervisor_50: "Active Sup.",
  world_team_50: "World Team",
  active_world_team_50: "Active WT",
  get_team_50: "G.E.T.",
  get_team_2500_50: "G.E.T. 2500",
  millionaire_50: "Millionaire",
  millionaire_7500_50: "Million. 7500",
  presidents_50: "President's",
};

const SIZE_PX: Record<RankPinSize, number> = {
  sm: 40,
  md: 64,
  lg: 96,
  xl: 128,
};

export function RankPinBadge({
  rank,
  size = "md",
  showLabel = false,
  glow = false,
  className,
}: Props) {
  const [imgError, setImgError] = useState(false);
  const px = SIZE_PX[size];
  const labelFontSize = size === "xl" ? 12 : size === "lg" ? 11 : size === "md" ? 9 : 8;
  const src = PIN_FILE[rank];
  const label = RANK_LABELS[rank];

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        gap: showLabel ? 4 : 0,
      }}
      title={label}
    >
      <div
        style={{
          width: px,
          height: px,
          position: "relative",
          filter: glow
            ? "drop-shadow(0 0 8px rgba(201, 168, 76, 0.5)) drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
            : "drop-shadow(0 2px 4px rgba(0,0,0,0.25))",
          animation: glow ? "ls-pin-glow 2.6s ease-in-out infinite" : undefined,
        }}
      >
        {imgError ? (
          <FallbackPin rank={rank} px={px} />
        ) : (
          <img
            src={src}
            alt={label}
            width={px}
            height={px}
            onError={() => setImgError(true)}
            style={{
              width: px,
              height: px,
              objectFit: "contain",
              display: "block",
            }}
          />
        )}
      </div>
      {showLabel && (
        <div
          style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: labelFontSize,
            fontWeight: 700,
            color: "var(--ls-text-muted)",
            textTransform: "uppercase",
            letterSpacing: 0.6,
            textAlign: "center",
            marginTop: 2,
          }}
        >
          {SHORT_LABEL[rank]}
        </div>
      )}
      <style>{`
        @keyframes ls-pin-glow {
          0%, 100% { filter: drop-shadow(0 0 4px rgba(201, 168, 76, 0.4)) drop-shadow(0 2px 4px rgba(0,0,0,0.3)); }
          50% { filter: drop-shadow(0 0 14px rgba(201, 168, 76, 0.7)) drop-shadow(0 2px 4px rgba(0,0,0,0.3)); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ls-pin-glow { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

/** Fallback affiché si le PNG est absent du dossier /public/pins/. */
function FallbackPin({ rank, px }: { rank: HerbalifeRank; px: number }) {
  const initials = SHORT_LABEL[rank]
    .split(/[\s.]+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      style={{
        width: px,
        height: px,
        borderRadius: "50%",
        background: "radial-gradient(circle at 30% 30%, #6A6A6A 0%, #2D2D2D 80%)",
        border: "1px solid rgba(255,255,255,0.15)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "rgba(255,255,255,0.85)",
        fontFamily: "Syne, serif",
        fontWeight: 700,
        fontSize: px * 0.32,
      }}
    >
      {initials}
    </div>
  );
}
