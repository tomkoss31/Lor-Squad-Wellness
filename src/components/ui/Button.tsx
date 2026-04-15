import type { ButtonHTMLAttributes, PropsWithChildren } from "react"
import { cn } from "../../lib/utils"

type ButtonVariant = "primary" | "secondary" | "ghost"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

export function Button({
  children,
  className,
  variant = "primary",
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={cn(
        "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[14px] px-5 py-2.5 text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]",
        variant === "primary" &&
          "bg-[#C9A84C] text-[#0B0D11] hover:brightness-105 font-bold",
        variant === "secondary" &&
          "border border-[var(--ls-border2)] bg-[var(--ls-surface2)] text-white hover:bg-white/[0.08]",
        variant === "ghost" &&
          "bg-transparent text-[var(--ls-text-muted)] hover:text-white hover:bg-[var(--ls-surface2)]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
