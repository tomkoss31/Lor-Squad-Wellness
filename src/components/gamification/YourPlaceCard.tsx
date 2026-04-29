// YourPlaceCard — "À ta place" card pour leaderboards (2026-04-29).
//
// Affiche la position du user courant et les points qu'il manque pour
// passer N-1. Utilise sous le PodiumTop3 dans les leaderboards.

import type { PodiumAccent } from "./PodiumTop3";

const ACCENT_MAP: Record<PodiumAccent, { primary: string; cssVar: string }> = {
  gold:   { primary: "#EF9F27", cssVar: "var(--ls-gold)" },
  purple: { primary: "#A78BFA", cssVar: "var(--ls-purple)" },
  teal:   { primary: "#2DD4BF", cssVar: "var(--ls-teal)" },
  coral:  { primary: "#FB7185", cssVar: "var(--ls-coral)" },
};

export interface YourPlaceCardProps {
  /** Rang actuel du user (1-N) */
  rank: number;
  /** Nombre total de participants */
  total: number;
  /** Score actuel du user */
  score: number;
  /** Score du user au rang juste au-dessus (rank-1). Undefined si user est 1er. */
  scoreOfPrevious?: number;
  /** Nom du user au rang juste au-dessus */
  nameOfPrevious?: string;
  /** Suffixe score (% / pts / bilans...) */
  scoreSuffix?: string;
  /** Couleur accent */
  accent: PodiumAccent;
  /** Message custom si premier (sinon "Tu es en tete !") */
  topMessage?: string;
}

export function YourPlaceCard({
  rank,
  total,
  score,
  scoreOfPrevious,
  nameOfPrevious,
  scoreSuffix = "",
  accent,
  topMessage,
}: YourPlaceCardProps) {
  const { primary, cssVar } = ACCENT_MAP[accent];
  const isFirst = rank === 1;
  const gap = scoreOfPrevious !== undefined ? scoreOfPrevious - score : 0;

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        marginTop: 18,
        padding: "14px 18px",
        borderRadius: 16,
        background: `linear-gradient(135deg, color-mix(in srgb, ${primary} 12%, var(--ls-surface)) 0%, var(--ls-surface) 100%)`,
        border: `0.5px solid color-mix(in srgb, ${primary} 35%, transparent)`,
        borderLeft: `3px solid ${cssVar}`,
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
      }}
    >
      {/* Rank tile */}
      <div
        style={{
          width: 52,
          height: 52,
          flexShrink: 0,
          borderRadius: 14,
          background: `linear-gradient(135deg, ${primary} 0%, color-mix(in srgb, ${primary} 70%, #000) 100%)`,
          color: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Syne, serif",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          boxShadow: `0 6px 16px -6px ${primary}80, inset 0 1px 0 rgba(255,255,255,0.30)`,
        }}
      >
        <div style={{ fontSize: 9, fontWeight: 700, opacity: 0.85, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: -2 }}>
          Rang
        </div>
        <div style={{ fontSize: 22, lineHeight: 1, textShadow: "0 1px 2px rgba(0,0,0,0.20)" }}>
          #{rank}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: 1.6,
            textTransform: "uppercase",
            fontWeight: 800,
            color: cssVar,
            fontFamily: "DM Sans, sans-serif",
            marginBottom: 3,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              display: "inline-block", width: 6, height: 6, borderRadius: 999,
              background: cssVar,
              boxShadow: `0 0 8px ${primary}90`,
            }}
          />
          Ta place
        </div>
        <div
          style={{
            fontFamily: "Syne, serif",
            fontWeight: 700,
            fontSize: 16,
            color: "var(--ls-text)",
            letterSpacing: "-0.01em",
            lineHeight: 1.25,
          }}
        >
          {isFirst ? (
            topMessage ?? "Tu es en tête du classement ! 🔥"
          ) : (
            <>
              {gap > 0 ? (
                <>
                  Encore <strong style={{ color: cssVar, fontWeight: 800 }}>{gap}{scoreSuffix && ` ${scoreSuffix}`}</strong>{" "}
                  pour passer{nameOfPrevious ? <> <strong>{nameOfPrevious}</strong></> : ` au rang #${rank - 1}`}
                </>
              ) : (
                <>Tu peux passer {nameOfPrevious ?? `#${rank - 1}`} cette saison 💪</>
              )}
            </>
          )}
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: "var(--ls-text-muted)",
            fontFamily: "DM Sans, sans-serif",
            marginTop: 3,
          }}
        >
          Score actuel : <strong style={{ color: "var(--ls-text)" }}>{score}{scoreSuffix && ` ${scoreSuffix}`}</strong> · {rank} sur {total}
        </div>
      </div>
    </div>
  );
}
