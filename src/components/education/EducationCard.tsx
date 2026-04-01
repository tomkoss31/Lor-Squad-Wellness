import type { VisualCardContent } from "../../types/domain";
import { StatusBadge } from "../ui/StatusBadge";

interface EducationCardProps {
  item: VisualCardContent;
}

export function EducationCard({ item }: EducationCardProps) {
  const tone = item.accent;

  return (
    <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-2xl text-white">{item.title}</p>
        <StatusBadge
          label={
            item.kind === "comparison"
              ? "Comparatif"
              : item.kind === "routine"
                ? "Routine"
                : item.kind === "focus"
                  ? "Focus"
                  : "Info"
          }
          tone={tone}
        />
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-400">{item.description}</p>
      <div className="mt-5 grid gap-2">
        {item.points.map((point) => (
          <div
            key={point}
            className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-200"
          >
            {point}
          </div>
        ))}
      </div>
    </div>
  );
}
