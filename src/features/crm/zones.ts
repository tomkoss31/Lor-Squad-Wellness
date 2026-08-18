// =============================================================================
// zones — la liste rangée par GESTE, plus seulement par date.
//
// Le constat de Thomas (18/08, capture à l'appui) : « beaucoup d'info, on ne
// sait pas qui vient d'arriver, qui a déjà été contacté, qui est à relancer ou
// autre, les RDV calés… en un coup d'œil on est perdu ».
//
// Il avait raison, et la cause n'était pas le nombre d'informations : c'est que
// « Aujourd'hui · 7 » mettait dans le même tas trois gestes opposés —
//   · Anthony, à qui PERSONNE n'a jamais parlé ;
//   · quatre personnes déjà appelées, qui attendent une relance ;
//   · deux qui ont un rendez-vous, pour lesquelles il n'y a rien à faire.
//
// `echeances.ts` répond à « QUAND ». Ce module répond à « QUOI FAIRE », et il
// s'appuie sur le premier plutôt que de recalculer les dates dans son coin.
//
// Fonctions pures, `maintenant` en paramètre — même contrat que le reste.
// =============================================================================

import { ecartEnJours, groupeDe, type LeadEcheance } from "./echeances";
import { REPONSE_PAR_CLE } from "./qualification";
import type { EtatRdv } from "./etapes";

export type CleZone = "jamais" | "relancer" | "rdv" | "semaine" | "plusTard" | "refermes";

/** Ce dont dépend le rangement. Structurel : ce module ignore tout du hook. */
export interface LeadZone extends LeadEcheance {
  /** Où en est son créneau — un rendez-vous à venir change tout. */
  rdv: EtatRdv;
}

export const ZONES: Array<{
  cle: CleZone;
  titre: string;
  /** Ce qu'on attend du coach dans cette zone, en trois mots. */
  quoi: string;
  teinte: string;
}> = [
  { cle: "jamais", titre: "Personne ne leur a encore parlé", quoi: "Le plus urgent", teinte: "var(--ls-lime)" },
  { cle: "relancer", titre: "À relancer", quoi: "Tu les as déjà appelés", teinte: "var(--ls-coral)" },
  { cle: "rdv", titre: "Rendez-vous calés", quoi: "Rien à caler, juste à préparer", teinte: "var(--ls-teal)" },
  { cle: "semaine", titre: "Cette semaine", quoi: "Ils reviendront tout seuls", teinte: "var(--ls-amber)" },
  { cle: "plusTard", titre: "Plus tard", quoi: "Rien à faire maintenant", teinte: "var(--ls-purple)" },
  { cle: "refermes", titre: "Refermés", quoi: "Convertis ou perdus", teinte: "var(--ls-text-hint)" },
];

/** A-t-on déjà parlé à cette personne ? */
function dejaContacte(l: LeadZone): boolean {
  return Boolean(l.contactedAt) || l.derniereReponse !== null || l.status !== "new";
}

/**
 * Dans quelle zone tombe cette personne.
 *
 * ⚠️ L'ordre des tests compte. Un rendez-vous passe AVANT l'échéance : quelqu'un
 * qui a un créneau vendredi n'est pas « à relancer » parce qu'une date de rappel
 * traîne — il n'y a plus rien à lui vendre, il faut le recevoir.
 */
export function zoneDe(l: LeadZone, maintenant: Date): CleZone {
  if (l.status === "converted" || l.status === "lost") return "refermes";

  // Trois façons de dire la même chose, et il faut les trois.
  //
  // ⚠️ `prospect_leads` NE CONNAÎT PAS le statut « qualified » : la traduction
  // (`ecrireQualification.statutPour`) le range en « contacted ». Un lead colis
  // qui a dit « RDV calé » n'a donc que sa dernière réponse pour le prouver —
  // sans ce test, Mylène retombait dans « À relancer » alors qu'elle a son
  // rendez-vous (constaté à l'écran le 18/08).
  if (l.status === "qualified" || l.rdv === "aVenir" || l.derniereReponse === "rdv") return "rdv";

  const quand = groupeDe(l, maintenant);
  if (quand === "aujourdhui") return dejaContacte(l) ? "relancer" : "jamais";
  if (quand === "refermes") return "refermes";
  return quand; // "semaine" | "plusTard"
}

