// =============================================================================
// Rattacher un rendez-vous à un lead : la clé d'identité.
//
// LE BUG, remonté par Thomas le 21/08. Le CRM affichait pour **Manon Legrand**
// un rendez-vous le 29/08 à 10h — le rendez-vous de **Manon PERRIN**. Deux
// personnes différentes, deux adresses, deux numéros. Personne n'avait rien
// validé avec Manon Legrand, et elle n'a jamais reçu d'heure par mail : elle
// n'a tout simplement JAMAIS réservé, elle a laissé ses coordonnées le 19/08 et
// s'est arrêtée là.
//
// LA CAUSE. L'appariement se faisait par contact, et **à défaut par PRÉNOM
// SEUL** :
//
//     parContact.get(email) ?? parPrenom.get("manon") ?? null
//
// Un prénom n'identifie personne. Trois leads sur 28 héritaient ainsi du
// rendez-vous de quelqu'un d'autre — dont un prospect nommé Thomas qui avait
// récupéré le rendez-vous d'essai de Thomas lui-même.
//
// CE QUE ÇA COÛTE VRAIMENT : un lead qui SEMBLE avoir un rendez-vous n'est
// jamais rappelé. Le prénom, en croyant bien faire, faisait disparaître des
// gens du travail à faire.
//
// LA RÈGLE RETENUE : on n'apparie sur l'identité que si le prénom ET le nom de
// famille sont connus **des deux côtés** et concordent. Dans le doute, on
// n'apparie pas — mieux vaut un rendez-vous non affiché (le coach appelle et le
// découvre) qu'un rendez-vous inventé (le coach n'appelle pas).
//
// ⚠️ Seules 5 réservations sur 9 portent un nom de famille (colonne récente).
// Les autres ne seront donc jamais appariées autrement que par leur contact.
// C'est voulu : on n'a pas de quoi être sûr, donc on n'affirme rien.
// =============================================================================

/** Minuscules, sans accents, espaces normalisés. Vide si rien d'exploitable. */
function normaliser(valeur: unknown): string {
  return String(valeur ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * La clé d'identité d'une personne, ou `null` si on n'en sait pas assez.
 *
 * ⚠️ La MÊME fonction doit servir des deux côtés — sur la réservation et sur le
 * lead. C'est ce qui garantit qu'ils ne peuvent pas diverger : deux
 * normalisations écrites séparément finissent toujours par se désaccorder sur
 * un accent ou une majuscule.
 */
export function cleIdentite(prenom: unknown, nom: unknown): string | null {
  const p = normaliser(prenom);
  const n = normaliser(nom);
  // Sans nom de famille, on ne sait pas de qui on parle. C'est TOUT le correctif.
  if (!p || !n) return null;
  return `${p} ${n}`;
}
