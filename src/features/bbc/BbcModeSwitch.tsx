// =============================================================================
// BbcModeSwitch — pastille d'aperçu Classic/BBC pour les admins (Lot 1).
// Volontairement auto-stylée (inline, tokens neutres) : elle s'affiche AUSSI
// par-dessus le Co-pilote classic, donc ne dépend pas des tokens --ls-bbc-*.
// =============================================================================

interface BbcModeSwitchProps {
  value: "classic" | "bbc";
  onChange: (v: "classic" | "bbc") => void;
}

export function BbcModeSwitch({ value, onChange }: BbcModeSwitchProps) {
  const options: Array<{ k: "classic" | "bbc"; label: string; on: string }> = [
    { k: "classic", label: "Classic", on: "#C9A84C" },
    { k: "bbc", label: "BBC", on: "#C5F82A" },
  ];
  return (
    <div
      role="group"
      aria-label="Aperçu du mode"
      style={{
        position: "fixed",
        top: "max(10px, env(safe-area-inset-top))",
        right: 12,
        zIndex: 1200,
        display: "flex",
        gap: 3,
        padding: 3,
        borderRadius: 999,
        background: "rgba(15, 18, 24, 0.92)",
        border: "1px solid rgba(255, 255, 255, 0.14)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        boxShadow: "0 6px 20px rgba(0, 0, 0, 0.35)",
      }}
    >
      {options.map((o) => {
        const active = value === o.k;
        return (
          <button
            key={o.k}
            type="button"
            onClick={() => onChange(o.k)}
            aria-pressed={active}
            style={{
              border: 0,
              cursor: "pointer",
              minHeight: 30,
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.01em",
              padding: "5px 12px",
              borderRadius: 999,
              background: active ? o.on : "transparent",
              color: active ? "#0B0D11" : "rgba(255, 255, 255, 0.6)",
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
