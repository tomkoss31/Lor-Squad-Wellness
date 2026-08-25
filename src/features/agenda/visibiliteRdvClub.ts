// =============================================================================
// Qui voit un rendez-vous du club — la règle, isolée pour qu'elle cesse de
// basculer d'un côté puis de l'autre.
//
// ── L'HISTORIQUE, PARCE QU'IL EXPLIQUE TOUT ───────────────────────────────
// Ce réglage s'est cassé DEUX FOIS, en sens inverse :
//
//   · avant le 19/08 — les RDV du club étaient rattachés au PROPRIÉTAIRE du
//     club. Mélanie confirmait un rendez-vous et ne le retrouvait jamais dans
//     son agenda.
//   · après le 19/08 — on les a rattachés à leur coache. Cette fois c'est
//     Thomas, propriétaire du club, qui ne voyait plus rien : filtre « Moi »
//     + coache = Mélanie ⇒ tout était écarté. Constaté le 25/08 : 5 rendez-vous
//     le jour même, aucun à l'écran.
//
// À chaque fois on a déplacé le rendez-vous d'une personne vers l'autre, en
// croyant choisir. C'était la mauvaise question.
//
// ── LA RÈGLE ──────────────────────────────────────────────────────────────
// Un rendez-vous du club concerne DEUX personnes, pour deux raisons
// différentes, et aucune des deux n'est facultative :
//   · la COACHE qui le mène — c'est son travail de la journée ;
//   · le PROPRIÉTAIRE du club, dont on occupe le créneau et la salle — il
//     ouvre la porte, il prépare, il doit savoir qui entre chez lui.
// Les deux le voient. Personne ne perd.
//
// SEULE EXCEPTION : si on demande explicitement l'agenda d'UN distributeur
// précis, on respecte ce choix — sinon le filtre ne voudrait plus rien dire.
// =============================================================================

export interface ContexteVisibilite {
  /** À qui le rendez-vous est rattaché (sa coache, ou le club à défaut). */
  aQui: string | null;
  /** Moi. */
  moi: string | null;
  /** Le filtre courant : « mine », « all », ou l'id d'un distributeur précis. */
  filtre: string;
  /** Suis-je propriétaire du club ? (`activeClub` n'existe que pour lui.) */
  proprietaireDuClub: boolean;
  /** Un non-admin ne voit jamais que le sien. */
  estAdmin: boolean;
}

export function voitCeRdvDuClub(c: ContexteVisibilite): boolean {
  if (!c.moi) return false;
  // Un non-admin ne sort jamais de son propre périmètre.
  if (!c.estAdmin) return c.aQui === c.moi;
  if (c.filtre === "all") return true;
  if (c.filtre === "mine") {
    // Le mien… ou celui qui se tient dans MON club.
    return c.aQui === c.moi || c.proprietaireDuClub;
  }
  // Un distributeur nommé : on respecte la demande, sans exception de club.
  return c.aQui === c.filtre;
}
