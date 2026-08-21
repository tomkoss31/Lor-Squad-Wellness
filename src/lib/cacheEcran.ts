// =============================================================================
// Le cache d'écran : revenir sur une page ne doit pas tout redemander.
//
// LE CONSTAT (Thomas, 21/08) : « au lieu de tout relire, redemander à la base à
// chaque passage sur la page — exemple CRM, ça ré-ouvre tout à chaque fois ».
// Mesuré dans les journaux du jour, une simple ouverture du CRM :
//
//   14:14:01  prospect_leads    4 633 ms
//   14:14:01  online_bilans     4 401 ms
//   14:14:01  client_referrals  3 724 ms
//   14:14:01  rdv_bookings      4 124 ms
//   14:14:01  clubs             3 498 ms
//   --> ~5 secondes d'écran vide, à CHAQUE aller-retour vers le CRM.
//
// LE PRINCIPE : « montre d'abord, vérifie ensuite ». Au retour sur la page, on
// réaffiche instantanément ce qu'on avait, ET on relance la lecture en fond.
// Quand elle revient, l'écran se met à jour tout seul. On ne cache donc JAMAIS
// une donnée périmée : on évite seulement d'attendre devant un écran vide pour
// réapprendre ce qu'on savait déjà.
//
// ⚠️ CE QUE CE CACHE N'EST PAS. Il ne remplace aucune lecture — la requête part
// toujours. Il ne survit pas au rechargement de la page (mémoire du module, pas
// localStorage) : aucune donnée client ne traîne sur le disque. Et il est vidé
// à la déconnexion, pour qu'un compte ne puisse pas voir le reste d'un autre.
// =============================================================================

interface Entree<T> {
  valeur: T;
  ecritLe: number;
}

const entrees = new Map<string, Entree<unknown>>();

/**
 * Ce qu'on avait la dernière fois, s'il y a quelque chose.
 *
 * Pas de durée de validité : c'est l'appelant qui relance systématiquement la
 * lecture derrière. Une entrée « vieille » reste utile — elle sert d'affichage
 * pendant la seconde où la vraie réponse arrive.
 */
export function lireCacheEcran<T>(cle: string): T | null {
  const e = entrees.get(cle);
  return e ? (e.valeur as T) : null;
}

/** Depuis quand cette entrée est là (ms), ou null si on n'a rien. */
export function ageCacheEcran(cle: string, maintenant = Date.now()): number | null {
  const e = entrees.get(cle);
  return e ? maintenant - e.ecritLe : null;
}

export function ecrireCacheEcran<T>(cle: string, valeur: T, maintenant = Date.now()): void {
  entrees.set(cle, { valeur, ecritLe: maintenant });
}

/** Oublie une entrée. À utiliser quand on sait que la donnée a changé ailleurs. */
export function oublierCacheEcran(cle: string): void {
  entrees.delete(cle);
}

/**
 * Tout oublier. Appelé à la DÉCONNEXION : sans ça, la personne suivante à se
 * connecter sur le même navigateur verrait, le temps d'un battement, les leads
 * et les fiches de la précédente.
 */
export function viderCacheEcran(): void {
  entrees.clear();
}
