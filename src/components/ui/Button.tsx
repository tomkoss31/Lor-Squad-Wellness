import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-[var(--lor-gold)] text-[var(--lor-bg)] hover:brightness-110",
  secondary:
    "border border-[rgba(255,255,255,0.1)] bg-transparent text-[var(--lor-muted)] hover:border-[rgba(255,255,255,0.18)] hover:text-[var(--lor-text)]",
  ghost: "bg-transparent text-[var(--lor-text)] hover:bg-[rgba(255,255,255,0.04)]",
  danger: "bg-[rgba(251,113,133,0.1)] text-[var(--lor-coral)] hover:bg-[rgba(251,113,133,0.16)]"
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-[38px] px-3 text-sm",
  md: "min-h-[46px] px-4 text-sm",
  lg: "min-h-[52px] px-5 text-[15px]"
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-[10px] font-medium transition duration-200",
        "disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" ? "font-['Syne'] font-bold" : "",
        variantClasses[variant],
        sizeClasses[size],
        className
      ].join(" ")}
    >
      {loading ? (
        <span
          className="inline-block h-4 w-4 rounded-full border-2 border-current border-r-transparent"
          style={{ animation: "spin 0.7s linear infinite" }}
        />
      ) : null}
      <span>{children}</span>
    </button>
  );
}

export default Button;
