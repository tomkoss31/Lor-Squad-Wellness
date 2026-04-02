import { cn } from "../../lib/utils";

interface StatusBadgeProps {
  label: string;
  tone?: "blue" | "green" | "red" | "amber";
}

export function StatusBadge({ label, tone = "blue" }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-[30px] items-center rounded-full px-3.5 py-1.5 text-[11px] font-medium tracking-[0.03em] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        tone === "blue" && "bg-sky-400/[0.12] text-sky-100 ring-1 ring-sky-200/8",
        tone === "green" && "bg-emerald-400/[0.12] text-emerald-100 ring-1 ring-emerald-200/8",
        tone === "red" && "bg-rose-400/[0.12] text-rose-100 ring-1 ring-rose-200/8",
        tone === "amber" && "bg-[rgba(239,197,141,0.12)] text-[rgba(255,235,214,0.96)] ring-1 ring-[rgba(239,197,141,0.08)]"
      )}
    >
      {label}
    </span>
  );
}
