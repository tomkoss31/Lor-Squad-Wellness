import { cn } from "../../lib/utils"

interface StatusBadgeProps {
  label: string
  tone?: "blue" | "green" | "red" | "amber" | "purple" | "gray"
}

// UX Polish global (2026-04-20) : aligné sur la classe utilitaire .ls-badge
// (uppercase, letter-spacing 0.03em, opacity 0.12 du fond, couleur pleine,
// 11px). Les tones "blue"/"green" mappent sur teal pour rester cohérents
// avec le design system (une seule couleur "positive" dans l'app).
const TONES = {
  blue:   { bg: "rgba(var(--ls-teal-rgb), 0.12)",   fg: "var(--ls-teal)" },
  green:  { bg: "rgba(var(--ls-teal-rgb), 0.12)",   fg: "var(--ls-teal)" },
  red:    { bg: "rgba(var(--ls-coral-rgb), 0.12)",  fg: "var(--ls-coral)" },
  amber:  { bg: "rgba(var(--ls-gold-rgb), 0.12)",   fg: "var(--ls-gold)" },
  purple: { bg: "rgba(var(--ls-purple-rgb), 0.12)", fg: "var(--ls-purple)" },
  gray:   { bg: "var(--ls-surface2)",               fg: "var(--ls-text-muted)" },
} as const

export function StatusBadge({ label, tone = "blue" }: StatusBadgeProps) {
  const { bg, fg } = TONES[tone]
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-[10px] py-1 text-[11px] font-medium uppercase tracking-[0.03em] whitespace-nowrap"
      )}
      style={{ background: bg, color: fg, letterSpacing: "0.03em" }}
    >
      {label}
    </span>
  )
}