/** Le rangement complet, zones vides comprises — c'est l'écran qui filtre. */
export interface ZoneRangee<T> {
  cle: CleZone;
  titre: string;
  quoi: string;
  teinte: string;
  leads: T[];
}

export function grouperParZone<T extends LeadZone>(
  leads: T[],
  maintenant: Date,
): Array<ZoneRangee<T>> {
  const paquets = new Map<CleZone, T[]>(ZONES.map((z) => [z.cle, []]));
  for (const l of leads) paquets.get(zoneDe(l, maintenant))!.push(l);

  // Le plus vieux d'abord partout, sauf dans les refermés qu'on relit à
  // l'envers (l'historique se lit du plus récent).
  const ancre = (l: LeadZone) => {
    const t = new Date(l.relanceDueAt ?? l.createdAt).getTime();
    return Number.isNaN(t) ? 0 : t;
  };
  for (const [cle, liste] of paquets) {
    liste.sort((a, b) => (cle === "refermes" ? ancre(b) - ancre(a) : ancre(a) - ancre(b)));
  }

  return ZONES.map((z) => ({ ...z, leads: paquets.get(z.cle)! }));
}

/** « il y a 3 jours », « hier », « aujourd'hui » — sans jamais afficher de date. */
function ilYA(iso: string, maintenant: Date): string {
  const j = -ecartEnJours(iso, maintenant);
  if (j <= 0) return "aujourd'hui";
  if (j === 1) return "hier";
  return `il y a ${j} jours`;
}

/**
 * LA phrase de la ligne : ce qui s'est passé, et pourquoi cette personne est
 * encore là.
 *
 * Elle remplace à elle seule quatre éléments de l'ancienne ligne — la pilule
 * d'échéance, le sablier de stagnation, le motif et la colonne « Statut ». Un
 * « ⏳ 5j » ne dit pas s'il faut agir ; « tu devais la rappeler il y a 3 jours »,
 * si.
 */
export function phraseEtat(l: LeadZone, maintenant: Date): string {
  if (l.status === "converted") return "Devenu·e client·e";
  if (l.status === "lost") return "N'est plus intéressé·e";
  if (l.status === "qualified" || l.rdv === "aVenir" || l.derniereReponse === "rdv") {
    return "Rendez-vous pris";
  }
  // Un rendez-vous passé ne prime que s'il n'y a rien de prévu depuis : sinon
  // « son rendez-vous est passé » masquerait le « pas le bon moment » qui a
  // suivi, et qui est la vraie raison de son retour dans un mois.
  if (l.rdv === "passe" && !l.relanceDueAt) return "Son rendez-vous est passé";

  if (!dejaContacte(l)) {
    return `Jamais rappelé·e · arrivé·e ${ilYA(l.createdAt, maintenant)}`;
  }

  const quoi = l.derniereReponse ? REPONSE_PAR_CLE[l.derniereReponse].resume : null;

  if (l.relanceDueAt) {
    const retard = -ecartEnJours(l.relanceDueAt, maintenant);
    if (retard >= 1) {
      const debut = quoi ?? "Rappel prévu";
      return `${debut} · tu devais rappeler ${ilYA(l.relanceDueAt, maintenant)}`;
    }
    if (retard === 0) return `${quoi ?? "Rappel"} · à rappeler aujourd'hui`;
    // À venir : c'est la zone qui porte le « quand », pas la ligne.
    return quoi ?? "Rappel prévu";
  }

  // Contacté un jour, sans suite posée : le cas le plus fréquent, et celui
  // qu'on veut voir en clair plutôt qu'en badge « sans suite ».
  const quand = l.contactedAt ? ` ${ilYA(l.contactedAt, maintenant)}` : "";
  return `Contacté·e${quand} · aucune suite prévue`;
}
