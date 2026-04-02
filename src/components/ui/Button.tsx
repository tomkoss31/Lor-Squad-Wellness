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
        "inline-flex min-h-[52px] items-center justify-center rounded-[18px] px-5 py-3 text-[15px] font-semibold transition duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" &&
          "bg-[linear-gradient(180deg,#6AC0FF_0%,#59B7FF_100%)] text-slate-950 shadow-soft hover:brightness-[1.03]",
        variant === "secondary" &&
          "border border-white/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] text-white shadow-soft hover:bg-white/[0.065]",
        variant === "ghost" &&
          "bg-transparent text-slate-300 hover:bg-white/[0.035] hover:text-white",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
