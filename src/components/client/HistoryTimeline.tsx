import { Link } from "react-router-dom";

interface HistoryTimelineEntry {
  id: string;
  date: string;
  summary: string;
  weight: number;
  hydration: number;
  editTo?: string;
  typeLabel?: string;
}

interface HistoryTimelineProps {
  entries: HistoryTimelineEntry[];
}

export function HistoryTimeline({ entries }: HistoryTimelineProps) {
  return (
    <div className="space-y-4">
      {entries.map((entry, index) => (
        <div key={entry.id} className="flex gap-4">
          <div className="flex w-10 flex-col items-center">
            <div className="mt-1 h-3 w-3 rounded-full bg-[#C9A84C] shadow-[0_0_16px_rgba(201,168,76,0.35)]" />
            {index < entries.length - 1 && <div className="mt-2 h-full w-px bg-white/10" />}
          </div>
          <div className="flex-1 rounded-[22px] border border-white/10 bg-[var(--ls-surface2)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <p className="text-base font-semibold text-white">{entry.date}</p>
                {entry.typeLabel ? (
                  <span className="rounded-full bg-[var(--ls-bg)]/60 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-[var(--ls-text-muted)]">
                    {entry.typeLabel}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--ls-text-muted)]">
                <span className="rounded-full bg-[var(--ls-bg)]/60 px-2.5 py-1">
                  {entry.weight} kg
                </span>
                <span className="rounded-full bg-[var(--ls-bg)]/60 px-2.5 py-1">
                  {entry.hydration} % hydratation
                </span>
                {entry.editTo ? (
                  <Link
                    to={entry.editTo}
                    className="rounded-full bg-[rgba(45,212,191,0.1)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2DD4BF] transition hover:bg-[rgba(201,168,76,0.18)]"
                  >
                    Modifier
                  </Link>
                ) : null}
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--ls-text-muted)]">{entry.summary}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
