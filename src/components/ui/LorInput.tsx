import { InputHTMLAttributes, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: ReactNode
}

export function LorInput({ label, error, icon, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[11px] uppercase tracking-[0.1em] text-[#7A8099] font-medium">{label}</label>}
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A5068]">{icon}</span>}
        <input
          {...props}
          className={`w-full rounded-[10px] bg-[#1A1E27] border px-3 py-2.5 text-[13px] text-[#F0EDE8] placeholder-[#4A5068] outline-none transition-colors
            ${error ? 'border-[rgba(251,113,133,0.5)]' : 'border-[rgba(255,255,255,0.08)] focus:border-[rgba(201,168,76,0.5)]'}
            ${icon ? 'pl-9' : ''} ${className}`}
        />
      </div>
      {error && <p className="text-[11px] text-[#FB7185]">{error}</p>}
    </div>
  )
}
