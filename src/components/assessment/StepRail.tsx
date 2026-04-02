import { cn } from "../../lib/utils";

interface StepRailProps {
  currentStep: number;
  steps: string[];
}

export function StepRail({ currentStep, steps }: StepRailProps) {
  return (
    <div className="glass-panel rounded-[24px] p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow-label">Parcours bilan</p>
        <p className="text-[12px] text-slate-400">
          Étape {currentStep + 1} / {steps.length}
        </p>
      </div>
      <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isComplete = index < currentStep;

          return (
            <div
              key={step}
              className={cn(
                "min-w-[190px] flex-shrink-0 rounded-[22px] px-3.5 py-3.5 transition sm:min-w-[220px] sm:px-4",
                isActive && "bg-[linear-gradient(180deg,rgba(89,183,255,0.14),rgba(89,183,255,0.08))] shadow-soft",
                isComplete && "bg-[linear-gradient(180deg,rgba(99,209,166,0.12),rgba(99,209,166,0.06))]",
                !isActive && !isComplete && "bg-white/[0.03]"
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold sm:text-sm",
                    isActive && "bg-sky-300/90 text-slate-950",
                    isComplete && "bg-emerald-300/90 text-slate-950",
                    !isActive && !isComplete && "bg-white/10 text-slate-300"
                  )}
                >
                  {index + 1}
                </div>
                <p className="text-[13px] font-semibold text-white sm:text-sm">{step}</p>
              </div>
              <p className="mt-2 pl-12 text-[12px] text-slate-400">
                {isActive ? "Étape en cours" : isComplete ? "Étape validée" : "Étape à venir"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
