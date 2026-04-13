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
        "inline-flex min-h-[52px] items-center justify-center rounded-[18px] px-5 py-3 text-[15px] font-semibold tracking-[-0.01em] transition duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" &&
          "bg-[linear-gradient(180deg,#72C5FF_0%,#59B7FF_100%)] text-slate-950 shadow-[0_10px_30px_rgba(89,183,255,0.18)] hover:brightness-[1.04]",
        variant === "secondary" &&
          "border border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] text-white shadow-soft hover:bg-white/[0.07]",
        variant === "ghost" &&
          "bg-transparent text-slate-300 hover:bg-white/[0.04] hover:text-white",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
