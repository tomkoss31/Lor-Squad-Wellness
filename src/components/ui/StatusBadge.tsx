import { cn } from "../../lib/utils"

interface StatusBadgeProps {
  label: string
  tone?: "blue" | "green" | "red" | "amber" | "purple" | "gray"
}

const TONES = {
  blue:   "bg-[rgba(45,212,191,0.1)] text-[#2DD4BF]",
  green:  "bg-[rgba(45,212,191,0.1)] text-[#2DD4BF]",
  red:    "bg-[rgba(251,113,133,0.1)] text-[#FB7185]",
  amber:  "bg-[rgba(201,168,76,0.12)] text-[#C9A84C]",
  purple: "bg-[rgba(167,139,250,0.1)] text-[#A78BFA]",
  gray:   "bg-white/[0.06] text-[#7A8099]",
}

export function StatusBadge({ label, tone = "blue" }: StatusBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide",
      TONES[tone]
    )}>
      {label}
    </span>
  )
}
