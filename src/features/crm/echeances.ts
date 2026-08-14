// =============================================================================
// echeances — la liste CRM rangée par QUAND, plus par étiquette.
//
// L'ancienne liste triait par date d'arrivée et étiquetait un état (Nouveaux /
// Contactés / Qualifiés). Deux problèmes, tous les deux vécus :
//
//   1. « Contacté » ne dit pas s'il faut faire quelque chose aujourd'hui.
//      Laure appelée hier sans réponse et Laure vue il y a trois mois portaient
//      exactement le même badge.
//   2. Trier par arrivée met en haut celui qui vient de s'inscrire — pas celui
//      qu'on a promis de rappeler ce matin.
//
// Ici on range par ÉCHÉANCE. Quatre groupes, et le nom du groupe est déjà
// l'instruction : Aujourd'hui · Cette semaine · Plus tard · Refermés.
//
// ── LES DEUX CAS QUE LA MAQUETTE N'AVAIT PAS ───────────────────────────────
//
// · **Jamais contacté** → Aujourd'hui. Personne n'a d'échéance tant que
//   personne ne l'a appelé ; c'est justement le travail du jour.
// · **Contacté sans échéance** → Aujourd'hui aussi. Ce sont les 15 fiches
//   (mesurées en base le 13/08) marquées « contacté » AVANT ce chantier :
//   des boucles ouvertes que l'ancien CRM faisait disparaître. Les laisser
//   glisser en « Plus tard » reproduirait exactement le bug qu'on corrige.
//   Elles se rangent d'elles-mêmes à la première qualification.
//
// Fonctions pures, `maintenant` en paramètre — c'est ce qui rend le passage de
// minuit et les fins de mois testables.
// =============================================================================

import { REPONSE_PAR_CLE, quandRevient, type CleReponse } from "./qualification";

export type CleGroupe = "aujourdhui" | "semaine" | "plusTard" | "refermes";

/** Le sous-ensemble de `CrmLead` dont dépend le rangement. Structurel exprès :
 *  ce module ne doit rien savoir du hook (ni de ses 40 autres champs). */
export interface LeadEcheance {
  status: "new" | "contacted" | "qualified" | "converted" | "lost";
  createdAt: string;
  contactedAt: string | null;
  relanceDueAt: string | null;
  derniereReponse: CleReponse | null;
}

export const GROUPES: Array<{ cle: CleGroupe; titre: string; teinte: string }> = [
  { cle: "aujourdhui", titre: "Aujourd'hui", teinte: "var(--ls-coral)" },
  { cle: "semaine", titre: "Cette semaine", teinte: "var(--ls-amber)" },
  { cle: "plusTard", titre: "Plus tard", teinte: "var(--ls-purple)" },
  { cle: "refermes", titre: "Refermés", teinte: "var(--ls-text-hint)" },
];

/** Minuit au début du jour de `d`, heure locale. */
function jourDe(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Écart en jours pleins entre deux instants (négatif = dans le passé). */
export function ecartEnJours(iso: string, maintenant: Date): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.round((jourDe(d) - jourDe(maintenant)) / 86_400_000);
}

/**
 * Dans quel groupe tombe cette personne.
 *
 * ⚠️ « Cette semaine » = J+1 à J+7, pas « jusqu'à dimanche ». La semaine
 * calendaire viderait le groupe le dimanche et enverrait un rappel calé lundi
 * dans « Plus tard » — c'est-à-dire hors du regard. Sept jours glissants disent
 * la même chose en français courant et ne mentent jamais.
 */
