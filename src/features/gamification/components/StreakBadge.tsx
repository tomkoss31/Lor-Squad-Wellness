// Gamification 1 - StreakBadge (2026-04-29).
// Badge "🔥 X jours d affilee" affiche sur le Co-pilote. Etat derive
// du hook useStreak. Cache si count = 0 (silence si jamais commence).

import { useStreak } from "../hooks/useStreak";

export function StreakBadge() {
  const streak = useStreak();
  if (!streak.loaded || streak.count === 0) return null;

  // Tier de couleur selon la longueur du streak
  let bg = "linear-gradient(135deg, #FAEEDA, #F0DBB0)";
  let color = "#5C4A0F";
  let emoji = "🔥";
  if (streak.count >= 30) {
    bg = "linear-gradient(135deg, #D85A30, #B8922A)";
    color = "white";
    emoji = "🔥🔥🔥";
  } else if (streak.count >= 7) {
    bg = "linear-gradient(135deg, #EF9F27, #BA7517)";
    color = "white";
    emoji = "🔥🔥";
  }

  return (
    <span
      title={`${streak.count} jour${streak.count > 1 ? "s" : ""} consécutif${streak.count > 1 ? "s" : ""} de connexion. Reviens demain pour continuer le streak !`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: bg,
        color,
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        fontFamily: "DM Sans, sans-serif",
        boxShadow: streak.count >= 7 ? "0 2px 8px rgba(186,117,23,0.30)" : "none",
        letterSpacing: "0.01em",
      }}
    >
      <span aria-hidden="true">{emoji}</span>
      <span>{streak.count} jour{streak.count > 1 ? "s" : ""} d&apos;affilée</span>
    </span>
  );
}
