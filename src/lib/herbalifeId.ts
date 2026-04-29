// Validation centralisee ID Herbalife (2026-04-29).
//
// 2 formats officiels Herbalife :
//   1. Distributeur classique : 2 chiffres + 1 lettre + 7 chiffres
//      (ex: 21Y0103610, 10 chars)
//   2. Client VIP / membership : 2 chiffres + 2 lettres + 6 chiffres
//      (ex: 21XY010361, 10 chars)
//
// Cas important (note Mel 2026-04-29) : un client VIP qui devient distributeur
// **garde** son ID 21XY... d'origine. Donc TOUS les champs ID Herbalife (profil
// distri, sponsor, client VIP) doivent accepter LES DEUX formats.

/** Regex unifiee : 2 chiffres + (1 ou 2 lettres majuscules) + (6 ou 7 chiffres) */
export const HERBALIFE_ID_UNIFIED_REGEX = /^(?:\d{2}[A-Z]\d{7}|\d{2}[A-Z]{2}\d{6})$/;

/** Pattern HTML5 pour input pattern attribute (pas de flags). */
export const HERBALIFE_ID_PATTERN = "^(?:\\d{2}[A-Z]\\d{7}|\\d{2}[A-Z]{2}\\d{6})$";

/** Message utilisateur unifie pour aider en cas d'erreur saisie. */
export const HERBALIFE_ID_HELP =
  "Format attendu : 21Y0103610 (distri) ou 21XY010361 (VIP/client)";

/**
 * Verifie si une chaine respecte un des 2 formats officiels Herbalife.
 * Insensible a la casse (uppercase normalisation faite en interne).
 * @returns true si format valide, false sinon. Vide → true (champ optionnel).
 */
export function isValidHerbalifeId(value: string | null | undefined): boolean {
  if (!value) return true;
  const trimmed = value.trim().toUpperCase();
  if (!trimmed) return true;
  return HERBALIFE_ID_UNIFIED_REGEX.test(trimmed);
}

/**
 * Detecte le type d'ID (distri / vip).
 * @returns 'distri' | 'vip' | null si format invalide.
 */
export function detectHerbalifeIdType(
  value: string | null | undefined,
): "distri" | "vip" | null {
  if (!value) return null;
  const trimmed = value.trim().toUpperCase();
  if (/^\d{2}[A-Z]\d{7}$/.test(trimmed)) return "distri";
  if (/^\d{2}[A-Z]{2}\d{6}$/.test(trimmed)) return "vip";
  return null;
}