export function groupeDe(lead: LeadEcheance, maintenant: Date): CleGroupe {
  // Converti, perdu, ou RDV calé : plus rien à faire ICI. Le RDV vit dans
  // l'agenda désormais — sa ligne le dira en clair (« Rendez-vous pris »).
  if (lead.status === "converted" || lead.status === "lost" || lead.status === "qualified") {
    return "refermes";
  }
  if (!lead.relanceDueAt) return "aujourdhui"; // jamais contacté · contacté sans suite
  const ecart = ecartEnJours(lead.relanceDueAt, maintenant);
  if (ecart <= 0) return "aujourdhui"; // dû aujourd'hui, ou en retard
  if (ecart <= 7) return "semaine";
  return "plusTard";
}

/** Ce qu'on lit sous le nom : ce qui s'est passé la dernière fois. */
export function pourquoi(lead: LeadEcheance): string {
  if (lead.status === "converted") return "Devenu·e client·e";
  if (lead.derniereReponse) return REPONSE_PAR_CLE[lead.derniereReponse].resume;
  if (lead.status === "lost") return "N'est plus intéressé·e";
  if (lead.status === "qualified") return "Rendez-vous pris";
  if (!lead.contactedAt) return "Jamais rappelé·e";
  // Contacté un jour, sans qu'on sache ce qui s'est dit ni quand revenir. Le
  // dire franchement vaut mieux qu'un « Contacté » qui rassure à tort.
  return "Contacté·e, sans suite prévue";
}

/** La teinte de la ligne — celle de la dernière réponse, sinon celle du groupe. */
export function teinteDe(lead: LeadEcheance, groupe: CleGroupe): string {
  if (lead.derniereReponse) return REPONSE_PAR_CLE[lead.derniereReponse].teinte;
  if (lead.status === "converted" || lead.status === "qualified") return "var(--ls-lime)";
  return GROUPES.find((g) => g.cle === groupe)!.teinte;
}

/**
 * La pilule de droite. Elle rend `null` quand elle ne dirait rien de plus que
 * le titre du groupe — une liste où chaque ligne répète son en-tête ne se lit
 * plus.
 */
export function pilule(
  lead: LeadEcheance,
  groupe: CleGroupe,
  maintenant: Date,
): string | null {
  if (groupe === "refermes") return null;
  if (groupe === "aujourdhui") {
    if (!lead.relanceDueAt) return lead.contactedAt ? "sans suite" : "à appeler";
    const retard = -ecartEnJours(lead.relanceDueAt, maintenant);
    return retard >= 1 ? `en retard de ${retard} j` : null;
  }
  return quandRevient(lead.relanceDueAt, maintenant);
}

/**
 * L'instant sur lequel on trie : l'échéance quand il y en a une, sinon
 * l'arrivée. Le plus ancien d'abord — celui qui attend depuis le plus longtemps
 * passe devant celui qui vient de s'inscrire.
 */
function ancre(lead: LeadEcheance): number {
  const t = new Date(lead.relanceDueAt ?? lead.createdAt).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export interface GroupeRange<T> {
  cle: CleGroupe;
  titre: string;
  teinte: string;
  leads: T[];
}

/**
 * Range la liste. Les groupes vides sont conservés — c'est l'appelant qui
 * décide de les masquer, et les compteurs restent calculés au même endroit
 * (une maquette qui annonçait « 3 » au-dessus de 4 lignes, ça n'arrive qu'une
 * fois).
 */
export function grouperParEcheance<T extends LeadEcheance>(
  leads: T[],
  maintenant: Date,
): Array<GroupeRange<T>> {
  const paquets: Record<CleGroupe, T[]> = {
    aujourdhui: [],
    semaine: [],
    plusTard: [],
    refermes: [],
  };
  for (const l of leads) paquets[groupeDe(l, maintenant)].push(l);

  // Refermés : les plus récents d'abord, c'est un historique qu'on relit.
  paquets.refermes.sort((a, b) => ancre(b) - ancre(a));
  for (const cle of ["aujourdhui", "semaine", "plusTard"] as const) {
    paquets[cle].sort((a, b) => ancre(a) - ancre(b));
  }

  return GROUPES.map((g) => ({ ...g, leads: paquets[g.cle] }));
}
