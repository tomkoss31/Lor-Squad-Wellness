// =============================================================================
// La date d'ouverture du Breakfast Club, et ce qu'on en affiche.
//
// POURQUOI CE FICHIER
// « Ouverture prochaine » était écrit en dur à DEUX endroits : l'étiquette du
// haut de l'accueil, et la bannière du lien partagé. Le jour de l'ouverture, il
// aurait fallu penser aux deux, les modifier, et redéployer — un matin où
// personne n'aura la tête à ça. Ici, la date décide toute seule.
//
// ⚠ DUPLIQUÉ DANS api/og/club.ts, ET C'EST ASSUMÉ
// Les fonctions Vercel ne peuvent pas importer le front (même contrainte que le
// catalogue PV, cf. CLAUDE.md). La date y est donc recopiée. Si tu changes
// CLUB_OUVERTURE ici, change-la là-bas aussi — c'est écrit des deux côtés.
// =============================================================================

/** Ouverture officielle, décidée par Thomas le 13/08. Format ISO, heure de Paris. */
export const CLUB_OUVERTURE = "2026-09-07";

/**
 * La date du jour à Paris, en AAAA-MM-JJ.
 *
 * `en-CA` donne exactement ce format, ce qui permet de comparer deux dates
 * comme deux chaînes — sans fuseau qui dérive. Comparer des objets Date aurait
 * fait basculer l'affichage à 2h du matin en été pour un visiteur français.
 */
function aujourdhuiAParis(maintenant: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(maintenant);
}

/** Le club a-t-il ouvert ? Vrai le jour même, dès minuit à Paris. */
export function clubEstOuvert(maintenant: Date = new Date()): boolean {
  return aujourdhuiAParis(maintenant) >= CLUB_OUVERTURE;
}

/**
 * Ce qu'on affiche à côté de « Verdun ».
 *
 * Avant l'ouverture : une DATE, pas un « prochainement ». Une date se note dans
 * un agenda ; « prochainement » ne dit rien et n'engage personne.
 * Après : les horaires, parce que la question devient « c'est ouvert quand ? ».
 */
export function mentionOuverture(maintenant: Date = new Date()): string {
  if (clubEstOuvert(maintenant)) return "ouvert dès 7h";
  const [a, m, j] = CLUB_OUVERTURE.split("-").map(Number);
  const libelle = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" })
    .format(new Date(Date.UTC(a, m - 1, j)));
  return `ouverture le ${libelle}`;
}
