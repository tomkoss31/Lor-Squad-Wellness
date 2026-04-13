interface ScoreBarProps {
  value: number
  max: number
  color: string
  label: string
  unit?: string
}

export function LorScoreBar({ value, max, color, label, unit = '' }: ScoreBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-[#7A8099] font-['DM_Sans']">{label}</span>
        <span className="text-[12px] font-medium text-[#F0EDE8] font-['DM_Sans']">{value}{unit}</span>
      </div>
      <div className="h-[4px] w-full rounded-full bg-[#1A1E27]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
