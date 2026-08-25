// =============================================================================
// À quelle ÉTAPE en est ce lead — une seule réponse, pour tout le CRM.
//
// LE CONSTAT (Thomas, 25/08, capture de son écran à l'appui) : l'entonnoir
// affichait « RDV calé : 1 » alors que SIX personnes avaient un rendez-vous
// confirmé à venir. Et le même lead était rangé dans « Nouveau » sur le board,
// mais dans « Rendez-vous calés » dans la vue Liste.
//
// LA CAUSE : la question « où en est ce lead ? » était résolue à TROIS endroits
// avec deux réponses différentes —
//   · `features/crm/zones.ts` (vue Liste, file mobile) REGARDE le rendez-vous
//   · `CrmPage.colonneDe` (board)                      ne regardait que `status`
//   · `CrmJaugeEntonnoir`   (l'entonnoir)              ne regarde que `status`
//
// Or `status` est une colonne écrite à la main, qui reste à `new` tant que
// personne ne l'a changée — même quand la personne a réservé, reçu sa
// confirmation et qu'elle vient demain matin.
//
// ── LA RÈGLE ──────────────────────────────────────────────────────────────
// Un créneau réservé et à venir EST l'étape « RDV calé », quoi que dise la
// colonne `status` : c'est un fait, pas une opinion. Et il passe AVANT
// l'échéance de relance — quelqu'un qui a un rendez-vous vendredi n'est pas
// « à relancer » parce qu'une date de rappel traîne, il faut le recevoir.
// (Ordre repris à l'identique de `zoneDe`, qui l'appliquait déjà.)
// =============================================================================

export type EtapeLead = "new" | "contacted" | "qualified" | "converted" | "lost";

/** Ce dont dépend l'étape. Structurel : testable sans le hook. */
export interface LeadEtape {
  status: string;
  /** Son créneau, s'il en a un. `passe` = il est derrière nous. */
  rdv?: { passe: boolean } | null;
  /** Ce qu'a répondu la feuille « Et alors ? ». */
  derniereReponse?: string | null;
  /** Le filet a sonné : la date de retour est passée et rien n'a bougé. */
  relanceDue?: boolean;
  dormant?: boolean;
}

export function etapeDuLead(l: LeadEtape): EtapeLead {
  // Les deux fins de parcours priment : elles ne se déduisent de rien d'autre.
  if (l.status === "converted") return "converted";
  if (l.status === "lost") return "lost";

  // Un rendez-vous À VENIR est un fait. Un rendez-vous PASSÉ, lui, ne dit plus
  // où on en est — la personne est venue, ou pas : c'est le suivi qui tranche.
  // Un créneau réservé et À VENIR : c'est un fait, il prime.
  if (l.status === "qualified" || (l.rdv && !l.rdv.passe)) return "qualified";

  // « RDV calé » dit à la main (sans créneau réservé dans l'app) ne vaut que
  // TANT QUE LE FILET N'A PAS SONNÉ. Sinon la mention collait à la fiche à vie :
  // 9 personnes restaient « rien à faire » alors que leur rendez-vous était
  // passé depuis des jours et qu'aucune fiche cliente n'avait été créée.
  if (l.derniereReponse === "rdv" && !l.relanceDue) return "qualified";

  return l.status === "contacted" ? "contacted" : "new";
}
