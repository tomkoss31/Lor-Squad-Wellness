// =============================================================================
// ProgramChoiceList — le choix du programme, en liste comparable (2026-08-10)
//
// Pourquoi ce composant existe, alors que ProgramChoiceCard fait déjà le job :
//
// Choisir un programme, c'est comparer QUATRE PRIX. Les cartes empilées ne le
// permettent pas — mesuré sur l'app : à 375 px les cinq cartes font 282 px
// chacune et se suivent en colonne, donc quand on lit « Booster 2 · 324 € » on
// a perdu de vue « Découverte · 159 € ». À 479 px elles passent à deux par
// rangée, et la cinquième reste orpheline sur sa ligne. À 768 px, quatre plus
// une. Aucune de ces dispositions ne met les prix en regard.
//
// Ici : une ligne par programme, les prix alignés dans une même colonne à
// droite, le programme retenu se dépliant pour dire ce qu'il contient. Les cinq
// tarifs se lisent d'un coup d'œil, à toutes les largeurs.
//
// Maquette validée par Thomas le 2026-08-10.
// La carte reste utilisée au-delà de 1280 px, où la mise en page bureau a la
// place de les afficher côte à côte — refonte bureau à venir.
// =============================================================================

import { useId } from "react";
import type { ProgramChoice } from "../../data/programs";

interface Props {
  programs: ProgramChoice[];
  activeId: string;
  onSelect: (id: ProgramChoice["id"]) => void;
  /**
   * Ce que contient le programme, écrit en clair sous celui qu'on retient.
   * Fourni par la page, qui a le catalogue produit sous la main — le composant
   * n'a pas à le connaître. Sans lui, on retombe sur `shortContent`.
   */
  detailFor?: (program: ProgramChoice) => string | null;
}

export function ProgramChoiceList({ programs, activeId, onSelect, detailFor }: Props) {
  const groupId = useId();

  return (
    <div
      role="radiogroup"
      aria-labelledby={groupId}
      style={{
        display: "flex",
        flexDirection: "column",
        borderRadius: 14,
        border: "0.5px solid var(--ls-border)",
        background: "var(--ls-surface)",
        overflow: "hidden",
      }}
    >
      <span id={groupId} className="sr-only">
        Choix du programme
      </span>

      {programs.map((program, index) => {
        const active = program.id === activeId;
        return (
          <button
            key={program.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(program.id)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              minHeight: 44,
              padding: "11px 13px",
              border: "none",
              borderTop: index === 0 ? "none" : "0.5px solid var(--ls-border)",
              background: active
                ? "color-mix(in srgb, var(--ls-teal) 8%, var(--ls-surface))"
                : "transparent",
              color: "var(--ls-text)",
              fontFamily: "'DM Sans', sans-serif",
              cursor: "pointer",
              transition: "background 160ms ease",
            }}
          >
            {/* Rangée principale : pastille · nom · badge · prix */}
            <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span
                aria-hidden="true"
                style={{
                  width: 17,
                  height: 17,
                  flex: "none",
                  borderRadius: "50%",
                  border: `1.5px solid ${active ? "var(--ls-teal)" : "var(--ls-border)"}`,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {active ? (
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "var(--ls-teal)",
                      display: "block",
                    }}
                  />
                ) : null}
              </span>

              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 13.5,
                  fontWeight: 650,
                  letterSpacing: "-0.01em",
                }}
              >
                {program.title}
              </span>

              {program.badge ? (
                <span
                  style={{
                    flex: "none",
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--ls-bg)",
                    background: "var(--ls-lime)",
                    borderRadius: 999,
                    padding: "2px 7px",
                  }}
                >
                  {program.badge}
                </span>
              ) : null}

              {/* Le prix : même colonne pour les cinq, chiffres à chasse fixe
                  pour que les unités s'alignent verticalement. */}
              <span
                style={{
                  flex: "none",
                  fontFamily: "'Syne', sans-serif",
                  fontVariantNumeric: "tabular-nums",
                  fontSize: 15,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: active ? "var(--ls-teal)" : "var(--ls-text)",
                }}
              >
                {program.price ? `${program.price}€` : "—"}
              </span>
            </span>

            <span
              style={{
                display: "block",
                margin: "3px 0 0 26px",
                fontSize: 11.5,
                lineHeight: 1.35,
                color: "var(--ls-text-muted)",
              }}
            >
              {program.shortContent}
            </span>

            {active ? (
              <span
                style={{
                  display: "block",
                  margin: "9px 0 2px 26px",
                  padding: "9px 11px",
                  borderRadius: 10,
                  background: "color-mix(in srgb, var(--ls-teal) 9%, transparent)",
                  border: "0.5px solid color-mix(in srgb, var(--ls-teal) 22%, transparent)",
                  fontSize: 11.5,
                  lineHeight: 1.5,
                  color: "var(--ls-text)",
                }}
              >
                {detailFor?.(program) ?? program.shortContent}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
