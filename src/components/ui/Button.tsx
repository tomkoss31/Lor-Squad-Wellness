import type { ButtonHTMLAttributes, PropsWithChildren } from "react"
import { cn } from "../../lib/utils"

type ButtonVariant = "primary" | "secondary" | "ghost"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

// UX Polish global (2026-04-20) :
// - primary (gold) utilise var(--ls-gold) + var(--ls-gold-contrast) via Tailwind arbitrary
//   values pour rester cohérent entre themes dark/light
// - hover : brightness + shadow md (confirme la hiérarchie visuelle)
// - focus-visible : halo gold léger (accessibilité clavier)
export function Button({
  children,
  className,
  variant = "primary",
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={cn(
        "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[14px] px-5 py-2.5 text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] focus-visible:outline-none",
        variant === "primary" &&
          "bg-[var(--ls-gold)] text-[var(--ls-gold-contrast)] font-bold shadow-[var(--ls-shadow-sm)] hover:brightness-105 hover:shadow-[var(--ls-shadow-md)] focus-visible:ring-2 focus-visible:ring-[rgba(var(--ls-gold-rgb),0.45)]",
        variant === "secondary" &&
          "border border-[var(--ls-border2)] bg-[var(--ls-surface2)] text-[var(--ls-text)] hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-[rgba(var(--ls-teal-rgb),0.4)]",
        variant === "ghost" &&
          "bg-transparent text-[var(--ls-text-muted)] hover:text-[var(--ls-text)] hover:bg-[var(--ls-surface2)]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
