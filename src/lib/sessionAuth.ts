// =============================================================================
// Ce qu'il faut faire quand Supabase annonce un changement d'authentification.
//
// Isolé du contexte React pour une seule raison : cette règle est testable, et
// elle DOIT l'être. Elle repose sur une distinction qu'aucun événement ne porte
// — `SIGNED_OUT` est émis à l'identique quand on clique « Sortir » et quand le
// jeton de rafraîchissement se fait refuser. Confondre les deux, c'est soit
// afficher « ta session a expiré » à quelqu'un qui vient de partir volontairement,
// soit laisser quelqu'un travailler une heure dans le vide.
//
// L'incident du 21/08 : deux renouvellements partis à 250 ms d'écart, tous deux
// refusés (HTTP 400) parce que le jeton de rafraîchissement TOURNE — le premier
// le consomme, le second arrive avec un jeton déjà utilisé. Session détruite,
// et l'app a continué d'afficher son utilisateur et ses données (elles vivaient
// dans le state React). Un panier puis un bilan entier ont été perdus.
//
// ⚠️ Une coupure réseau ne passe PAS par ici : vérifié dans auth-js,
// `_callRefreshToken` n'appelle `_removeSession()` (donc n'émet `SIGNED_OUT`)
// que si l'erreur n'est pas `isAuthRetryableFetchError`. On ne criera donc pas
// au loup dans un train.
// =============================================================================

/** Ce que le contexte doit faire de l'événement reçu. */
export type ReactionSession =
  /** La session est morte sans qu'on l'ait demandé → prévenir, tout de suite. */
  | "expiree"
  /** Le jeton repasse → effacer l'alerte et réarmer. */
  | "retablie"
  /** « Sortir » : départ volontaire, l'app repart sur l'écran de connexion. */
  | "sortie-voulue"
  /** Rien à signaler (`INITIAL_SESSION`, `USER_UPDATED`, `PASSWORD_RECOVERY`…). */
  | "rien";

export function reactionSession(
  evenement: string,
  deconnexionVoulue: boolean,
): ReactionSession {
  if (evenement === "SIGNED_IN" || evenement === "TOKEN_REFRESHED") return "retablie";
  if (evenement !== "SIGNED_OUT") return "rien";
  return deconnexionVoulue ? "sortie-voulue" : "expiree";
}

// ── Le refus sec, celui que Supabase n'annonce pas ──────────────────────────
//
// `reactionSession` ci-dessus ne voit que ce que la bibliothèque VEUT bien
// dire. Or le 22/08 elle n'a rien dit : le PC de Thomas sortait de veille avec
// un jeton périmé, il a envoyé six enregistrements de bilan, PostgREST a
// répondu six fois 401 — et aucun événement `SIGNED_OUT` n'a été émis, parce
// que la session n'avait pas été « supprimée », juste refusée.
//
// Résultat : le bandeau posé la veille est resté muet, et le bilan d'un client
// présent en rendez-vous a été perdu.
//
// D'où ce second signal, branché au seul endroit par lequel TOUTES les
// requêtes passent : le `fetch` du client Supabase. Un 401 sur `/rest/v1/`
// ne veut dire qu'une chose — le jeton n'est plus valable.

type Ecoute = () => void;
const ecoutes = new Set<Ecoute>();

/** S'abonner aux refus d'authentification. Rend la fonction de désabonnement. */
export function surRefusAuth(f: Ecoute): () => void {
  ecoutes.add(f);
  return () => {
    ecoutes.delete(f);
  };
}

/** Prévenir les abonnés qu'une requête a été refusée faute de session valable. */
export function signalerRefusAuth(): void {
  for (const f of ecoutes) {
    try {
      f();
    } catch {
      // un abonné qui casse ne doit pas empêcher les autres d'être prévenus
    }
  }
}

/**
 * Ce refus doit-il lever l'alerte ?
 *
 * ⚠️ On se limite à `/rest/v1/` À DESSEIN. Sur cette route, PostgREST ne
 * répond 401 que si le jeton est invalide ou absent — c'est exactement notre
 * cas. Une fonction edge (`/functions/v1/`) peut répondre 401 pour ses propres
 * raisons (webhook mal signé, jeton de gestion périmé), et l'app publique
 * appelle Supabase sans session du tout : élargir ferait crier au loup.
 */
export function estRefusDeSession(url: string, statut: number): boolean {
  return statut === 401 && url.includes("/rest/v1/");
}
