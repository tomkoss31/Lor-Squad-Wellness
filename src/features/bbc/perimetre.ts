// =============================================================================
// « Qui je vois » — la seule définition du périmètre d'un coach du club.
//
// POURQUOI CE FICHIER EXISTE. La même règle était recopiée à la main dans
// chaque écran, et elle a été OUBLIÉE trois fois :
//   · 07/09 matin — « Le club ce matin » ne montrait que les pointages du coach
//     connecté : 2 personnes sur 9 un jour d'ouverture.
//   · 07/09 soir  — Messages et Appels filtraient sur `distributor_id`, donc
//     Thomas, propriétaire du club, voyait 4 membres sur 14. Il ne pouvait ni
//     écrire à une personne suivie par Mélanie, ni l'inviter à un atelier.
// Trois oublis du même geste, ce n'est plus une étourderie : c'est qu'il n'y
// avait rien à appeler. Maintenant si.
//
// LA RÈGLE, dite par Thomas (17/08, redite le 07/09) :
//   · un ADMIN voit TOUT LE CLUB — messagerie, ateliers, cœurs, ambassadeur ;
//   · un COACH voit LES SIENS ;
//   · le filtre « les miens » sert à retrouver vite, il ne cache jamais rien
//     qu'on ne puisse rouvrir.
//
// ⚠️ CE N'EST PAS LA RÈGLE DES VISITES. `useBbcVisits` élargit au club pour
// TOUT LE MONDE, admin ou pas, et c'est voulu : au comptoir le matin, celui qui
// tient la tablette pointe les gens des autres coachs. Ne pas « harmoniser »
// les deux — ce serait re-casser le pointage du matin.
//
// ⚠️ CE N'EST PAS UNE SÉCURITÉ. Le RLS reste la vraie barrière. Ceci ne fait
// que demander le bon périmètre ; si une policy est plus étroite, l'écran
// restera vide malgré un filtre correct (c'était le cas des inscriptions aux
// rituels avant la migration du 07/09).
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";

export interface Perimetre {
  /** true = ce lecteur a droit au club entier. */
  vueClub: boolean;
  /** Le club où il travaille (`users.club_id`), null hors club. */
  monClub: string | null;
  userId: string;
}

/**
 * Le périmètre du lecteur, lu en base.
 *
 * `users.club_id` (migration du 17/08) dit où le coach TRAVAILLE : un admin qui
 * ne possède pas le club en fait partie quand même. En cas de doute — pas de
 * ligne, requête refusée — on renvoie le périmètre le plus étroit : ses
 * propres fiches. Une erreur ne doit jamais ouvrir plus grand.
 */
export async function perimetreDuCoach(sb: SupabaseClient, userId: string): Promise<Perimetre> {
  try {
    const { data } = await sb.from("users").select("role, club_id").eq("id", userId).maybeSingle();
    const role = String((data as { role?: string } | null)?.role ?? "");
    const club = (data as { club_id?: string | null } | null)?.club_id ?? null;
    return { vueClub: role === "admin" && !!club, monClub: club, userId };
  } catch {
    return { vueClub: false, monClub: null, userId };
  }
}

/**
 * Restreint une requête sur `clients` au périmètre du lecteur.
 *
 * Générique sur le constructeur de requête plutôt que typé `PostgrestFilterBuilder` :
 * la signature exacte change entre les versions de `supabase-js`, et on n'a
 * besoin que de `.eq()`.
 */
export function limiterAuxMiens<T>(requete: T, p: Perimetre): T {
  // La contrainte `T extends { eq(...): T }` serait plus jolie, mais elle fait
  // exploser TypeScript sur les `select()` longs (TS2589 « type instantiation
  // is excessively deep »). On la resout ici, une fois.
  const q = requete as unknown as { eq(colonne: string, valeur: string): T };
  return p.vueClub && p.monClub ? q.eq("club_id", p.monClub) : q.eq("distributor_id", p.userId);
}
