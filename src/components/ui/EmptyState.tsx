import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="rounded-[12px] border border-dashed border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)] px-6 py-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(255,255,255,0.04)] text-2xl">
        {icon}
      </div>
      <h3 className="mt-4 text-xl font-bold">{title}</h3>
      <p className="mx-auto mt-3 max-w-[420px] text-sm leading-7 text-[var(--lor-muted)]">{subtitle}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

export default EmptyState;
