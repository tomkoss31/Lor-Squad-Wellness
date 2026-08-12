// =============================================================================
// monProfil — la ligne `users` du coach connecté, lue UNE fois pour tous.
//
// LE CONSTAT (mesuré sur la prod, 2026-08-12)
//
// À l'ouverture du Co-pilote, la table `users` était interrogée HUIT fois.
// Sept de ces appels lisaient la MÊME ligne — la sienne — chacun pour une
// colonne différente :
//
//   useProspectionData ....... prospection_onboarded_at
//   useStarterPlan ........... activated_at, starter_started_at
//   getCurrentUserRole ....... role
//   useBbcMode ............... club_model
//   useBbcRole ............... role        ← puis, dans un SECOND appel :
//   useBbcRole ............... bbc_role_override
//   OnboardingReturnPill ..... activated_at   (déjà lu par useStarterPlan)
//   useStreak ................ streak_count, streak_last_active, …
//
// Cinq d'entre eux partaient à la même milliseconde, et le dernier mettait
// 6 secondes — non pas parce qu'il est lent, mais parce qu'il faisait la queue
// derrière les autres.
//
// LA LIGNE ENTIÈRE COÛTE MOINS CHER QUE SES MORCEAUX
//
// La table `users` fait 42 Ko pour 22 lignes : une ligne pèse ~2 Ko. Charger
// tout d'un coup coûte moins qu'un seul aller-retour réseau supplémentaire.
// On lit donc la ligne complète, une fois, et chacun y pioche.
//
// FRAÎCHEUR : une minute. Un profil ne change pas plusieurs fois par minute,
// et après une écriture on appelle `oublierMonProfil()` — le cache ne peut
// donc pas mentir sur une donnée qu'on vient de modifier soi-même.
// =============================================================================

import { getSupabaseClient } from "./supabaseClient";
import { FRAICHEUR, lireAvecFraicheur, oublier } from "../lib/cacheFraicheur";

/** Ce que la ligne `users` porte et que l'app lit au démarrage. Volontairement
 *  large : ajouter un champ ici ne coûte aucun aller-retour de plus. */
export interface MonProfil {
  id: string;
  role: string | null;
  club_model: string | null;
  bbc_role_override: string | null;
  activated_at: string | null;
  starter_started_at: string | null;
  prospection_onboarded_at: string | null;
  streak_count: number | null;
  streak_last_active: string | null;
  lifetime_login_count: number | null;
  [autre: string]: unknown;
}

const cle = (userId: string) => `profil:${userId}`;

/**
 * La ligne du coach connecté. Plusieurs appels simultanés partagent la même
 * requête ; un appel dans la minute qui suit ne touche pas au réseau.
 */
export async function lireMonProfil(userId: string): Promise<MonProfil | null> {
  if (!userId) return null;
  return lireAvecFraicheur<MonProfil | null>(cle(userId), FRAICHEUR.MINUTE, async () => {
    const sb = await getSupabaseClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      // Best-effort : les appelants savent gérer `null` (ils affichaient déjà
      // un état vide quand leur propre requête échouait).
      console.warn("[monProfil] lecture impossible :", error.message);
      return null;
    }
    return (data as MonProfil | null) ?? null;
  });
}

/** À appeler après avoir ÉCRIT sur sa propre ligne, sinon le cache garde
 *  l'ancienne valeur jusqu'à une minute. */
export function oublierMonProfil(userId: string): void {
  oublier(cle(userId));
}
