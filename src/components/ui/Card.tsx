import type { HTMLAttributes, PropsWithChildren } from "react"
import { cn } from "../../lib/utils"

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Si true, active un lift au hover (shadow + translateY). Pour cards cliquables. */
  interactive?: boolean
}

// UX Polish global (2026-04-20) : ajoute shadow-sm par défaut, et un mode
// `interactive` qui passe en shadow-md + lift 2px au hover. Conserve le
// `glass-panel` existant pour ne rien casser visuellement.
export function Card({
  children,
  className,
  interactive = false,
  ...props
}: PropsWithChildren<CardProps>) {
  return (
    <div
      className={cn(
        "glass-panel rounded-[24px] p-5 sm:rounded-[26px] sm:p-6 shadow-[var(--ls-shadow-sm)]",
        interactive && "ls-card-interactive",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
