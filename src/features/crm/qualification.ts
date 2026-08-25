// =============================================================================
// qualification — « et alors ? », la seule question à poser après un message.
//
// Thomas : « on contacte, ça répond pas, comment on l'indique que c'est
// contacté et à rappeler avec rappel sur co-pilote à 24 H ? »
//
// ── POURQUOI ON N'ÉTIQUETTE PLUS UN ÉTAT ───────────────────────────────────
//
// Le CRM proposait cinq cases — Nouveaux / Contactés / Qualifiés / Convertis /
// Perdus — et aucune notion de temps. Passer Laure en « Contactés » la faisait
// SORTIR DE TOUS LES RADARS : le cron de relance ne regarde que les `new`, la
// file du Co-pilote aussi. On faisait disparaître quelqu'un qu'on voulait
// rappeler le lendemain.
//
// Ici, chaque réponse dit CE QUI S'EST PASSÉ *et* QUAND la personne revient.
// La date est la CONSÉQUENCE du geste — personne ne remplit jamais un champ
// date, et c'est tout l'intérêt : un tap, et la suite est calée.
//
// ── FONCTION PURE ───────────────────────────────────────────────────────────
//
// `maintenant` est un paramètre. C'est ce qui permet de vérifier qu'un « pas
// de réponse » à 23 h 50 revient bien le lendemain matin et pas dans la nuit.
// =============================================================================

export type CleReponse =
  | "pas_de_reponse"
  | "rappellera"
  | "ne_sait_pas"
  | "pas_maintenant"
  | "plus_interesse"
  | "rdv";

export interface Reponse {
  cle: CleReponse;
  /** Le libellé du bouton, à la 1re personne de ce qui s'est passé. */
  titre: string;
  /** Ce que l'app fera — affiché sous le titre, pour qu'aucun tap ne surprenne. */
  quand: string;
  /** Ce qu'on lit sous son nom dans la liste, plus tard. */
  resume: string;
  /** Délai avant retour dans la file. `null` = elle ne revient pas. */
  jours: number | null;
  /** Le statut CRM correspondant (vocabulaire existant des deux tables). */
  statut: "contacted" | "to_recontact" | "lost" | "qualified";
  teinte: string;
}

/** L'heure à laquelle une relance retombe : le matin, pas au milieu de la nuit. */
export const HEURE_DE_RELANCE = 9;

export const REPONSES: Reponse[] = [
  {
    cle: "pas_de_reponse",
    titre: "Pas de réponse",
    quand: "Revient demain",
    resume: "Appelé·e, pas de réponse",
    jours: 1,
    statut: "to_recontact",
    teinte: "var(--ls-coral)",
  },
  {
    cle: "rappellera",
    titre: "Il/elle rappellera",
    quand: "Filet de sécurité dans 3 jours",
    resume: "Doit rappeler",
    jours: 3,
    statut: "to_recontact",
    teinte: "var(--ls-amber)",
  },
  {
    cle: "ne_sait_pas",
    titre: "Répondu, ne sait pas",
    quand: "On revoit dans 7 jours",
    resume: "Hésite encore",
    jours: 7,
    statut: "to_recontact",
    teinte: "var(--ls-amber)",
  },
  {
    cle: "pas_maintenant",
    titre: "Pas maintenant",
    quand: "On revoit dans 1 mois",
    resume: "Pas le bon moment",
    jours: 30,
    statut: "to_recontact",
    teinte: "var(--ls-purple)",
  },
  {
    cle: "plus_interesse",
    titre: "Plus intéressé·e",
    quand: "Sort de la file",
    resume: "N'est plus intéressé·e",
    jours: null,
    statut: "lost",
    teinte: "var(--ls-text-hint)",
  },
  {
    cle: "rdv",
    titre: "RDV calé",
    quand: "Filet dans 7 jours",
    resume: "Rendez-vous pris",
    // ⚠️ 25/08 — c'était `null`, donc `relance_done_at = maintenant` : la fiche
    // se refermait DÉFINITIVEMENT. Mesure en base : 9 personnes dans un placard
    // dont l'étiquette disait « rien à faire », qu'aucun cron, aucune file,
    // aucun badge ne pouvait plus faire remonter. Si la personne ne venait pas,
    // ou venait sans démarrer, elle disparaissait pour toujours — exactement la
    // disparition silencieuse que le chantier « Et alors ? » devait supprimer.
    //
    // 7 jours : le temps que le rendez-vous ait lieu et qu'on ait pu convertir.
    // Si la fiche cliente est créée entre-temps, le lead sort de la file avant
    // que le filet ne sonne. Sinon il revient — et c'est tout l'objet.
    jours: 7,
    statut: "qualified",
    teinte: "var(--ls-lime)",
  },
];

export const REPONSE_PAR_CLE: Record<CleReponse, Reponse> = Object.fromEntries(
  REPONSES.map((r) => [r.cle, r]),
) as Record<CleReponse, Reponse>;

