import { cn } from "../../lib/utils";

interface StepRailProps {
  currentStep: number;
  steps: string[];
}

export function StepRail({ currentStep, steps }: StepRailProps) {
  return (
    <div className="glass-panel rounded-[24px] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Parcours bilan</p>
        <p className="text-xs text-slate-400">
          Etape {currentStep + 1} / {steps.length}
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
                "min-w-[220px] flex-shrink-0 rounded-2xl border px-4 py-3 transition",
                isActive && "border-sky-400/30 bg-sky-400/10",
                isComplete && "border-emerald-400/20 bg-emerald-400/10",
                !isActive && !isComplete && "border-white/8 bg-white/[0.03]"
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                    isActive && "bg-sky-400 text-slate-950",
                    isComplete && "bg-emerald-400 text-slate-950",
                    !isActive && !isComplete && "bg-white/10 text-slate-300"
                  )}
                >
                  {index + 1}
                </div>
                <p className="text-sm font-medium text-white">{step}</p>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                {isActive ? "Etape en cours" : isComplete ? "Etape validee" : "Etape a venir"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
