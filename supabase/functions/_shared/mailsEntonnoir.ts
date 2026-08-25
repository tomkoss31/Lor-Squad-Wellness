// =============================================================================
// Les mots des mails de l'entonnoir — tout ce qui se lit est ICI.
//
// Chantier emails du 25/08, après l'audit qui a montré que l'entonnoir était
// muet à ses deux bouts : rien à la capture, rien après le rendez-vous.
//
// ── POURQUOI UN SEUL FICHIER ──────────────────────────────────────────────
// Thomas doit pouvoir changer une phrase sans ouvrir une fonction serveur.
// Les textes vivent donc ici, séparés de la mécanique qui les envoie. La mise
// en page, elle, est celle de `clubMessageHtml` (identité Breakfast Club) —
// on ne réécrit pas un quatrième gabarit.
//
// ── CE QUI EST VALIDÉ, ET CE QUI NE L'EST PAS ─────────────────────────────
// Trois textes relus et validés par Thomas sur maquette avant d'être codés.
// Le quatrième — « venue mais pas démarré » — est MIS DE CÔTÉ : c'est le seul
// où la raison change à chaque personne, et où un texte générique sonnerait
// creux. Il méritera d'être préparé pour que le coach ajuste une phrase.
//
// ⚠️ Le site du club s'écrit en .COM. Le .fr ne mène nulle part.
// =============================================================================

import { CLUB_URL } from "./clubEmail.ts";

/** Où l'on renvoie quelqu'un pour (re)prendre un créneau. */
export const URL_RESERVER = `${CLUB_URL}/reserver`;

export interface MailEntonnoir {
  objet: string;
  titre: string;
  message: string;
  cta?: { label: string; url: string };
}

