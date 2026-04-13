import type { ChangeEventHandler, HTMLInputTypeAttribute, ReactNode } from "react";

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string | number;
  onChange: ChangeEventHandler<HTMLInputElement>;
  type?: HTMLInputTypeAttribute;
  error?: string;
  icon?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  min?: number | string;
  max?: number | string;
  step?: number | string;
}

export function Input({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  error,
  icon,
  required,
  disabled,
  name,
  min,
  max,
  step
}: InputProps) {
  return (
    <label className="block">
      {label ? (
        <span className="mb-2 block text-[11px] uppercase tracking-[0.14em] text-[var(--lor-muted)]">
          {label}
          {required ? <span className="ml-1 text-[var(--lor-gold2)]">*</span> : null}
        </span>
      ) : null}
      <span className="relative block">
        {icon ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">{icon}</span> : null}
        <input
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          className={[
            "lor-field",
            icon ? "pl-10" : "",
            error ? "border-[rgba(251,113,133,0.5)]" : ""
          ].join(" ")}
        />
      </span>
      {error ? <span className="mt-2 block text-xs text-[var(--lor-coral)]">{error}</span> : null}
    </label>
  );
}

export default Input;
