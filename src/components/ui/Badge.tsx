import type { ReactNode } from "react";

type BadgeVariant = "success" | "warning" | "danger" | "gold" | "default";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
}

const badgeStyles: Record<BadgeVariant, string> = {
  success: "bg-[rgba(45,212,191,0.14)] text-[var(--lor-teal)]",
  warning: "bg-[rgba(201,168,76,0.14)] text-[var(--lor-gold2)]",
  danger: "bg-[rgba(251,113,133,0.14)] text-[var(--lor-coral)]",
  gold: "bg-[rgba(240,201,106,0.14)] text-[var(--lor-gold2)]",
  default: "bg-[rgba(255,255,255,0.06)] text-[var(--lor-muted)]"
};

export function Badge({ variant = "default", children }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex min-h-[28px] items-center rounded-full px-3 text-[11px] font-medium",
        badgeStyles[variant]
      ].join(" ")}
    >
      {children}
    </span>
  );
}

export default Badge;
