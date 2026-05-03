// =============================================================================
// FormationStreakBadge — quick win #1 (2026-11-04)
//
// Affiche le streak Formation (jours consecutifs avec >= 1 module valide).
// Badges aux paliers 3 / 7 / 30 jours. Compact, chip horizontal, place
// au-dessus de la roadmap card sur /formation.
//
// Theme-aware via var(--ls-*).
// =============================================================================

import { useFormationStreak } from "../../hooks/useFormationStreak";

export function FormationStreakBadge() {
  const { loaded, count, badge, alreadyPingedToday } = useFormationStreak();

  if (!loaded) return null;

  // Si streak == 0 et jamais ping aujourd hui : on cache pour eviter le bruit
  // visuel pour les nouveaux distri qui n ont jamais commence.
  if (count === 0 && !alreadyPingedToday) return null;

  const accent = badge.color;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 18px",
        borderRadius: 14,
        background: `linear-gradient(90deg, color-mix(in srgb, ${accent} 8%, var(--ls-surface)) 0%, var(--ls-surface) 100%)`,
        border: `0.5px solid color-mix(in srgb, ${accent} 25%, var(--ls-border))`,
        boxShadow: `0 4px 14px -8px color-mix(in srgb, ${accent} 35%, transparent)`,
        flexWrap: "wrap",
      }}
    >
      {/* Emoji badge gros */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: `linear-gradient(135deg, ${accent} 0%, color-mix(in srgb, ${accent} 70%, var(--ls-bg)) 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
          boxShadow: `0 4px 12px color-mix(in srgb, ${accent} 35%, transparent), inset 0 1px 0 rgba(255,255,255,0.30)`,
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        {badge.emoji}
      </div>

      {/* Compteur + meta */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flex: 1, minWidth: 200 }}>
        <span
          style={{
            fontFamily: "Syne, serif",
            fontWeight: 800,
            fontSize: 30,
            letterSpacing: "-0.03em",
            color: accent,
            lineHeight: 1,
          }}
        >
          {count}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--ls-text)",
              letterSpacing: "-0.005em",
              lineHeight: 1.2,
            }}
          >
            jour{count > 1 ? "s" : ""} d'affilée · {badge.label}{" "}
            <span aria-hidden="true">{badge.emoji}</span>
          </div>
          <div
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: 11,
              color: "var(--ls-text-muted)",
              marginTop: 2,
              lineHeight: 1.4,
            }}
          >
            {alreadyPingedToday ? "✓ Module fait aujourd'hui · " : ""}
            {badge.hint}
          </div>
        </div>
      </div>

      {/* Mini chips paliers (3 / 7 / 30) */}
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        {[
          { at: 3, emoji: "🌱", color: "var(--ls-teal)" },
          { at: 7, emoji: "🔥", color: "var(--ls-coral)" },
          { at: 30, emoji: "⭐", color: "var(--ls-gold)" },
        ].map((p) => {
          const reached = count >= p.at;
          return (
            <div
              key={p.at}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: reached
                  ? `linear-gradient(135deg, ${p.color} 0%, color-mix(in srgb, ${p.color} 70%, var(--ls-bg)) 100%)`
                  : "var(--ls-surface2)",
                border: reached ? "none" : "0.5px dashed var(--ls-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                opacity: reached ? 1 : 0.4,
                boxShadow: reached
                  ? `0 2px 8px color-mix(in srgb, ${p.color} 35%, transparent)`
                  : "none",
                transition: "all 280ms ease",
              }}
              title={`Palier ${p.at} jours${reached ? " atteint" : ""}`}
              aria-label={`Palier ${p.at} jours${reached ? " atteint" : ""}`}
            >
              {p.emoji}
            </div>
          );
        })}
      </div>
    </div>
  );
}
