// Chantier Boosters cliquables + Quantités (D-urgent, 2026-04-24).
// Stepper numérique minimaliste (−/+) pour ajuster la quantité d'un
// produit retenu au bilan. Utilisé par SelectableProductCard et, plus tard,
// dans le ticket du jour.
//
// Règles : var(--ls-*) uniquement, Syne pour le nombre, radius 10,
// touch target minimum 44×44. Pas d'intégration dans la logique form
// à ce commit — branchement au commit #4.

interface Props {
  value: number;
  min?: number;
  max?: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}

export function QuantityStepper({
  value,
  min = 1,
  max = 10,
  onChange,
  disabled = false,
}: Props) {
  const canDecrement = !disabled && value > min;
  const canIncrement = !disabled && value < max;

  const btnBase: React.CSSProperties = {
    width: 32,
    height: 32,
    minWidth: 32,
    border: "1px solid var(--ls-border)",
    borderRadius: 8,
    background: "var(--ls-surface)",
    color: "var(--ls-text)",
    fontSize: 18,
    fontWeight: 700,
    lineHeight: 1,
    fontFamily: "'DM Sans', sans-serif",
    cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.15s",
  };

  const disabledStyle: React.CSSProperties = {
    opacity: 0.4,
    cursor: "not-allowed",
  };

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        minHeight: 44,
        padding: "6px 8px",
        border: "1px solid var(--ls-border)",
        borderRadius: 10,
        background: "var(--ls-surface)",
      }}
    >
      <button
        type="button"
        aria-label="Diminuer la quantité"
        disabled={!canDecrement}
        onClick={() => canDecrement && onChange(value - 1)}
        onMouseEnter={(e) => {
          if (canDecrement) {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--ls-surface2)";
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--ls-surface)";
        }}
        style={{
          ...btnBase,
          ...(canDecrement ? {} : disabledStyle),
        }}
      >
        −
      </button>
      <span
        role="spinbutton"
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: 14,
          fontWeight: 700,
          color: "var(--ls-text)",
          minWidth: 24,
          textAlign: "center",
          userSelect: "none",
        }}
      >
        {value}
      </span>
      <button
        type="button"
        aria-label="Augmenter la quantité"
        disabled={!canIncrement}
        onClick={() => canIncrement && onChange(value + 1)}
        onMouseEnter={(e) => {
          if (canIncrement) {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--ls-surface2)";
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--ls-surface)";
        }}
        style={{
          ...btnBase,
          ...(canIncrement ? {} : disabledStyle),
        }}
      >
        +
      </button>
    </div>
  );
}
