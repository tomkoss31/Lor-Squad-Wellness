interface StepRailProps {
  currentStep: number
  steps: string[]
}

export function StepRail({ currentStep, steps }: StepRailProps) {
  const progress = steps.length > 1 ? (currentStep / (steps.length - 1)) * 100 : 0

  return (
    <div className="rounded-[18px] border border-white/[0.07] bg-[#13161C] p-4 md:p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="eyebrow-label">
          Étape {currentStep + 1} sur {steps.length}
        </span>
        <span
          className="text-sm font-semibold text-[#C9A84C] text-right"
          style={{ fontFamily: "Syne, sans-serif" }}
        >
          {steps[currentStep]}
        </span>
      </div>

      {/* Barre de progression */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, #C9A84C, #F0C96A)",
          }}
        />
      </div>

      {/* Points étapes desktop */}
      <div className="mt-5 hidden xl:flex items-start justify-between">
        {steps.map((step, index) => {
          const isDone = index < currentStep
          const isActive = index === currentStep
          return (
            <div key={step} className="flex flex-col items-center gap-1.5" style={{ flex: 1 }}>
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-300"
                style={{
                  background: isDone
                    ? "#C9A84C"
                    : isActive
                      ? "rgba(201,168,76,0.18)"
                      : "rgba(255,255,255,0.04)",
                  border: `2px solid ${isDone || isActive ? "#C9A84C" : "rgba(255,255,255,0.1)"}`,
                  color: isDone ? "#0B0D11" : isActive ? "#C9A84C" : "#4A5068",
                }}
              >
                {isDone ? "✓" : index + 1}
              </div>
              <span
                className="text-center text-[9px] leading-tight"
                style={{ color: isActive ? "#C9A84C" : "#4A5068", maxWidth: 56 }}
              >
                {step}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
