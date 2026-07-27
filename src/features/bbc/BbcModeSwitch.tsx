// =============================================================================
// BbcModeSwitch — segmented Classic/BBC (chantier BBC Lot 1, 2026-07-24).
// Inline (pas de position fixed) : posé proprement dans la sidebar classic
// et dans la topbar BBC. Couleurs neutres — Classic actif = pill sobre (pas
// d'or, qui reste le marqueur du mode classic), BBC actif = lime.
// =============================================================================

interface BbcModeSwitchProps {
  value: "classic" | "bbc";
  onChange: (v: "classic" | "bbc") => void;
  compact?: boolean;
}

export function BbcModeSwitch({ value, onChange, compact }: BbcModeSwitchProps) {
  const options: Array<{ k: "classic" | "bbc"; label: string }> = [
    { k: "classic", label: "Classic" },
    { k: "bbc", label: "BBC" },
  ];
  return (
    <div
      role="group"
      aria-label="Mode d'affichage"
      style={{
        display: "inline-flex",
        gap: 3,
        padding: 3,
        borderRadius: 999,
        background: "rgba(255, 255, 255, 0.06)",
        border: "1px solid rgba(255, 255, 255, 0.10)",
      }}
    >
      {options.map((o) => {
        const active = value === o.k;
        const bbcActive = active && o.k === "bbc";
        return (
          <button
            key={o.k}
            type="button"
            onClick={() => onChange(o.k)}
            aria-pressed={active}
            style={{
              border: 0,
              cursor: "pointer",
              minHeight: compact ? 26 : 30,
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: compact ? 10.5 : 11,
              fontWeight: 700,
              letterSpacing: "0.01em",
              padding: compact ? "4px 11px" : "5px 13px",
              borderRadius: 999,
              background: active ? (bbcActive ? "#C5F82A" : "rgba(255, 255, 255, 0.16)") : "transparent",
              color: active ? (bbcActive ? "#0B0D11" : "#F0EDE8") : "rgba(240, 237, 232, 0.55)",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
