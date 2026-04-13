import { cn } from "../../lib/utils"

interface StatusBadgeProps {
  label: string
  tone?: "blue" | "green" | "red" | "amber"
}

export function StatusBadge({ label, tone = "blue" }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide",
        tone === "blue" && "bg-[rgba(45,212,191,0.1)] text-[#2DD4BF]",
        tone === "green" && "bg-[rgba(45,212,191,0.1)] text-[#2DD4BF]",
        tone === "red" && "bg-[rgba(251,113,133,0.1)] text-[#FB7185]",
        tone === "amber" && "bg-[rgba(201,168,76,0.12)] text-[#C9A84C]"
      )}
    >
      {label}
    </span>
  )
}
