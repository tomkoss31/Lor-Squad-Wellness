import { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: string
  title: string
  subtitle?: string
  action?: ReactNode
}

export function LorEmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-[12px] border border-dashed border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)] px-8 py-12 text-center">
      {icon && <span className="text-4xl">{icon}</span>}
      <div className="space-y-1">
        <p className="text-[14px] font-semibold text-[#F0EDE8]">{title}</p>
        {subtitle && <p className="text-[13px] text-[#7A8099]">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
