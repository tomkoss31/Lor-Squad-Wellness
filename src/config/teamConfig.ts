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
 * UUIDs hardcodés des 2 comptes couple Thomas + Mélanie.
 *
 * Si vide, fallback sur résolution par nom (fragile : casse silencieusement
 * si un nom est modifié en DB — ajout nom de famille, accent supprimé,
 * orthographe différente, etc.).
 *
 * À renseigner avec les vrais UUIDs récupérés depuis Supabase Studio :
 *
 *   SELECT id, full_name FROM users
 *   WHERE full_name ILIKE '%thomas%' OR full_name ILIKE '%mélanie%';
 *
 * Une fois renseigné, la fusion couple devient stable même si les noms
 * changent en DB. Priorité absolue sur la résolution par nom.
 *
 * Audit Bug #6 — résolution couple par nom fragile.
 */
export const COUPLE_USER_IDS_HARDCODED: string[] = [
  "656dcf35-4859-4a70-9d20-990104813423", // Thomas
  "6e552738-3fe5-4cdb-a4c8-15c5d7dca036", // Mélanie
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

/**
 * Sous quels identifiants regarder « mon équipe », quand on est ce viewer.
 *
 * ⚠️ 07/09 — Thomas : « Mélanie a le même ID Herbalife que moi, elle doit voir
 * la même équipe que moi, mon appli = la sienne en fonctionnalité ».
 *
 * Un membre du couple voit l'équipe DES DEUX : les recrues portent
 * l'identifiant de celui qui a signé le parrainage, alors qu'elles
 * appartiennent au couple. Sans ça, chacun ne voit que sa moitié — compté en
 * base le 07/09 : 10 recrues signées par Thomas, 3 par Mélanie, et aucun des
 * deux ne voyait les 13.
 *
 * Pour tout le monde d'autre : soi-même, et rien de plus. La fonction rend
 * toujours une liste, jamais `null` — un appelant qui l'oublierait afficherait
 * l'équipe de quelqu'un d'autre.
 *
 * ⚠️ NE PAS « RÉGLER » ÇA EN BASE en donnant à Mélanie `sponsor_id = Thomas` :
 * elle deviendrait sa filleule pour `herbalifeFormulas.ts`, donc pour le calcul
 * des PV, des paliers et des qualifications. Ils sont partenaires, pas l'un
 * sous l'autre. Cf. `docs/HERBALIFE_PALIERS_REGLES.md`.
 */
/**
 * L'identifiant Herbalife à utiliser AU NOM de ce viewer.
 *
 * ⚠️ 07/09 — Thomas : « l'ID de Mélanie est le même que le mien, 21Y0103610 ».
 * Vrai du **business** — ils sont un seul distributeur — mais impossible à
 * écrire tel quel : `users.herbalife_id` porte un index UNIQUE partiel
 * (`users_herbalife_id_unique`), et Thomas le détient déjà. Le dupliquer
 * échouerait, et forcer le dédoublonnage rendrait AMBIGUË la résolution
 * « quel coach porte cet identifiant ? » (`substituteTemplate`), qui prend le
 * premier trouvé.
 *
 * On le résout donc à la lecture : un membre du couple sans identifiant emprunte
 * celui de son partenaire. Un seul identifiant en base, les deux comptes qui
 * s'en servent — ce qui est exactement la réalité Herbalife.
 *
 * Concrètement, c'est ce qui permet à Mélanie d'envoyer une invitation Club VIP :
 * l'écran la bloquait sur « identifiant sponsor manquant ».
 */
export function idHerbalifeDeLaVue(
  currentUserId: string | null | undefined,
  users: User[],
): string | undefined {
  if (!currentUserId) return undefined;
  const moi = users.find((u) => u.id === currentUserId);
  const mien = moi?.herbalifeId?.trim();
  if (mien) return mien;
  for (const id of parrainsDeLaVue(currentUserId, users)) {
    if (id === currentUserId) continue;
    const sien = users.find((u) => u.id === id)?.herbalifeId?.trim();
    if (sien) return sien;
  }
  return undefined;
}

export function parrainsDeLaVue(
  currentUserId: string | null | undefined,
  users: User[],
): string[] {
  if (!currentUserId) return [];
  const couple = resolveCoupleUserIds(users);
  return couple.includes(currentUserId) ? couple : [currentUserId];
}
