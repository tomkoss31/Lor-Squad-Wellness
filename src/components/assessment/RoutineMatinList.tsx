import { ROUTINE_PRODUCT_DESCRIPTIONS, type ProgramChoice } from "../../data/programs";

interface Props {
  program: ProgramChoice;
}

/**
 * Chantier refonte étape 11 (2026-04-20) — liste des produits phares de
 * la routine matin selon le programme sélectionné. 4 blocs teal (ou 3
 * pour Découverte) empilés.
 */
export function RoutineMatinList({ program }: Props) {
  return (
    <section>
      <p
        style={{
          fontSize: 10,
          letterSpacing: "2px",
          textTransform: "uppercase",
          color: "var(--ls-text-muted)",
          fontWeight: 600,
          margin: "0 0 10px",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        Routine matin — produits phares du programme
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {program.routineProductIds.map((id) => {
          const desc = ROUTINE_PRODUCT_DESCRIPTIONS[id];
          if (!desc) return null;
          return (
            <div
              key={id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 12,
                background: "#E1F5EE",
                border: "1px solid color-mix(in srgb, #0F6E56 20%, transparent)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#04342C",
                    marginBottom: 2,
                  }}
                >
                  {desc.name}
                </div>
                <div style={{ fontSize: 11, color: "#065F46", lineHeight: 1.4 }}>
                  {desc.tagline}
                </div>
              </div>
              <span
                style={{
                  padding: "3px 10px",
                  borderRadius: 999,
                  background: "#0F6E56",
                  color: "#FFFFFF",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                  flexShrink: 0,
                }}
              >
                Inclus
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
