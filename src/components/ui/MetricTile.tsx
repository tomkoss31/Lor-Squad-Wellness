import { cn } from "../../lib/utils";

interface MetricTileProps {
  label: string;
  value: string | number;
  hint: string;
  accent?: "blue" | "green" | "red";
}

export function MetricTile({
  label,
  value,
  hint,
  accent = "blue"
}: MetricTileProps) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.03))] p-4 shadow-luxe md:p-5">
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-1",
          accent === "blue" && "bg-gradient-to-r from-sky-300 via-cyan-200 to-transparent",
          accent === "green" && "bg-gradient-to-r from-emerald-300 via-lime-200 to-transparent",
          accent === "red" && "bg-gradient-to-r from-rose-300 via-amber-200 to-transparent"
        )}
      />
      <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-3 text-[2rem] font-semibold leading-[0.94] text-white md:text-[2.25rem]">
        {value}
      </p>
      <p className="mt-2.5 max-w-[18rem] text-[13px] leading-6 text-slate-400/95">{hint}</p>
    </div>
  );
}
