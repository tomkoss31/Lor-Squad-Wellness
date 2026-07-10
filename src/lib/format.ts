// Helpers de formatage centralisés (boutique HL SKIN & au-delà).
//
// Avant ce fichier, chaque écran redéfinissait son propre `euro()` local
// (PanierPage, ProgrammeTicket, etc.). On centralise ici pour éviter la dérive.

const EUR_FORMAT = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

/**
 * Formate un montant en euros, style FR : `64,50 €`.
 * @param amount montant numérique (ex. 64.5)
 */
export function formatEuro(amount: number): string {
  if (!Number.isFinite(amount)) return EUR_FORMAT.format(0);
  return EUR_FORMAT.format(amount);
}

/**
 * Formate un montant en euros sans les centimes quand ils sont nuls :
 * `90 €` au lieu de `90,00 €` (utile pour les seuils / jauges).
 */
export function formatEuroCompact(amount: number): string {
  if (!Number.isFinite(amount)) return "0 €";
  const rounded = Math.round(amount * 100) / 100;
  return Number.isInteger(rounded)
    ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0 }).format(rounded)
    : formatEuro(rounded);
}
