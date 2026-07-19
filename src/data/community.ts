// =============================================================================
// community — la preuve sociale du groupe (2026-07-17)
// =============================================================================
//
// POURQUOI EN DUR
// Ces chiffres vivent dans Telegram, pas dans notre base : rien ne peut les
// calculer côté app. Ils sont donc relevés à la main.
//
// ⚠️ THOMAS : c'est LE seul fichier à modifier quand tu veux les rafraîchir.
// Mets à jour les 3 nombres + la date du relevé, et toute la page suit. Garde
// les chiffres BRUTS (5 666, pas « plus de 5 000 ») : c'est le non-arrondi qui
// les rend crédibles. Et garde-les VRAIS — quelqu'un qui rejoint le groupe voit
// le compteur réel en trois secondes.
// =============================================================================

export const COMMUNITY_STATS = {
  /** Membres du groupe Telegram. */
  members: 179,
  /** Messages échangés depuis la création. */
  messages: 5666,
  /** Salons / espaces thématiques dans le groupe. */
  spaces: 11,
  /** Date du relevé — affichée nulle part, sert à savoir quand ça date. */
  measuredAt: "2026-07-16",
} as const;

/** « 5 666 » — espace insécable fine comme séparateur de milliers (typo FR). */
export function formatCount(n: number): string {
  return n.toLocaleString("fr-FR").replace(/ | /g, " ");
}