/** Le prénom en tête de phrase, sans jamais laisser un « , » orphelin. */
function prenomOu(prenom: string | null | undefined, defaut = "toi"): string {
  const p = (prenom ?? "").trim();
  return p || defaut;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Elle a laissé ses coordonnées et n'a pas choisi d'heure.
//
// LA PLUS GROSSE FUITE : 8 personnes sur 20 s'arrêtent exactement là (mesure
// du 25/08). Ce mail a UN SEUL travail — transformer les coordonnées en
// créneau. Pas éduquer, pas qualifier : à cette seconde-là, son intention est
// au plus haut, et un seul bouton vaut mieux que trois liens.
// ─────────────────────────────────────────────────────────────────────────────
export function mailCreneauManquant(prenom: string | null): MailEntonnoir {
  const p = prenomOu(prenom);
  return {
    objet: `${p}, il te reste juste à choisir ton heure`,
    titre: `On a bien tes coordonnées, ${p}`,
    message: [
      "Il ne manque qu'une chose : l'heure qui t'arrange. Ça prend trente secondes, et tu peux la changer quand tu veux.",
      "Au rendez-vous, on parle de toi — ton quotidien, ton énergie, ce qui coince depuis un moment. On mesure où tu en es, simplement, pour avoir un point de départ. Et tu repars avec un cap clair.",
      "C'est gratuit, ça dure 45 minutes, et tu repars avec quelque chose d'utile même si tu ne fais rien ensuite.",
      "Une question ? Réponds simplement à cet email.",
    ].join("\n\n"),
    cta: { label: "Choisir mon créneau", url: URL_RESERVER },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Elle est venue et elle démarre.
//
// Rien à vendre : c'est fait. Court, chaleureux, et on s'arrête là.
//
// ⚠️ PAS de bouton « Ouvrir mon espace » — décision de Thomas, et il a raison :
// l'accès à la PWA dépend d'un jeton personnel qu'elle n'a pas forcément
// encore. Le fabriquer ici pour un bouton qui pourrait tomber dans le vide
// coûterait plus cher que ça ne rapporte.
// ─────────────────────────────────────────────────────────────────────────────
export function mailDemarrage(prenom: string | null): MailEntonnoir {
  const p = prenomOu(prenom);
  return {
    objet: `Bienvenue ${p} 🌿`,
    titre: `C'est parti, ${p}`,
    message: [
      "Content de t'avoir rencontrée aujourd'hui. Tu as maintenant ton point de départ — et c'est la seule chose qu'on ne peut jamais refaire après coup.",
      "Les premiers jours sont les plus importants. Si quelque chose coince — une question, un doute, une envie de tout arrêter à 17 h — écris-moi. C'est exactement pour ça que je suis là.",
      "À très vite au club 🌿",
    ].join("\n\n"),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Elle n'est pas venue.
//
// Le créneau réservé est un FAIT, pas une facture : on le dit une fois, sans
// reproche, et on enchaîne tout de suite sur la sortie.
//
// La dernière phrase n'est pas de la politesse. Sans porte de sortie, les gens
// ne répondent pas du tout ; avec, certains disent non — et on récupère un
// créneau au lieu de relancer dans le vide.
// ─────────────────────────────────────────────────────────────────────────────
export function mailPasVenue(prenom: string | null, heure: string | null): MailEntonnoir {
  const p = prenomOu(prenom);
  // Sans heure fiable, on ne l'invente pas : la phrase se referme proprement.
  const rappelCreneau = heure
    ? `Ton créneau de ${heure} t'était réservé et on n'a pas eu de nouvelles.`
    : `Ton créneau t'était réservé et on n'a pas eu de nouvelles.`;
  return {
    objet: `On t'a gardé ta place, ${p}`,
    titre: `On ne t'a pas vue, ${p}`,
    message: [
      `${rappelCreneau} Un empêchement, ça arrive — vraiment, ce n'est pas grave.`,
      "Si tu veux toujours faire le point, reprends simplement une heure qui te va mieux. C'est le même rendez-vous, toujours gratuit, toujours 45 minutes.",
      "Et si ce n'est plus d'actualité, dis-le-moi d'un mot : je ne te relancerai plus.",
    ].join("\n\n"),
    cta: { label: "Reprendre un rendez-vous", url: URL_RESERVER },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. La relance des dormants — celles qui ont laissé leurs coordonnées et
//    qu'on n'a jamais réussi à joindre.
//
// ⚠️ CORRECTION DE THOMAS (25/08) : le premier jet disait « on s'est croisés ».
// C'EST FAUX, et il l'a vu tout de suite. Ces personnes ont rempli un
// formulaire sur le site — on ne les a JAMAIS rencontrées. Écrire le contraire
// serait la première phrase d'un mail qui sonne faux.
//
// Le nombre de jours est LU sur la vraie date d'entrée du lead, jamais
// approximé : « il y a quelque temps » est le genre de flou qui dit qu'on ne
// sait plus qui elle est.
//
// La porte de sortie n'est pas de la politesse. Sur quelqu'un qui n'a pas
// répondu depuis deux semaines, c'est elle qui fait la différence entre du
// silence de plus et une vraie réponse — même négative, qui libère la place.
// ─────────────────────────────────────────────────────────────────────────────

/** D'où vient ce dormant — la première phrase en dépend. */
export type ContexteDormant =
  /** Elle a laissé ses coordonnées, on n'a jamais réussi à se parler. */
  | "jamais_parle"
  /** Elle avait un créneau, elle l'a annulé et n'en a jamais repris. */
  | "a_annule";

export function mailRelanceDormant(
  prenom: string | null,
  jours: number,
  contexte: ContexteDormant = "jamais_parle",
): MailEntonnoir {
  const p = prenomOu(prenom);
  const depuis = jours <= 1 ? "hier" : `il y a ${jours} jours`;

  const ouverture =
    contexte === "a_annule"
      ? `Tu avais réservé un créneau au Breakfast Club ${depuis}, puis tu as dû l'annuler — et on n'a pas eu l'occasion d'en recaler un autre.`
      : `Tu as laissé tes coordonnées au Breakfast Club ${depuis}, et on n'a pas encore réussi à se parler. Ça arrive — la vie va vite.`;

  return {
    objet: `Toujours envie de faire le point, ${p} ?`,
    titre: `Ça tient toujours, ${p} ?`,
    message: [
      ouverture,
      "Si l'envie est toujours là, il te suffit de choisir une heure. C'est gratuit, ça dure 45 minutes, et tu repars avec quelque chose de clair même si tu ne fais rien ensuite.",
      "Et si ce n'est plus d'actualité, réponds-moi juste « non merci » : je ne te relancerai plus, sans rancune.",
    ].join("\n\n"),
    cta: { label: "Choisir mon créneau", url: URL_RESERVER },
  };
}
