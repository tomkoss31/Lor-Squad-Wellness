import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { cn } from "../../lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
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
        "inline-flex items-center justify-center rounded-full px-5 py-3 text-[13px] font-semibold tracking-[0.05em] transition duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" &&
          "bg-gradient-to-r from-amber-200 via-white to-rose-200 text-slate-950 shadow-luxe hover:scale-[1.01]",
        variant === "secondary" &&
          "border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.03))] text-white shadow-luxe hover:border-white/20 hover:bg-white/[0.08]",
        variant === "ghost" && "text-slate-300 hover:bg-white/[0.04] hover:text-white",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
