// Chantier Prise de masse (2026-04-24) : étape "Parle-moi de ton sport".
// 3 sections : fréquence, types d'activité, sous-objectif.
import { useMemo } from "react";
import type {
  SportFrequency,
  SportProfile,
  SportSubObjective,
  SportType,
} from "../../types/domain";

interface Props {
  value: SportProfile | null;
  onChange: (v: SportProfile) => void;
}

const FREQUENCY_OPTIONS: { id: SportFrequency; label: string; sub: string }[] = [
  { id: "none", label: "Pas de sport", sub: "Sédentaire ou quasi" },
  { id: "occasional", label: "1-2x/semaine", sub: "Occasionnel" },
  { id: "regular", label: "3-4x/semaine", sub: "Régulier" },
  { id: "intensive", label: "5x+/semaine", sub: "Intensif" },
];

const TYPE_OPTIONS: { id: SportType; label: string; emoji: string }[] = [
  { id: "musculation", label: "Musculation", emoji: "🏋️" },
  { id: "cardio", label: "Cardio", emoji: "🏃" },
  { id: "crossfit-hiit", label: "CrossFit / HIIT", emoji: "🔥" },
  { id: "team-sport", label: "Sport collectif", emoji: "⚽" },
  { id: "combat-sport", label: "Sport de combat", emoji: "🥊" },
  { id: "endurance-long", label: "Endurance longue", emoji: "🚴" },
  { id: "other", label: "Autre", emoji: "🎯" },
];

const SUB_OBJECTIVE_OPTIONS: { id: SportSubObjective; label: string; sub: string }[] = [
  { id: "mass-gain", label: "Prise de masse", sub: "Gagner du muscle" },
  { id: "strength", label: "Force", sub: "Gagner en puissance" },
  { id: "cutting", label: "Sèche", sub: "Perdre du gras, garder le muscle" },
  { id: "endurance", label: "Endurance", sub: "Tenir plus longtemps" },
  { id: "fitness", label: "Fitness / tonifier", sub: "Être en forme" },
  { id: "competition", label: "Compétition", sub: "Préparer un événement" },
];

const CARD_STYLE_BASE: React.CSSProperties = {
  padding: "14px 16px",
  borderRadius: 14,
  border: "1px solid var(--ls-border)",
  background: "#fff",
  cursor: "pointer",
  textAlign: "left" as const,
  fontFamily: "'DM Sans', sans-serif",
  minHeight: 44,
  transition: "all 0.15s ease",
};

function activeStyle(active: boolean): React.CSSProperties {
  return active
    ? {
        border: "2px solid var(--ls-gold)",
        background: "color-mix(in srgb, var(--ls-gold) 8%, #fff)",
        boxShadow: "0 2px 8px rgba(201,168,76,0.15)",
      }
    : {};
}

export function SportProfileStep({ value, onChange }: Props) {
  const current = useMemo<SportProfile>(
    () =>
      value ?? {
        frequency: "regular",
        types: [],
        subObjective: "mass-gain",
      },
    [value]
  );

  const update = (patch: Partial<SportProfile>) => {
    onChange({ ...current, ...patch });
  };

  const toggleType = (id: SportType) => {
    const has = current.types.includes(id);
    update({ types: has ? current.types.filter((t) => t !== id) : [...current.types, id] });
  };

  return (
    <div className="space-y-5">
      {/* Fréquence */}
      <section>
        <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: 18, fontWeight: 700, color: "var(--ls-text)", marginBottom: 10 }}>
          Fréquence d'entraînement
        </h3>
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
          {FREQUENCY_OPTIONS.map((opt) => {
            const active = current.frequency === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => update({ frequency: opt.id })}
                style={{ ...CARD_STYLE_BASE, ...activeStyle(active) }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ls-text)" }}>{opt.label}</div>
                <div style={{ fontSize: 12, color: "var(--ls-text-muted)", marginTop: 2 }}>{opt.sub}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Types */}
      <section>
        <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: 18, fontWeight: 700, color: "var(--ls-text)", marginBottom: 10 }}>
          Types d'activité (plusieurs possibles)
        </h3>
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
          {TYPE_OPTIONS.map((opt) => {
            const active = current.types.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggleType(opt.id)}
                style={{ ...CARD_STYLE_BASE, ...activeStyle(active) }}
              >
                <div style={{ fontSize: 16 }}>{opt.emoji}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ls-text)", marginTop: 4 }}>{opt.label}</div>
              </button>
            );
          })}
        </div>
        {current.types.includes("other") && (
          <input
            type="text"
            value={current.otherTypeLabel ?? ""}
            onChange={(e) => update({ otherTypeLabel: e.target.value })}
            placeholder="Précise ton activité"
            style={{
              marginTop: 10,
              width: "100%",
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid var(--ls-border)",
              fontSize: 16,
              fontFamily: "'DM Sans', sans-serif",
            }}
          />
        )}
      </section>

      {/* Sous-objectif */}
      <section>
        <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: 18, fontWeight: 700, color: "var(--ls-text)", marginBottom: 10 }}>
          Sous-objectif principal
        </h3>
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          {SUB_OBJECTIVE_OPTIONS.map((opt) => {
            const active = current.subObjective === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => update({ subObjective: opt.id })}
                style={{ ...CARD_STYLE_BASE, ...activeStyle(active) }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ls-text)" }}>{opt.label}</div>
                <div style={{ fontSize: 12, color: "var(--ls-text-muted)", marginTop: 2 }}>{opt.sub}</div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
