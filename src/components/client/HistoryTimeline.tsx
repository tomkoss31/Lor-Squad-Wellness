import { Link } from "react-router-dom";

interface HistoryTimelineEntry {
  id: string;
  date: string;
  summary: string;
  weight: number;
  hydration: number;
  editTo?: string;
  typeLabel?: string;
  canDelete?: boolean;
  /** Compté dans le calcul d'évolution de la Vue (défaut true). */
  includedInEvolution?: boolean;
  /** Plus ancien bilan compté = point de départ de l'évolution. */
  isEvolutionBaseline?: boolean;
}

interface HistoryTimelineProps {
  entries: HistoryTimelineEntry[];
  onDelete?: (id: string) => void;
  /** Coche/décoche un bilan dans le calcul d'évolution (re-baseline). */
  onToggleInclude?: (id: string, include: boolean) => void;
}

export function HistoryTimeline({ entries, onDelete, onToggleInclude }: HistoryTimelineProps) {
  return (
    <div className="space-y-4">
      {entries.map((entry, index) => {
        const included = entry.includedInEvolution !== false;
        return (
          <div key={entry.id} className="flex gap-4">
            <div className="flex w-10 flex-col items-center">
              <div
                className="mt-1 h-3 w-3 rounded-full"
                style={{
                  background: included ? "#C9A84C" : "var(--ls-text-hint)",
                  boxShadow: included ? "0 0 16px rgba(201,168,76,0.35)" : "none",
                }}
              />
              {index < entries.length - 1 && <div className="mt-2 h-full w-px bg-white/10" />}
            </div>
            <div
              className="flex-1 rounded-[22px] border border-white/10 bg-[var(--ls-surface2)] p-4"
              style={{ opacity: included ? 1 : 0.55 }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-base font-semibold text-white">{entry.date}</p>
                  {entry.typeLabel ? (
                    <span className="rounded-full bg-[var(--ls-bg)]/60 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-[var(--ls-text-muted)]">
                      {entry.typeLabel}
                    </span>
                  ) : null}
                  {entry.isEvolutionBaseline ? (
                    <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
                      style={{ background: "rgba(201,168,76,0.16)", color: "#C9A84C" }}>
                      📍 Départ évolution
                    </span>
                  ) : !included ? (
                    <span className="rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.16em]"
                      style={{ background: "var(--ls-bg)", color: "var(--ls-text-hint)" }}>
                      hors évolution
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
                  {entry.canDelete && onDelete ? (
                    <button
                      onClick={() => { if (window.confirm(`Supprimer ce ${entry.typeLabel?.toLowerCase() ?? 'bilan'} ?`)) onDelete(entry.id) }}
                      className="rounded-full bg-[rgba(220,38,38,0.08)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ls-coral)] transition hover:bg-[rgba(220,38,38,0.15)]"
                    >
                      Supprimer
                    </button>
                  ) : null}
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--ls-text-muted)]">{entry.summary}</p>
              {onToggleInclude ? (
                <label
                  className="mt-3 inline-flex cursor-pointer items-center gap-2 text-[12px] text-[var(--ls-text-muted)]"
                  title="Décoche pour exclure ce bilan du calcul d'évolution (il reste dans l'historique). Le point de départ devient le plus ancien bilan coché."
                >
                  <input
                    type="checkbox"
                    checked={included}
                    onChange={(e) => onToggleInclude(entry.id, e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: "#C9A84C", cursor: "pointer" }}
                  />
                  Compter dans l'évolution
                </label>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
