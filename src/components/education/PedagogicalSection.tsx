import type { ReactNode } from "react";
import { StatusBadge } from "../ui/StatusBadge";

interface PedagogicalSectionProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  statusLabel?: string;
  statusTone?: "blue" | "green" | "red" | "amber";
  metrics: ReactNode;
  aside?: ReactNode;
}

export function PedagogicalSection({
  eyebrow,
  title,
  subtitle,
  statusLabel,
  statusTone = "blue",
  metrics,
  aside
}: PedagogicalSectionProps) {
  const hasAside = aside != null;

  return (
    <div className="rounded-[30px] bg-[linear-gradient(180deg,rgba(15,23,42,0.34),rgba(15,23,42,0.52))] p-5 shadow-panel md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="eyebrow-label">{eyebrow}</p>
          <h3 className="mt-2 text-[2rem] leading-none text-white md:text-[2.2rem]">{title}</h3>
          <p className="mt-3 max-w-xl text-[15px] leading-7 text-[#B0B4C4]">{subtitle}</p>
        </div>
        {statusLabel ? <StatusBadge label={statusLabel} tone={statusTone} /> : null}
      </div>

      {hasAside ? (
        <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">{metrics}</div>
          {aside}
        </div>
      ) : (
        <div className="mt-6 grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">{metrics}</div>
      )}
    </div>
  );
}

export function PedagogicalMetricCard({
  label,
  value,
  note,
  accent = "blue"
}: {
  label: string;
  value: string;
  note?: string;
  accent?: "blue" | "green" | "red";
}) {
  return (
    <div className="relative overflow-hidden rounded-[24px] bg-white/[0.04] p-4 md:p-5">
      <div
        className={`absolute inset-x-0 top-0 h-1 ${
          accent === "green"
            ? "bg-gradient-to-r from-emerald-400 via-lime-300 to-transparent"
            : accent === "red"
              ? "bg-gradient-to-r from-rose-400 via-orange-300 to-transparent"
              : "bg-gradient-to-r from-sky-400 via-cyan-300 to-transparent"
        }`}
      />
      <p className="text-[11px] font-medium text-[#4A5068]">{label}</p>
      <p className="mt-3 text-[1.9rem] font-semibold leading-none text-white">{value}</p>
      {note ? <p className="mt-2.5 text-sm leading-6 text-[#7A8099]">{note}</p> : null}
    </div>
  );
}

export function PedagogicalPoint({ text }: { text: string }) {
  return (
    <div className="rounded-[18px] bg-[#0B0D11]/60 px-4 py-3 text-sm text-[#F0EDE8]">
      {text}
    </div>
  );
}
