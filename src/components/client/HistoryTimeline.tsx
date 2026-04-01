interface HistoryTimelineEntry {
  date: string;
  summary: string;
  weight: number;
  hydration: number;
}

interface HistoryTimelineProps {
  entries: HistoryTimelineEntry[];
}

export function HistoryTimeline({ entries }: HistoryTimelineProps) {
  return (
    <div className="space-y-4">
      {entries.map((entry, index) => (
        <div key={entry.date} className="flex gap-4">
          <div className="flex w-10 flex-col items-center">
            <div className="mt-1 h-3 w-3 rounded-full bg-sky-300 shadow-[0_0_16px_rgba(125,211,252,0.45)]" />
            {index < entries.length - 1 && <div className="mt-2 h-full w-px bg-white/10" />}
          </div>
          <div className="flex-1 rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-base font-semibold text-white">{entry.date}</p>
              <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                <span className="rounded-full border border-white/10 bg-slate-950/35 px-2.5 py-1">
                  {entry.weight} kg
                </span>
                <span className="rounded-full border border-white/10 bg-slate-950/35 px-2.5 py-1">
                  {entry.hydration} % hydratation
                </span>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">{entry.summary}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
