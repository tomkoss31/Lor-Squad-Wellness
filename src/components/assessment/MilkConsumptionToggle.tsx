interface Props {
  value: "yes" | "sometimes" | "no" | "";
  onChange: (value: "yes" | "sometimes" | "no") => void;
}

/**
 * Chantier refonte étape 11 (2026-04-20) — curseur "consommes-tu du lait ?".
 * Purement informatif : aide Mélanie/Thomas à adapter PDM. Aucun blocage.
 */
export function MilkConsumptionToggle({ value, onChange }: Props) {
  const options: Array<{ key: "yes" | "sometimes" | "no"; label: string }> = [
    { key: "yes", label: "Oui" },
    { key: "sometimes", label: "Parfois" },
    { key: "no", label: "Non" },
  ];

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 14,
        background: "var(--ls-surface)",
        border: "1px solid var(--ls-border)",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div style={{ marginBottom: 10 }}>
        <p className="eyebrow-label" style={{ margin: 0 }}>Consommation lait</p>
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: "var(--ls-text)", margin: "4px 0 2px" }}>
          Consommes-tu du lait (animal ou végétal) ?
        </h3>
        <p style={{ fontSize: 12, color: "var(--ls-text-muted)", margin: 0 }}>
          Aide à orienter le choix PDM dans le programme.
        </p>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {options.map((opt) => {
          const active = value === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(opt.key)}
              className={`ls-pill${active ? " ls-pill--selected" : ""}`}
              aria-pressed={active}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
