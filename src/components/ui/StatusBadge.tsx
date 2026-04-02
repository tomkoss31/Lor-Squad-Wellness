import { cn } from "../../lib/utils";

interface StatusBadgeProps {
  label: string;
  tone?: "blue" | "green" | "red" | "amber";
}

export function StatusBadge({ label, tone = "blue" }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-medium tracking-[0.04em]",
        tone === "blue" && "bg-sky-400/[0.12] text-sky-100",
        tone === "green" && "bg-emerald-400/[0.12] text-emerald-100",
        tone === "red" && "bg-rose-400/[0.12] text-rose-100",
        tone === "amber" && "bg-[rgba(239,197,141,0.12)] text-[rgba(255,235,214,0.96)]"
      )}
    >
      {label}
    </span>
  );
}
