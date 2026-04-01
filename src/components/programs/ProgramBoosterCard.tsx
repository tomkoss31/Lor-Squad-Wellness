import type { Program } from "../../types/domain";
import { StatusBadge } from "../ui/StatusBadge";

export function ProgramBoosterCard({ program }: { program: Program }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.025))] p-4 shadow-luxe">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <StatusBadge label={program.badge} tone={program.accent} />
          <p className="text-sm font-semibold text-white">{program.price}</p>
        </div>

        <div>
          <p className="text-lg font-semibold leading-tight text-white">{program.title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">{program.summary}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {program.benefits.slice(0, 2).map((benefit) => (
            <span
              key={benefit}
              className="rounded-full border border-white/10 bg-slate-950/30 px-3 py-1.5 text-xs text-slate-200"
            >
              {benefit}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
