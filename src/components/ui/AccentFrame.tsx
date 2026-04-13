import { cn } from "../../lib/utils";

interface AccentFrameProps {
  title: string;
  subtitle: string;
  accent?: "blue" | "green" | "red";
  compact?: boolean;
}

export function AccentFrame({
  title,
  subtitle,
  accent = "blue",
  compact = false
}: AccentFrameProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/50",
        compact ? "p-4" : "p-5"
      )}
    >
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-1",
          accent === "blue" && "bg-gradient-to-r from-sky-400 via-cyan-300 to-transparent",
          accent === "green" && "bg-gradient-to-r from-emerald-400 via-lime-300 to-transparent",
          accent === "red" && "bg-gradient-to-r from-rose-400 via-orange-300 to-transparent"
        )}
      />
      <div className="flex h-full flex-col justify-between gap-5">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-[#4A5068]">Zone visuelle</p>
          <p className={cn("mt-4 font-display text-white", compact ? "text-xl" : "text-2xl")}>
            {title}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="h-12 rounded-2xl bg-white/[0.04]" />
          <div className="h-12 rounded-2xl bg-white/[0.07]" />
          <div className="h-12 rounded-2xl bg-white/[0.04]" />
        </div>
        <p className="text-sm leading-6 text-[#7A8099]">{subtitle}</p>
      </div>
    </div>
  );
}
