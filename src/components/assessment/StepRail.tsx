interface StepRailProps {
  currentStep: number
  steps: string[]
}

const STEP_PHASES = [
  { label: 'Client',    steps: [0],            color: '#C9A84C' },
  { label: 'Habitudes', steps: [1, 2, 3, 4],   color: '#2DD4BF' },
  { label: 'Analyse',   steps: [5, 6, 7, 8, 9], color: '#A78BFA' },
  { label: 'Clôture',   steps: [10, 11, 12, 13], color: '#F0C96A' },
]

function getPhaseColor(stepIndex: number): string {
  for (const phase of STEP_PHASES) {
    if (phase.steps.includes(stepIndex)) return phase.color
  }
  return '#C9A84C'
}

export function StepRail({ currentStep, steps }: StepRailProps) {
  const progress = steps.length > 1 ? (currentStep / (steps.length - 1)) * 100 : 0

  return (
    <>
      {/* Version mobile compacte */}
      <div className="lg:hidden">
        <div style={{
          background: 'var(--ls-surface)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12,
          padding: '12px 16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--ls-text-hint)', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Étape {currentStep + 1} / {steps.length}
            </span>
            <span style={{ fontSize: 12, fontFamily: 'Syne, sans-serif', fontWeight: 700, color: getPhaseColor(currentStep) }}>
              {steps[currentStep]}
            </span>
          </div>
          <div style={{ height: 4, background: 'var(--ls-border)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: `linear-gradient(90deg, #C9A84C, ${getPhaseColor(currentStep)})`,
              borderRadius: 2,
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      </div>

      {/* Version desktop complète */}
      <div className="hidden lg:block">
        <div className="rounded-[18px] border border-[var(--ls-border)] bg-[var(--ls-surface)] p-4 md:p-5">
          {/* Header */}
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="eyebrow-label">
              Étape {currentStep + 1} sur {steps.length}
            </span>
            <span
              className="text-sm font-semibold text-right"
              style={{ fontFamily: "Syne, sans-serif", color: getPhaseColor(currentStep) }}
            >
              {steps[currentStep]}
            </span>
          </div>

          {/* Phase markers */}
          <div className="mb-2 flex">
            {STEP_PHASES.filter(p => p.steps[0] < steps.length).map(phase => (
              <div key={phase.label} style={{ flex: phase.steps.length }} className="flex flex-col items-start">
                <span style={{
                  fontSize: 9,
                  color: currentStep >= phase.steps[0] ? phase.color : 'var(--ls-text-hint)',
                  fontWeight: 500,
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                }}>
                  {phase.label}
                </span>
              </div>
            ))}
          </div>

          {/* Barre de progression */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--ls-surface2)]">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, #C9A84C, ${getPhaseColor(currentStep)})`,
              }}
            />
          </div>

          {/* Points étapes desktop */}
          <div className="mt-5 flex items-start justify-between">
            {steps.map((step, index) => {
              const isDone = index < currentStep
              const isActive = index === currentStep
              const color = getPhaseColor(index)
              return (
                <div key={step} className="flex flex-col items-center gap-1.5" style={{ flex: 1 }}>
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-300"
                    style={{
                      background: isDone ? color : isActive ? `${color}30` : "rgba(128,128,128,0.06)",
                      border: `2px solid ${isDone || isActive ? color : "rgba(255,255,255,0.1)"}`,
                      color: isDone ? "#0B0D11" : isActive ? color : "#4A5068",
                    }}
                  >
                    {isDone ? "✓" : index + 1}
                  </div>
                  <span
                    className="text-center text-[9px] leading-tight"
                    style={{ color: isActive ? color : "#4A5068", maxWidth: 56 }}
                  >
                    {step}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
