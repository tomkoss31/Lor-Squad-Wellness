// =============================================================================
// UnitToggle — l'inverseur « % | kg » du mode BBC.
//
// Un SEUL geste bascule la masse grasse ET la masse musculaire : ce sont les
// deux mesures que la balance ne rend pas dans la même unité, et les lire
// séparément obligerait le coach à jongler. Le choix est mémorisé (clé
// `bbc-cmp-unit`) parce qu'un coach a une habitude de lecture, pas une
// habitude par membre.
//
// L'inverseur se BLOQUE quand le poids du relevé manque : sans poids, aucune
// conversion n'est possible et relire un nombre dans une autre unité
// fabriquerait un écart faux. On le dit, on ne le devine pas.
//
// ⚠️ Le choix mémorisé est remonté UNE SEULE FOIS, AU MONTAGE, et seulement si
// l'inverseur est déjà utilisable — c'est-à-dire si un poids est déjà connu
// (feuille rouverte, pesée du jour déjà écrite). Deux pièges, chacun vécu :
//  • l'appliquer alors qu'aucun poids n'existe ouvrait la feuille en « kg »
//    avec l'inverseur grisé : les huit champs s'annonçaient en kg, la balance
//    Tanita rend la masse grasse en %, et le coach ne pouvait pas revenir en %
//    tant qu'il n'avait pas saisi le poids. 31,1 % tapé dans un champ « kg » se
//    serait rangé en base à 44 %, plausible donc invisible ;
//  • l'appliquer « dès qu'un poids existe » le déclenchait AU PREMIER CARACTÈRE
//    du poids : à « 8 » (de 82,4) la bascule convertissait les champs déjà
//    saisis avec un poids de 8 kg. On ne peut pas savoir quand une frappe est
//    finie, donc on ne convertit jamais pendant qu'on tape.
// Sur une saisie neuve, la feuille reste donc sur l'unité NATIVE (celle de la
// balance) et l'habitude se reprend en un tap. C'est aussi ce que fait la
// maquette validée : elle ne réécrit les champs qu'au montage et au clic.
//
// Jetons --ls-bbc-* uniquement (aucun hex). Le fond actif est le lime, l'encre
// le lime-ink — jamais le lime en couleur de texte.
// =============================================================================

import { useEffect, useId, useRef, useState } from "react";
import {
  BBC_UNIT_STORAGE_KEY,
  parseStoredUnit,
  serializeUnit,
  type DisplayUnit,
} from "../../lib/bodyMetricUnits";

interface UnitToggleProps {
  /** L'unité affichée actuellement. */
  unit: DisplayUnit;
  /**
   * Appelé au changement — et une fois au montage si un choix était mémorisé
   * ET que l'inverseur est utilisable d'entrée. Jamais pendant une frappe.
   */
  onChange: (unit: DisplayUnit) => void;
  /** Bloque l'inverseur (typiquement : poids d'aujourd'hui manquant). */
  disabled?: boolean;
  /** Pourquoi c'est bloqué. Affiché sous l'inverseur, en ambre. */
  disabledReason?: string;
  /** Libellé du groupe pour les lecteurs d'écran. */
  label?: string;
}

const SEGMENTS: Array<{ value: DisplayUnit; text: string; aria: string }> = [
  { value: "percent", text: "%", aria: "Afficher en pourcentage" },
  { value: "kg", text: "kg", aria: "Afficher en kilos" },
];

/** Le localStorage peut jeter (Safari privé, quota) — jamais au prix de l'écran. */
function lireChoixMemorise(): DisplayUnit | null {
  try {
    return parseStoredUnit(window.localStorage.getItem(BBC_UNIT_STORAGE_KEY));
  } catch {
    return null;
  }
}

function memoriserChoix(unit: DisplayUnit): void {
  try {
    window.localStorage.setItem(BBC_UNIT_STORAGE_KEY, serializeUnit(unit));
  } catch {
    // Sans persistance l'inverseur marche quand même : on perd juste l'habitude.
  }
}

