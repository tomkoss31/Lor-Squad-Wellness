// Chantier Team Couple Display (2026-04-26).
// Thomas et Mélanie sont 2 comptes users séparés dans Supabase mais
// représentent UN SEUL distributeur Herbalife côté business ("Thomas &
// Mélanie", couple World Team).
// Tous les distri parrainés par l'un OU l'autre sont en fait parrainés par
// le couple, et ils doivent être affichés comme une seule card dans
// l'arbre d'équipe + une seule entrée dans le classement.
//
// Évolution future (si d'autres couples) : remplacer par une table
// distributor_couples (couple_id, member_user_ids[]) et un hook dédié.
// Pour l'instant une constante + résolution par nom suffit.

import type { User } from "../types/domain";

/**
 * IDs Supabase des 2 comptes couple. Tu peux :
 *  - laisser vide → résolution automatique par nom ("Thomas Houbert"
 *    et "Mélanie") sur la liste `users` de l'AppContext.
 *  - renseigner les UUIDs → priorité absolue (plus stable).
 */
export const COUPLE_USER_IDS_HARDCODED: string[] = [
  // "uuid-thomas-here",
  // "uuid-melanie-here",
];

/**
 * Fragments de nom utilisés pour la résolution auto si
 * COUPLE_USER_IDS_HARDCODED est vide. Insensible à la casse, insensible
 * aux accents (via normalize("NFD")).
 */
const COUPLE_NAME_FRAGMENTS = ["thomas", "melanie"];

/** ID virtuel représentant le couple dans l'arbre et le classement. */
export const COUPLE_VIRTUAL_ID = "couple:thomas-melanie";

/** Nom affiché partout où le couple apparaît comme un distri unique. */
export const COUPLE_DISPLAY_NAME = "Thomas & Mélanie";

/** Libellé secondaire (sous le nom). */
export const COUPLE_SUBTITLE = "World Team · Admins";

/** Initiales affichées dans l'avatar couple. */
export const COUPLE_INITIALS = "T&M";

function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .toLowerCase();
}

/**
 * Retourne les IDs des 2 membres du couple.
 * Priorité : la constante `COUPLE_USER_IDS_HARDCODED` si renseignée.
 * Sinon : résolution auto par match de nom.
 */
export function resolveCoupleUserIds(users: User[]): string[] {
  if (COUPLE_USER_IDS_HARDCODED.length > 0) {
    return COUPLE_USER_IDS_HARDCODED.filter((id) =>
      users.some((u) => u.id === id)
    );
  }
  const matched: string[] = [];
  for (const fragment of COUPLE_NAME_FRAGMENTS) {
    const user = users.find((u) => normalizeName(u.name ?? "").includes(fragment));
    if (user && !matched.includes(user.id)) {
      matched.push(user.id);
    }
  }
  return matched;
}

/** `true` si l'userId fait partie du couple selon la config actuelle. */
export function isCoupleUser(userId: string, users: User[]): boolean {
  return resolveCoupleUserIds(users).includes(userId);
}

/** `true` si l'ID correspond au couple virtuel. */
export function isCoupleVirtualId(id: string | null | undefined): boolean {
  return id === COUPLE_VIRTUAL_ID;
}
