import { cn } from "../../lib/utils";

interface StatusBadgeProps {
  label: string;
  tone?: "blue" | "green" | "red" | "amber";
}

export function StatusBadge({ label, tone = "blue" }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] backdrop-blur-md shadow-luxe",
        tone === "blue" && "border-sky-300/18 bg-sky-400/[0.09] text-sky-50",
        tone === "green" && "border-emerald-300/18 bg-emerald-400/[0.09] text-emerald-50",
        tone === "red" && "border-rose-300/18 bg-rose-400/[0.09] text-rose-50",
        tone === "amber" && "border-amber-300/18 bg-amber-300/[0.09] text-amber-50"
      )}
    >
      {label}
    </span>
  );
}
