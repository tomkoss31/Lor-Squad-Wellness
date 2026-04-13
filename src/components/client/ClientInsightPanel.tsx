import { StatusBadge } from "../ui/StatusBadge";

interface ClientInsightPanelProps {
  title: string;
  subtitle: string;
  points: string[];
  tone?: "blue" | "green" | "red" | "amber";
}

export function ClientInsightPanel({
  title,
  subtitle,
  points,
  tone = "blue"
}: ClientInsightPanelProps) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-slate-950/40 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-2xl text-white">{title}</p>
        <StatusBadge label={subtitle} tone={tone} />
      </div>
      <div className="mt-4 grid gap-2">
        {points.map((point) => (
          <div
            key={point}
            className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-[#F0EDE8]"
          >
            {point}
          </div>
        ))}
      </div>
    </div>
  );
}
