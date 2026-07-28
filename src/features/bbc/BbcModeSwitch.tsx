// =============================================================================
// BbcModeSwitch — segmented Classic/BBC (chantier BBC Lot 1, 2026-07-24).
// Inline (pas de position fixed) : posé proprement dans la sidebar classic
// et dans la topbar BBC.
//
// ⚠️ ILLISIBILITÉ CORRIGÉE (recette client 2026-07-28) : « le toggle en haut à
// droite n'est pas visible ». Cause : tout était écrit en dur — fond
// `rgba(255,255,255,.06)`, texte `#F0EDE8`, pill BBC `#C5F82A`, encre
// `#0B0D11`. Deux conséquences.
//   1. Un blanc à 6 % d'opacité ne « teinte » que sur un fond sombre : posé sur
//      une surface claire il disparaît, bord compris.
//   2. `globals.css` réécrit agressivement les styles inline qui contiennent
//      certains hex connus (`html.theme-light [style*="color: #F0EDE8"]`, idem
//      pour `#0B0D11`). Le composant se faisait donc repeindre par une règle
//      qui ne le connaissait pas, dans un sens qu'aucun des deux fichiers ne
//      prévoyait.
//
// LA CORRECTION : plus un seul hex, tout passe par les tokens `--ls-bbc-*`.
// Comme ce composant est monté AUSSI hors du shell BBC (sidebar classic,
// MobileDrawer), il porte lui-même `className="bbc-mode"` — la classe ne
// déclare que des custom properties, elle n'impose ni fond ni police au reste.
// Sans elle, les `var(--ls-bbc-*)` seraient vides côté classic et le switch
// redeviendrait invisible.
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
      className="bbc-mode"
      style={{
        display: "inline-flex",
        gap: 3,
        padding: 3,
        borderRadius: 999,
        // Une surface OPAQUE du thème, pas un blanc translucide : c'est ce qui
        // garantit un contraste réel quel que soit le fond derrière. `s1` en
        // creux et `s3` pour la pastille active (voir plus bas) : deux crans
        // d'écart, sinon l'état sélectionné ne se distingue pas de la gouttière.
        background: "var(--ls-bbc-s1)",
        border: "1px solid var(--ls-bbc-line2)",
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
              fontFamily: "var(--ls-bbc-font-body)",
              fontSize: compact ? 10.5 : 11,
              fontWeight: 700,
              letterSpacing: "0.01em",
              padding: compact ? "4px 11px" : "5px 13px",
              borderRadius: 999,
              // Classic actif = surface claire du thème (pas d'or : l'or reste
              // le marqueur du mode classic lui-même). BBC actif = lime.
              background: active ? (bbcActive ? "var(--ls-bbc-lime)" : "var(--ls-bbc-s3)") : "transparent",
              color: bbcActive
                ? "var(--ls-bbc-lime-ink)"
                : active
                  ? "var(--ls-bbc-text)"
                  : "var(--ls-bbc-muted)",
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
