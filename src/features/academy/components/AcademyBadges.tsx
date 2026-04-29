// Chantier Academy direction 5 (2026-04-28).
// Badges de progression visibles sur AcademyOverviewPage. Etat derive
// du view (pas de DB) : completedCount + isCompleted. 4 paliers.

interface BadgeDef {
  id: string;
  emoji: string;
  label: string;
  hint: string;
  threshold: (completedCount: number, isCompleted: boolean) => boolean;
}

const BADGES: BadgeDef[] = [
  {
    id: "first-step",
    emoji: "🌱",
    label: "Premier pas",
    hint: "Première section terminée",
    threshold: (count) => count >= 1,
  },
  {
    id: "halfway",
    emoji: "⛰️",
    label: "À mi-chemin",
    hint: "4 sections sur 8",
    threshold: (count) => count >= 4,
  },
  {
    id: "sprint",
    emoji: "🏃",
    label: "Sprint final",
    hint: "6 sections sur 8",
    threshold: (count) => count >= 6,
  },
  {
    id: "graduate",
    emoji: "🎓",
    label: "Académicien",
    hint: "Academy 100 % complétée",
    threshold: (_, isCompleted) => isCompleted,
  },
];

interface Props {
  completedCount: number;
  isCompleted: boolean;
}

export function AcademyBadges({ completedCount, isCompleted }: Props) {
  const totalUnlocked = BADGES.filter((b) => b.threshold(completedCount, isCompleted)).length;

  return (
    <div
      style={{
        background: "var(--ls-surface2)",
        border: "0.5px solid var(--ls-border)",
        borderRadius: 14,
        padding: "16px 18px",
        marginBottom: 16,
      }}
    >
      <style>{`
        @keyframes ls-badge-unlock {
          0% { transform: scale(0.6) rotate(-12deg); opacity: 0; }
          60% { transform: scale(1.08) rotate(4deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        <p
          style={{
            fontSize: 11,
            color: "var(--ls-text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            margin: 0,
            fontWeight: 600,
          }}
        >
          Tes badges
        </p>
        <span
          style={{
            fontSize: 11,
            color: "var(--ls-gold)",
            fontWeight: 600,
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          {totalUnlocked} / {BADGES.length} débloqués
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${BADGES.length}, 1fr)`,
          gap: 10,
        }}
      >
        {BADGES.map((badge) => {
          const unlocked = badge.threshold(completedCount, isCompleted);
          return (
            <div
              key={badge.id}
              title={`${badge.label} — ${badge.hint}`}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                padding: "10px 6px",
                borderRadius: 10,
                background: unlocked
                  ? "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 12%, var(--ls-surface)), var(--ls-surface))"
                  : "var(--ls-surface)",
                border: unlocked ? "1px solid color-mix(in srgb, var(--ls-gold) 30%, transparent)" : "0.5px solid var(--ls-border)",
                opacity: unlocked ? 1 : 0.45,
                transition: "opacity 300ms",
              }}
            >
              <span
                style={{
                  fontSize: 28,
                  filter: unlocked ? "none" : "grayscale(1)",
                  animation: unlocked ? "ls-badge-unlock 600ms cubic-bezier(0.2, 0.8, 0.2, 1.2)" : undefined,
                }}
              >
                {badge.emoji}
              </span>
              <span
                style={{
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: 10,
                  fontWeight: unlocked ? 600 : 500,
                  color: unlocked ? "var(--ls-gold)" : "var(--ls-text-hint)",
                  textAlign: "center",
                  letterSpacing: "0.02em",
                }}
              >
                {badge.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
