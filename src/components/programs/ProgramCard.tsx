import type { Program } from "../../types/domain";
import { Button } from "../ui/Button";
import { StatusBadge } from "../ui/StatusBadge";

interface ProgramCardProps {
  program: Program;
  selected?: boolean;
  onSelect?: () => void;
}

export function ProgramCard({ program, selected = false, onSelect }: ProgramCardProps) {
  return (
    <div
      className={`rounded-[30px] p-5 transition md:p-6 ${
        selected
          ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.045))] shadow-luxe ring-1 ring-white/12"
          : "bg-[linear-gradient(180deg,rgba(128,128,128,0.08),rgba(128,128,128,0.05))]"
      }`}
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <StatusBadge label={program.badge} tone={program.accent} />
          <p className="text-sm font-semibold text-white">{program.price}</p>
        </div>

        <div className="space-y-3">
          <h3 className="text-[1.75rem] leading-none text-white">{program.title}</h3>
          <p className="text-sm leading-6 text-[#B0B4C4]">{program.summary}</p>
        </div>

        <div className="grid gap-2">
          {program.benefits.slice(0, 3).map((benefit) => (
            <div
              key={benefit}
              className="rounded-[18px] bg-[var(--ls-bg)]/60 px-4 py-3 text-sm text-[var(--ls-text)]"
            >
              {benefit}
            </div>
          ))}
        </div>

        {program.composition?.length ? (
          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--ls-text-hint)]">
              Contenu court
            </p>
            <div className="flex flex-wrap gap-2">
              {program.composition.map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-white/[0.04] px-3 py-1.5 text-xs text-[var(--ls-text)]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <Button
          className="w-full"
          variant={selected ? "secondary" : "primary"}
          onClick={onSelect}
        >
          {selected ? "Programme selectionne" : "Selectionner"}
        </Button>
      </div>
    </div>
  );
}
