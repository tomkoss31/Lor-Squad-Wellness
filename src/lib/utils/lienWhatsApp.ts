// =============================================================================
// lienWhatsApp — construire un lien wa.me qui ouvre la bonne conversation.
//
// LE PIÈGE
//
// `wa.me` exige le numéro au format INTERNATIONAL, sans « + », sans espaces et
// SANS le zéro initial. Un numéro français saisi « 06 79 44 87 59 » donne donc
// `wa.me/33679448759` — surtout pas `wa.me/0679448759`, que WhatsApp refuse.
//
// Repéré le 12/08/2026 : le code construisait ce lien à quatre endroits, et
// UN SEUL faisait la conversion (SendBusinessPlanButton). Les trois autres
// passaient le numéro national tel quel.
//
// D'où cet utilitaire : une seule façon de faire, testée.
// =============================================================================

/** Indicatif par défaut quand le numéro est saisi au format national. */
const INDICATIF_FR = "33";

/**
 * Numéro au format attendu par wa.me — chiffres uniquement, indicatif compris.
 * Renvoie null si le numéro est absent ou inexploitable.
 *
 *   "06 79 44 87 59"  → "33679448759"
 *   "+33 6 79 44 87 59" → "33679448759"
 *   "0033679448759"   → "33679448759"
 *   ""                → null
 */
export function numeroPourWhatsApp(numero: string | null | undefined): string | null {
  const brut = (numero ?? "").trim();
  if (!brut) return null;

  const avecPlus = brut.startsWith("+");
  let chiffres = brut.replace(/\D/g, "");
  if (!chiffres) return null;

  // « 0033… » est la forme internationale écrite à l'ancienne.
  if (chiffres.startsWith("00")) chiffres = chiffres.slice(2);
  // « +33… » : les chiffres portent déjà l'indicatif.
  else if (avecPlus) { /* rien à faire */ }
  // « 06… » : format national français.
  else if (chiffres.startsWith("0")) chiffres = INDICATIF_FR + chiffres.slice(1);

  // Trop court pour être un numéro joignable (indicatif + 6 chiffres mini).
  return chiffres.length >= 8 ? chiffres : null;
}

/**
 * Lien wa.me prêt à ouvrir. Sans numéro exploitable, renvoie le lien de
 * partage générique — WhatsApp demande alors à qui envoyer, ce qui vaut mieux
 * qu'une erreur « numéro invalide ».
 */
export function lienWhatsApp(numero: string | null | undefined, message: string): string {
  const cible = numeroPourWhatsApp(numero);
  const texte = encodeURIComponent(message);
  return cible ? `https://wa.me/${cible}?text=${texte}` : `https://wa.me/?text=${texte}`;
}