/**
 * `quand` en trois mots, pour un bouton de barre où la phrase entière ne tient
 * pas (« Filet de sécurité dans 3 jours » fait 190 px à lui seul).
 *
 * Dérivé de `jours` plutôt que saisi à côté de `quand` : deux textes écrits à
 * la main finissent toujours par se contredire. Le vocabulaire du GESTE, lui,
 * ne bouge pas — c'est `titre` partout, ici comme dans la feuille.
 */
export function quandCourt(reponse: Reponse): string {
  if (reponse.jours === null) return reponse.quand;
  if (reponse.jours === 1) return "demain";
  if (reponse.jours >= 28) return "dans 1 mois";
  return `dans ${reponse.jours} jours`;
}

/**
 * La date de retour, calculée depuis le geste.
 *
 * ⚠️ On cale à 9 h du matin, jamais à l'heure du clic. Un « pas de réponse »
 * saisi à 23 h 50 reviendrait sinon à 23 h 50 le lendemain — c'est-à-dire
 * après la journée de travail, donc jamais vu.
 */
export function dateDeRetour(reponse: Reponse, maintenant: Date): string | null {
  if (reponse.jours === null) return null;
  const d = new Date(maintenant);
  d.setDate(d.getDate() + reponse.jours);
  d.setHours(HEURE_DE_RELANCE, 0, 0, 0);
  // Un délai d'un jour posé avant 9 h du matin retomberait le lendemain à 9 h,
  // soit dans plus de 24 h : c'est voulu, « demain matin » veut dire demain.
  return d.toISOString();
}

/** Ce qu'on écrit en base pour une qualification donnée. */
export interface EcritureQualification {
  status: Reponse["statut"];
  derniere_reponse: CleReponse;
  contacted_at: string;
  relance_due_at: string | null;
  relance_done_at: string | null;
}

export function ecritureFor(reponse: Reponse, maintenant: Date): EcritureQualification {
  const due = dateDeRetour(reponse, maintenant);
  return {
    status: reponse.statut,
    derniere_reponse: reponse.cle,
    contacted_at: maintenant.toISOString(),
    relance_due_at: due,
    // ⚠️ SÉMANTIQUE IMPOSÉE PAR L'EXISTANT — `crm-relance-notifier` lit
    // « encore due » comme `relance_due_at <= now AND relance_done_at IS NULL`.
    // Donc poser une NOUVELLE échéance veut dire remettre `relance_done_at` à
    // null : sinon la relance naît déjà marquée faite et ne sonne jamais.
    // (Premier jet inverse — il aurait tout cassé en silence.)
    // Quand personne ne revient (perdu / RDV calé), on referme au contraire.
    relance_done_at: due === null ? maintenant.toISOString() : null,
  };
}

/** « demain matin », « dans 3 jours », « le 12 septembre »… */
export function quandRevient(iso: string | null, maintenant: Date): string {
  if (!iso) return "ne revient pas";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "date inconnue";
  const jourDe = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const ecart = Math.round((jourDe(d) - jourDe(maintenant)) / 86_400_000);
  if (ecart <= 0) return "aujourd'hui";
  if (ecart === 1) return "demain";
  if (ecart <= 6) {
    return new Intl.DateTimeFormat("fr-FR", { weekday: "long" }).format(d);
  }
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(d);
}

/**
 * Le message de 2e tentative — il doit NOMMER ce qui s'est passé la fois
 * d'avant. Réécrire « tu as laissé tes coordonnées » à quelqu'un qu'on a déjà
 * appelé sonne faux, et c'est le genre de détail qui fait qu'un message ne
 * ressemble à rien.
 */
export function messageDeRelance(
  reponse: CleReponse | null,
  prenom: string,
  moi: string,
): string {
  const p = prenom.trim() || "";
  switch (reponse) {
    case "pas_de_reponse":
      return `Bonjour ${p} 👋 C'est ${moi} de La Base 360, je vous ai appelé·e sans réussir à vous joindre. Je réessaie — dites-moi quel moment vous arrange 🙂`;
    case "rappellera":
      return `Bonjour ${p} 👋 C'est ${moi}. On avait dit que vous me rappeliez — pas de souci, je reviens vers vous. Toujours partant·e ?`;
    case "ne_sait_pas":
      return `Bonjour ${p} 👋 C'est ${moi}. Vous hésitiez la dernière fois — je peux répondre à ce qui vous freine, sans engagement 🙂`;
    case "pas_maintenant":
      return `Bonjour ${p} 👋 C'est ${moi} de La Base 360. Ce n'était pas le bon moment la dernière fois — est-ce que ça l'est davantage aujourd'hui ?`;
    default:
      return `Bonjour ${p} 👋 C'est ${moi} de La Base 360 — je reviens vers vous comme promis. Vous avez un moment cette semaine ? 🌿`;
  }
}
