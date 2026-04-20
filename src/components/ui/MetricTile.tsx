interface MetricTileProps {
  label: string
  value: string | number
  hint: string
  accent?: "blue" | "green" | "red" | "amber" | "muted"
}

const ACCENT_COLORS: Record<NonNullable<MetricTileProps["accent"]>, string> = {
  blue:  "var(--ls-teal)",
  green: "var(--ls-teal)",
  red:   "var(--ls-coral)",
  amber: "var(--ls-gold)",
  muted: "var(--ls-text-muted)",
}

export function MetricTile({ label, value, hint, accent = "blue" }: MetricTileProps) {
  const color = ACCENT_COLORS[accent]
  const valueColor = accent === "muted" ? "var(--ls-text-muted)" : color
  return (
    <div
      className="rounded-[14px] bg-[var(--ls-surface)] p-5 border border-[var(--ls-border)]"
      style={{ borderTop: `2px solid ${color}` }}
    >
      <p className="eyebrow-label mb-3">{label}</p>
      <p
        className="text-[1.9rem] font-bold leading-none mb-2"
        style={{ color: valueColor, fontFamily: "Syne, sans-serif" }}
      >
        {value}
      </p>
      <p className="text-[11px] text-[var(--ls-text-hint)]">{hint}</p>
    </div>
  )
}
