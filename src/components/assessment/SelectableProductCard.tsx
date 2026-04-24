// Chantier Boosters cliquables + Quantités (D-urgent, 2026-04-24).
// Composant unifié pour afficher un produit "sélectionnable" dans l'étape
// Programme du bilan (besoins détectés, upsells optionnels, boosters sport).
//
// Remplace progressivement l'ancien `SuggestedProductCard` inline dans
// NewAssessmentPage.tsx. Supporte :
//   - un état `selected` (bouton Retenu/Retenir),
//   - un highlight visuel "recommandé" (⭐ + bordure teal),
//   - un stepper de quantité optionnel (commit #4).
//
// Règles visuelles : var(--ls-*) uniquement, Syne + DM Sans, radius 14/12/10,
// touch targets ≥ 44px, mobile-first.

// QuantityStepper importé en commit #3 et branché en commit #4. Pour
// l'instant, le stepper est rendu uniquement si `quantity` + `onQuantityChange`
// sont fournis ET si le composant est en place (sinon no-op silencieux).

export interface SelectableProductCardProps {
  id: string;
  name: string;
  shortBenefit: string;
  prixPublic: number;
  pv: number;
  quantityLabel?: string;
  dureeReferenceJours?: number;
  /** Recommendation badge (⭐ + teal bg). Purely visual. */
  highlight?: { reason?: string };
  selected: boolean;
  onToggle: () => void;
  /** Quantity controls — if provided, shows stepper. */
  quantity?: number;
  onQuantityChange?: (q: number) => void;
  minQuantity?: number;
  maxQuantity?: number;
}

function formatPriceEuro(value: number) {
  return `${value.toFixed(2).replace(".", ",")}€`;
}

function formatPv(value: number) {
  return `${value.toFixed(1)} PV`;
}

export function SelectableProductCard({
  id: _id,
  name,
  shortBenefit,
  prixPublic,
  pv,
  quantityLabel,
  dureeReferenceJours,
  highlight,
  selected,
  onToggle,
  // quantity/onQuantityChange/minQuantity/maxQuantity : API publique déjà
  // définie mais non consommée avant commit #4 (stepper branché via QuantityStepper
  // créé en commit #3). Préfixage `_` pour éviter le warning ESLint.
  quantity: _quantity,
  onQuantityChange: _onQuantityChange,
  minQuantity: _minQuantity = 1,
  maxQuantity: _maxQuantity = 10,
}: SelectableProductCardProps) {
  const isRec = Boolean(highlight);

  return (
    <div
      className={`rounded-[20px] p-3.5 transition ${
        selected
          ? "border border-[rgba(45,212,191,0.25)] bg-[rgba(45,212,191,0.09)]"
          : "bg-[var(--ls-surface2)]"
      }`}
      style={
        isRec
          ? {
              border: "2px solid var(--ls-teal)",
              background:
                "color-mix(in srgb, var(--ls-teal) 8%, var(--ls-surface2))",
              position: "relative",
            }
          : { position: "relative" }
      }
    >
      {isRec ? (
        <span
          style={{
            position: "absolute",
            top: 8,
            right: 10,
            fontSize: 14,
            color: "var(--ls-gold)",
          }}
          aria-label="Recommandé"
          title={highlight?.reason ?? "Recommandé"}
        >
          ⭐
        </span>
      ) : null}

      <div className="flex h-full flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <p className="text-lg font-semibold text-white">{name}</p>
            <p className="text-sm leading-6 text-[var(--ls-text-muted)]">
              {shortBenefit}
            </p>
            {isRec && highlight?.reason ? (
              <p
                style={{
                  fontSize: 11,
                  color: "var(--ls-teal)",
                  fontStyle: "italic",
                  margin: 0,
                }}
              >
                {highlight.reason}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onToggle}
            aria-pressed={selected}
            className={`inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
              selected
                ? "bg-white text-[#0B0D11]"
                : "border border-white/10 bg-[var(--ls-surface2)] text-white hover:bg-white/[0.08]"
            }`}
          >
            {selected ? "Retenu" : "Retenir"}
          </button>
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-2">
          {quantityLabel ? (
            <span className="rounded-full bg-[var(--ls-surface2)] px-3 py-1 text-sm font-medium text-[var(--ls-text)]">
              {quantityLabel}
            </span>
          ) : null}
          {typeof dureeReferenceJours === "number" && dureeReferenceJours > 0 ? (
            <span className="rounded-full bg-[var(--ls-surface2)] px-3 py-1 text-sm font-medium text-[var(--ls-text)]">
              {dureeReferenceJours} jours
            </span>
          ) : null}
          <span className="rounded-full bg-[rgba(45,212,191,0.1)] px-3 py-1 text-sm font-semibold text-[#2DD4BF]">
            {formatPriceEuro(prixPublic)}
          </span>
          {pv > 0 ? (
            <span className="rounded-full bg-[rgba(45,212,191,0.1)] px-3 py-1 text-sm font-semibold text-[#2DD4BF]">
              {formatPv(pv)}
            </span>
          ) : null}
          {/* Stepper branché au commit #4 via QuantityStepper (commit #3). */}
        </div>
      </div>
    </div>
  );
}
