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
