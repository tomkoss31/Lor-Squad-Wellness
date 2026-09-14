// =============================================================================
// groupesListe — le découpage et l'ordre de LA liste du CRM, en un seul endroit.
//
// Thomas, 14/09 : « c'est beaucoup trop dense », puis, maquette validée :
// « il faut des menus déroulants pour chaque section, pas de surcharge ».
//
// ── POURQUOI UN MODULE ──────────────────────────────────────────────────────
// Deux endroits lisent ce découpage : la liste, qui dessine les sections, et le
// volet d'un lead, dont les flèches ↑↓ doivent suivre l'ordre de l'écran. Le
// 31/08, ces flèches suivaient une troisième définition de la « case » d'un
// lead et emmenaient ailleurs qu'à la ligne d'en dessous. Une règle, un code.
//
// ── LES GROUPES DISENT QUOI FAIRE ───────────────────────────────────────────
// C'est la maquette validée du 18/08, qui s'était perdue depuis : « À faire
// aujourd'hui · 29 » mélangeait des gens à qui personne n'avait parlé et des
// relances en retard — deux gestes différents dans un seul tas.
//
// Module pur : aucun rendu, aucune requête.
// =============================================================================

import { caseDuLead, type CaseLead } from "./caseLead";
import type { LeadEtape } from "./etapeLead";

export type CleGroupe = "nouveaux" | "relance" | "reste";

export interface Groupe {
  cle: CleGroupe;
  titre: string;
  /** Ce que le groupe demande, en quelques mots (masqué sur téléphone). */
  quoi: string;
  /** Un groupe urgent porte les lignes riches (Appeler / Écrire). */
  urgent: boolean;
}

/** L'ordre de l'écran. Le plus urgent en haut. */
export const GROUPES: readonly Groupe[] = [
  { cle: "nouveaux", titre: "Personne ne leur a encore parlé", quoi: "le plus urgent", urgent: true },
  { cle: "relance", titre: "À relancer", quoi: "tu les as déjà appelés", urgent: true },
  { cle: "reste", titre: "Le reste de ta liste", quoi: "rien à faire aujourd'hui", urgent: false },
];

/** Le groupe d'une case. Suit `demandeUnGeste` : nouveau et relance sont les
 *  deux seules cases qui demandent un geste aujourd'hui. */
export function groupeDe(c: CaseLead): CleGroupe {
  if (c === "nouveau") return "nouveaux";
  if (c === "relance") return "relance";
  return "reste";
}

/** Découpe en conservant l'ordre reçu — celui du sélecteur « Trier ». */
export function grouperPourListe<T extends LeadEtape>(leads: readonly T[]): Record<CleGroupe, T[]> {
  const g: Record<CleGroupe, T[]> = { nouveaux: [], relance: [], reste: [] };
  for (const l of leads) g[groupeDe(caseDuLead(l))].push(l);
  return g;
}

/** L'ordre de l'écran, groupe après groupe. C'est celui des flèches du volet. */
export function ordreDeListe<T extends LeadEtape>(leads: readonly T[]): T[] {
  const g = grouperPourListe(leads);
  return GROUPES.flatMap(({ cle }) => g[cle]);
}

/** Ce que le coach a lui-même ouvert ou fermé. Clé absente = rien décidé. */
export type ChoixOuverture = Partial<Record<CleGroupe, boolean>>;

/** Quelles sections sont ouvertes :
 *  · forcée (recherche, filtre, une seule section à l'écran) → toutes ;
 *  · sinon le choix du coach, s'il en a fait un ;
 *  · sinon la PREMIÈRE SECTION NON VIDE — et non la clé « nouveaux ».
 *    Relecture avant prod (14/09) : un jour sans nouveau lead, rien n'était
 *    déplié, et les relances du jour restaient cachées sous « commence en
 *    haut ». Les leads Meta n'arrivant plus seuls depuis le 08/09, ce jour-là
 *    est fréquent. */
export function sectionsOuvertes(
  nonVides: readonly CleGroupe[],
  choix: ChoixOuverture,
  forcee: boolean,
): Record<CleGroupe, boolean> {
  const ouvertes: Record<CleGroupe, boolean> = { nouveaux: false, relance: false, reste: false };
  for (const cle of nonVides) ouvertes[cle] = forcee || (choix[cle] ?? cle === nonVides[0]);
  return ouvertes;
}
