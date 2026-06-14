// =============================================================================
// RdvAvailabilityCard — le coach déclare ses créneaux RDV hebdo (Réglages).
// Chantier RDV V2 (2026-06-14). MVP : une plage horaire par jour de la semaine.
// Ces créneaux alimenteront la page publique /rdv (moins les RDV déjà pris).
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { Card } from "../ui/Card";
import { useAppContext } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import { useCoachRdvAvailability, type RdvAvailabilitySlot } from "../../hooks/useCoachRdvAvailability";

// Ordre d'affichage Lun→Dim (weekday JS : 0=dim … 6=sam).
const DAYS: { weekday: number; label: string }[] = [
  { weekday: 1, label: "Lundi" },
  { weekday: 2, label: "Mardi" },
  { weekday: 3, label: "Mercredi" },
  { weekday: 4, label: "Jeudi" },
  { weekday: 5, label: "Vendredi" },
  { weekday: 6, label: "Samedi" },
  { weekday: 0, label: "Dimanche" },
];

interface DayState {
  enabled: boolean;
  start: string; // "HH:MM"
  end: string;
}

function minToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

const DEFAULT_DAY: DayState = { enabled: false, start: "09:00", end: "18:00" };

export function RdvAvailabilityCard() {
  const { currentUser } = useAppContext();
  const { push } = useToast();
  const { slots, loading, saving, save } = useCoachRdvAvailability(currentUser?.id ?? null);

  const [days, setDays] = useState<Record<number, DayState>>(() =>
    Object.fromEntries(DAYS.map((d) => [d.weekday, { ...DEFAULT_DAY }])),
  );

  // Hydrate depuis la base (première plage par jour — MVP 1 plage/jour).
  useEffect(() => {
    if (loading) return;
    const next: Record<number, DayState> = Object.fromEntries(
      DAYS.map((d) => [d.weekday, { ...DEFAULT_DAY }]),
    );
    for (const s of slots) {
      next[s.weekday] = { enabled: true, start: minToTime(s.startMin), end: minToTime(s.endMin) };
    }
    setDays(next);
  }, [slots, loading]);

  const dirty = useMemo(() => true, []); // simple : on autorise toujours l'enregistrement

  function setDay(weekday: number, patch: Partial<DayState>) {
    setDays((prev) => ({ ...prev, [weekday]: { ...prev[weekday], ...patch } }));
  }

  async function handleSave() {
    const next: RdvAvailabilitySlot[] = [];
    for (const d of DAYS) {
      const st = days[d.weekday];
      if (!st?.enabled) continue;
      const startMin = timeToMin(st.start);
      const endMin = timeToMin(st.end);
      if (endMin <= startMin) {
        push({ tone: "error", title: "Horaire invalide", message: `${d.label} : la fin doit être après le début.` });
        return;
      }
      next.push({ weekday: d.weekday, startMin, endMin });
    }
    const ok = await save(next);
    push(
      ok
        ? { tone: "success", title: "Disponibilités enregistrées", message: `${next.length} jour(s) actifs.` }
        : { tone: "error", title: "Échec", message: "Réessaie." },
    );
  }

  if (!currentUser) return null;

  return (
    <Card className="space-y-4">
      <div>
        <p className="eyebrow-label" style={{ color: "var(--ls-teal)" }}>🗓️ Disponibilités RDV</p>
        <p style={{ fontSize: 14, color: "var(--ls-text-muted)", marginTop: 4 }}>
          Déclare tes créneaux par jour. Les prospects qui finissent ton bilan en ligne pourront réserver
          dans ces plages (les RDV déjà pris sont masqués automatiquement).
        </p>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "var(--ls-text-muted)" }}>Chargement…</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {DAYS.map((d) => {
            const st = days[d.weekday] ?? DEFAULT_DAY;
            return (
              <div
                key={d.weekday}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: st.enabled ? "color-mix(in srgb, var(--ls-teal) 7%, var(--ls-surface2))" : "var(--ls-surface2)",
                  border: "1px solid var(--ls-border)",
                }}
              >
                <label style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 120, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={st.enabled}
                    onChange={(e) => setDay(d.weekday, { enabled: e.target.checked })}
                  />
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ls-text)" }}>{d.label}</span>
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: st.enabled ? 1 : 0.4 }}>
                  <input
                    type="time"
                    value={st.start}
                    disabled={!st.enabled}
                    onChange={(e) => setDay(d.weekday, { start: e.target.value })}
                    style={timeInputStyle}
                  />
                  <span style={{ color: "var(--ls-text-muted)", fontSize: 13 }}>→</span>
                  <input
                    type="time"
                    value={st.end}
                    disabled={!st.enabled}
                    onChange={(e) => setDay(d.weekday, { end: e.target.value })}
                    style={timeInputStyle}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving || loading || !dirty}
        style={{
          alignSelf: "flex-start",
          padding: "10px 18px",
          borderRadius: 10,
          border: "none",
          background: "var(--ls-gold)",
          color: "var(--ls-bg)",
          fontSize: 13.5,
          fontWeight: 700,
          fontFamily: "DM Sans, sans-serif",
          cursor: saving ? "wait" : "pointer",
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? "Enregistrement…" : "Enregistrer mes disponibilités"}
      </button>
    </Card>
  );
}

const timeInputStyle: React.CSSProperties = {
  padding: "7px 10px",
  borderRadius: 8,
  border: "1px solid var(--ls-border)",
  background: "var(--ls-surface)",
  color: "var(--ls-text)",
  fontSize: 13,
  fontFamily: "DM Sans, sans-serif",
};
