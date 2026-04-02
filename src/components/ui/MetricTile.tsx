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
    <div className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(180deg,rgba(20,29,44,0.9),rgba(15,22,34,0.96))] p-5 shadow-soft">
      <div className="absolute inset-x-0 top-0 h-px bg-white/6" />
      <div
        className={cn(
          "absolute left-5 top-5 h-2.5 w-2.5 rounded-full",
          accent === "blue" && "bg-sky-300 shadow-[0_0_0_10px_rgba(89,183,255,0.10)]",
          accent === "green" && "bg-emerald-300 shadow-[0_0_0_10px_rgba(99,209,166,0.10)]",
          accent === "red" && "bg-[rgba(239,197,141,0.92)] shadow-[0_0_0_10px_rgba(239,197,141,0.10)]"
        )}
      />
      <p className="pl-5 text-[12px] font-medium text-slate-400">{label}</p>
      <p className="mt-5 text-[1.9rem] font-semibold leading-[0.96] tracking-[-0.03em] text-white md:text-[2.15rem]">
        {value}
      </p>
      <p className="mt-3 max-w-[18rem] text-[14px] leading-6 text-slate-400/88">{hint}</p>
    </div>
  );
}
