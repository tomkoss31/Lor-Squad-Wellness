// Chantier Prise de masse (2026-04-24) : étape "Tes apports actuels".
// 7 moments (matin, encas AM, déjeuner, pré-WO, post-WO, encas PM, dîner).
// Chaque moment : toggle Rapide (qualitatif 0-4) / Précis (saisie g).
// Total live en bas avec code couleur selon le ratio vs cible.
import type {
  CurrentIntake,
  IntakeMoment,
  IntakeValue,
  SportSubObjective,
} from "../../types/domain";
import {
  estimateCurrentProteinIntake,
  computeProteinTargetSport,
} from "../../lib/calculations";

interface Props {
  value: CurrentIntake;
  onChange: (v: CurrentIntake) => void;
  weightKg: number;
  subObjective: SportSubObjective;
}

const MOMENTS: { id: IntakeMoment; label: string }[] = [
  { id: "morning", label: "Petit-déjeuner" },
  { id: "snackAM", label: "Collation matin" },
  { id: "lunch", label: "Déjeuner" },
  { id: "preWO", label: "Avant entraînement" },
  { id: "postWO", label: "Après entraînement" },
  { id: "snackPM", label: "Collation après-midi" },
  { id: "dinner", label: "Dîner" },
];

const QUAL_LABELS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "Rien",
  1: "Très léger (~5g)",
  2: "Léger (~15g)",
  3: "Correct (~25g)",
  4: "Copieux (~35g)",
};

export function CurrentIntakeStep({ value, onChange, weightKg, subObjective }: Props) {
  const total = estimateCurrentProteinIntake(value);
  const targetObj = weightKg > 0 ? computeProteinTargetSport(weightKg, subObjective) : null;

  const setMoment = (id: IntakeMoment, v: IntakeValue | null) => {
    onChange({ ...value, [id]: v });
  };

  const toggleMode = (id: IntakeMoment) => {
    const cur = value[id];
    if (!cur || cur.mode === "qualitative") {
      setMoment(id, { mode: "quantitative", proteinGrams: 0 });
    } else {
      setMoment(id, { mode: "qualitative", level: 0 });
    }
  };

  const color = (() => {
    if (!targetObj) return "var(--ls-text-muted)";
    const ratio = total / targetObj.target;
    if (ratio < 0.6) return "var(--ls-coral)";
    if (ratio < 1.0) return "var(--ls-gold)";
    return "var(--ls-teal)";
  })();

  return (
    <div className="space-y-4">
      <p style={{ fontSize: 14, color: "var(--ls-text-muted)", fontFamily: "'DM Sans', sans-serif" }}>
        Pour chaque moment de la journée, choisis le niveau approximatif (mode <strong>Rapide</strong>) ou
        saisis une valeur précise en grammes (mode <strong>Précis</strong>).
      </p>

      {MOMENTS.map((m) => {
        const cur = value[m.id];
        const mode = cur?.mode ?? "qualitative";
        return (
          <div
            key={m.id}
            style={{
              padding: "14px 16px",
              borderRadius: 14,
              border: "1px solid var(--ls-border)",
              background: "#fff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ls-text)", fontFamily: "'DM Sans', sans-serif" }}>
                {m.label}
              </div>
              <button
                type="button"
                onClick={() => toggleMode(m.id)}
                style={{
                  fontSize: 12,
                  padding: "6px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--ls-border)",
                  background: "var(--ls-surface2)",
                  color: "var(--ls-text)",
                  cursor: "pointer",
                  minHeight: 32,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {mode === "qualitative" ? "Mode Rapide" : "Mode Précis"}
              </button>
            </div>

            {mode === "qualitative" ? (
              <div>
                <input
                  type="range"
                  min={0}
                  max={4}
                  step={1}
                  value={cur?.mode === "qualitative" ? cur.level : 0}
                  onChange={(e) =>
                    setMoment(m.id, {
                      mode: "qualitative",
                      level: Number(e.target.value) as 0 | 1 | 2 | 3 | 4,
                    })
                  }
                  style={{ width: "100%" }}
                />
                <div style={{ fontSize: 13, color: "var(--ls-text-muted)", marginTop: 4 }}>
                  {QUAL_LABELS[cur?.mode === "qualitative" ? cur.level : 0]}
                </div>
              </div>
            ) : (
              <input
                type="number"
                min={0}
                max={200}
                value={cur?.mode === "quantitative" ? cur.proteinGrams : 0}
                onChange={(e) =>
                  setMoment(m.id, {
                    mode: "quantitative",
                    proteinGrams: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                placeholder="Grammes de protéines"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid var(--ls-border)",
                  fontSize: 16,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              />
            )}
          </div>
        );
      })}

      {/* Total */}
      <div
        style={{
          padding: "14px 16px",
          borderRadius: 14,
          background: "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 10%, transparent), color-mix(in srgb, var(--ls-teal) 6%, transparent))",
          border: "1px solid color-mix(in srgb, var(--ls-gold) 30%, transparent)",
          position: "sticky",
          bottom: 8,
        }}
      >
        <div style={{ fontSize: 12, color: "var(--ls-text-muted)", fontFamily: "'DM Sans', sans-serif" }}>Total estimé</div>
        <div style={{ fontFamily: "Syne, sans-serif", fontSize: 24, fontWeight: 800, color, marginTop: 2 }}>
          {total} g / jour
        </div>
        {targetObj && (
          <div style={{ fontSize: 12, color: "var(--ls-text-muted)", marginTop: 4 }}>
            Cible : {targetObj.target} g (plage {targetObj.min}-{targetObj.max} g)
          </div>
        )}
      </div>
    </div>
  );
}