export function UnitToggle({
  unit,
  onChange,
  disabled = false,
  disabledReason,
  label = "Unité d'affichage",
}: UnitToggleProps) {
  const [focused, setFocused] = useState<DisplayUnit | null>(null);

  // On doit pouvoir remonter le choix mémorisé au parent SANS que l'effet se
  // rejoue à chaque rendu : on lit les valeurs fraîches via une ref.
  const dernier = useRef({ unit, onChange });
  useEffect(() => {
    dernier.current = { unit, onChange };
  });

  // UNE SEULE TENTATIVE, au montage. Le drapeau est posé même quand l'inverseur
  // est bloqué : une restauration différée se déclencherait au premier
  // caractère du poids — au milieu de la frappe du champ dont dépendent toutes
  // les conversions. Après quoi seul un tap du coach change l'unité.
  const dejaRestaure = useRef(false);
  useEffect(() => {
    if (dejaRestaure.current) return;
    dejaRestaure.current = true;
    if (disabled) return;
    const memorise = lireChoixMemorise();
    if (memorise && memorise !== dernier.current.unit) {
      dernier.current.onChange(memorise);
    }
  }, [disabled]);

  function choisir(next: DisplayUnit) {
    if (disabled || next === unit) return;
    memoriserChoix(next);
    onChange(next);
  }

  // `useId` plutôt qu'un id écrit en dur : deux inverseurs sur le même écran
  // partageraient sinon le même `aria-describedby`.
  const idUnique = useId();
  const raisonId = disabled && disabledReason ? `${idUnique}-raison` : undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div
        role="group"
        aria-label={label}
        aria-disabled={disabled || undefined}
        aria-describedby={raisonId}
        style={{
          display: "inline-flex",
          alignSelf: "flex-start",
          gap: 3,
          padding: 3,
          borderRadius: 13,
          background: "var(--ls-bbc-s2)",
          border: "1px solid var(--ls-bbc-line2)",
          opacity: disabled ? 0.45 : 1,
        }}
      >
        {SEGMENTS.map((seg) => {
          const actif = seg.value === unit;
          return (
            <button
              key={seg.value}
              type="button"
              disabled={disabled}
              aria-pressed={actif}
              aria-label={seg.aria}
              onClick={() => choisir(seg.value)}
              onFocus={() => setFocused(seg.value)}
              onBlur={() => setFocused(null)}
              style={{
                // Cible tactile : 44 px de haut comme de large, minimum.
                minWidth: 48,
                height: 44,
                padding: "0 14px",
                border: 0,
                borderRadius: 10,
                background: actif ? "var(--ls-bbc-lime)" : "transparent",
                color: actif ? "var(--ls-bbc-lime-ink)" : "var(--ls-bbc-muted)",
                fontFamily: "var(--ls-bbc-font-mono)",
                fontSize: 13,
                fontWeight: 800,
                lineHeight: 1,
                cursor: disabled ? "not-allowed" : "pointer",
                // Focus visible sans feuille de style : le contour n'apparaît
                // qu'au focus clavier/souris, il ne déplace rien (outlineOffset).
                outline: focused === seg.value ? "2px solid var(--ls-bbc-teal)" : "2px solid transparent",
                outlineOffset: 2,
                transition: "background 120ms ease, color 120ms ease",
              }}
            >
              {seg.text}
            </button>
          );
        })}
      </div>

      {disabled && disabledReason ? (
        <p
          id={raisonId}
          role="status"
          style={{
            margin: 0,
            fontSize: 11,
            lineHeight: 1.45,
            color: "var(--ls-bbc-amber)",
            fontFamily: "var(--ls-bbc-font-body)",
          }}
        >
          {disabledReason}
        </p>
      ) : null}
    </div>
  );
}

export default UnitToggle;
