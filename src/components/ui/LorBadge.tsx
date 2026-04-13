import { ReactNode } from 'react'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'gold' | 'default' | 'purple'

const variants: Record<BadgeVariant, string> = {
  success: 'bg-[rgba(45,212,191,0.1)] text-[#2DD4BF] border-[rgba(45,212,191,0.2)]',
  warning: 'bg-[rgba(201,168,76,0.1)] text-[#C9A84C] border-[rgba(201,168,76,0.2)]',
  danger: 'bg-[rgba(251,113,133,0.1)] text-[#FB7185] border-[rgba(251,113,133,0.2)]',
  gold: 'bg-[rgba(201,168,76,0.15)] text-[#F0C96A] border-[rgba(201,168,76,0.3)]',
  purple: 'bg-[rgba(167,139,250,0.1)] text-[#A78BFA] border-[rgba(167,139,250,0.2)]',
  default: 'bg-[rgba(255,255,255,0.05)] text-[#7A8099] border-[rgba(255,255,255,0.08)]',
}

export function LorBadge({ variant = 'default', children }: { variant?: BadgeVariant; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-[20px] border px-2.5 py-0.5 text-[11px] font-medium font-['DM_Sans'] ${variants[variant]}`}>
      {children}
    </span>
  )
}
