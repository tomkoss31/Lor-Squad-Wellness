interface MetricTileProps {
  label: string
  value: string | number
  hint: string
  accent?: "blue" | "green" | "red" | "amber"
}

const ACCENT_COLORS = {
  blue:  "#2DD4BF",
  green: "#2DD4BF",
  red:   "#FB7185",
  amber: "#C9A84C",
}

export function MetricTile({ label, value, hint, accent = "blue" }: MetricTileProps) {
  const color = ACCENT_COLORS[accent]
  return (
    <div
      className="rounded-[14px] bg-[var(--ls-surface)] p-5 border border-white/[0.07]"
      style={{ borderTop: `2px solid ${color}` }}
    >
      <p className="eyebrow-label mb-3">{label}</p>
      <p
        className="text-[1.9rem] font-bold leading-none mb-2"
        style={{ color, fontFamily: "Syne, sans-serif" }}
      >
        {value}
      </p>
      <p className="text-[11px] text-[var(--ls-text-hint)]">{hint}</p>
    </div>
  )
}
