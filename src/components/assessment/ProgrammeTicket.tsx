import type { ProgramChoice } from "../../data/programs";

export interface TicketAddOn {
  id: string;
  name: string;
  price: number;
  pv: number;
  /**
   * Chantier Boosters cliquables + Quantités (D-urgent, 2026-04-24).
   * Quantité retenue pour ce produit dans le ticket. Défaut implicite = 1.
   */
  quantity: number;
}

interface Props {
  program: ProgramChoice;
  addOns: TicketAddOn[];
}

/**
 * Chantier refonte étape 11 (2026-04-20) — ticket sticky à droite.
 * Base (programme) + Ajouts (upsells retenus) + Total (EUR + PV).
 * Sur desktop : position sticky top 16px. Sur mobile : layout natif,
 * tombe naturellement sous les blocs principaux (pas de sticky mobile
 * pour ne pas bouffer l'écran).
 */
export function ProgrammeTicket({ program, addOns }: Props) {
  const addOnsTotal = addOns.reduce((sum, a) => sum + a.price * a.quantity, 0);
  const addOnsPv = addOns.reduce((sum, a) => sum + a.pv * a.quantity, 0);
  const total = program.price + addOnsTotal;

  return (
    <aside
      aria-label="Ticket du jour"
      style={{
        background: "#E1F5EE",
        border: "1px solid color-mix(in srgb, #0F6E56 22%, transparent)",
        borderRadius: 16,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        fontFamily: "'DM Sans', sans-serif",
        color: "#04342C",
      }}
    >
      <div>
        <p
          style={{
            fontSize: 10,
            letterSpacing: "2px",
            textTransform: "uppercase",
            color: "#065F46",
            fontWeight: 700,
            margin: 0,
          }}
        >
          Ticket du jour
        </p>
        <p style={{ fontSize: 12, color: "#065F46", margin: "4px 0 0", opacity: 0.85 }}>
          Programme + ajouts
        </p>
      </div>

      <section>
        <p
          style={{
            fontSize: 9,
            letterSpacing: "2px",
            textTransform: "uppercase",
            color: "#065F46",
            fontWeight: 700,
            margin: "0 0 6px",
          }}
        >
          Base
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 12px",
            background: "#FFFFFF",
            borderRadius: 10,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: "#04342C" }}>{program.title}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#04342C", fontFamily: "'Syne', sans-serif" }}>
            {program.price}€
          </span>
        </div>
      </section>

      <section>
        <p
          style={{
            fontSize: 9,
            letterSpacing: "2px",
            textTransform: "uppercase",
            color: "#065F46",
            fontWeight: 700,
            margin: "0 0 6px",
          }}
        >
          Ajouts ({addOns.length})
        </p>
        {addOns.length === 0 ? (
          <p style={{ fontSize: 11, color: "#065F46", opacity: 0.75, margin: 0, fontStyle: "italic" }}>
            Aucun ajout retenu pour l'instant.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {addOns.map((addOn) => (
              <div
                key={addOn.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  background: "#FFFFFF",
                  borderRadius: 10,
                  fontSize: 12,
                }}
              >
                <span style={{ color: "#04342C", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {addOn.quantity > 1 ? `${addOn.name} × ${addOn.quantity}` : addOn.name}
                </span>
                <span style={{ color: "#04342C", fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>
                  {(addOn.price * addOn.quantity).toFixed(2)}€
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div
        style={{
          padding: "14px 14px",
          background: "#FFFFFF",
          borderRadius: 12,
        }}
      >
        <p
          style={{
            fontSize: 9,
            letterSpacing: "2px",
            textTransform: "uppercase",
            color: "#065F46",
            fontWeight: 700,
            margin: "0 0 4px",
          }}
        >
          Total
        </p>
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: "#04342C",
            fontFamily: "'Syne', sans-serif",
          }}
        >
          {total.toFixed(2)}€
        </div>
        <p style={{ fontSize: 11, color: "#065F46", margin: "2px 0 0", opacity: 0.85 }}>
          {(program.price + addOnsPv).toFixed(1)} PV routine matin · {addOnsPv.toFixed(1)} PV ajouts
        </p>
      </div>
    </aside>
  );
}
