import { ReactNode, ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: ReactNode
}

const styles = {
  primary: 'bg-[#C9A84C] text-[#0B0D11] font-bold hover:bg-[#F0C96A]',
  secondary: 'border border-white/10 text-[#7A8099] hover:text-[#F0EDE8] hover:border-white/20 bg-transparent',
  ghost: 'bg-transparent text-[#7A8099] hover:text-[#F0EDE8]',
  danger: 'bg-[rgba(251,113,133,0.1)] text-[#FB7185] hover:bg-[rgba(251,113,133,0.2)] border border-[rgba(251,113,133,0.2)]',
}
const sizes = {
  sm: 'px-3 py-1.5 text-[12px]',
  md: 'px-4 py-2 text-[13px]',
  lg: 'px-6 py-3 text-[14px]',
}

export function LorButton({ variant = 'primary', size = 'md', loading, children, className = '', disabled, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center gap-2 rounded-[10px] font-['DM_Sans'] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${sizes[size]} ${className}`}
    >
      {loading && (
        <span
          style={{
            width: 14, height: 14,
            border: '2px solid rgba(255,255,255,0.2)',
            borderTop: '2px solid currentColor',
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'spin 0.7s linear infinite',
          }}
        />
      )}
      {children}
    </button>
  )
}
