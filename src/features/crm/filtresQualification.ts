// =============================================================================
// filtresQualification — les questions qui qualifient, pas des cases en plus.
//
// Lot 5 du chantier CRM Board V2 : « ce ne sont pas des cases en plus, ce sont
// les questions qui qualifient un lead dans les CRM du marché ».
//
// ── CE QUI EST LÀ, ET CE QUI NE PEUT PAS L'ÊTRE ───────────────────────────
// La spec liste six familles de filtres. Cinq sont calculables aujourd'hui à
// partir de ce qui existe déjà en base — température (`leadScoring.ts`),
// stagnation (`leadActivity.ts`), attribution, suite prévue, objectif.
//
// La sixième, « veut commencer quand » (cette semaine / ce mois / plus tard),
// est présentée par la spec comme LE critère de tri des CRM à forte conversion.
// Elle n'est PAS ici : c'est un champ que personne n'a jamais demandé au
// prospect. L'ajouter suppose de toucher le questionnaire du bilan en ligne —
// un tunnel public, avec sa propre recette. Un filtre qui ne trouverait jamais
// rien serait pire que pas de filtre.
//
// Ce module ne connaît ni React ni Supabase : il décrit des prédicats et les
// applique. C'est ce qui le rend testable et réutilisable par la vue Liste
// comme par le board.
// =============================================================================

import { computeLeadScore, type LeadTemperature } from "../../lib/leadScoring";
import { stagnationDays } from "../../lib/leadActivity";
import type { CrmLead } from "../../hooks/useCrmLeads";

/** Les signaux d'alerte : ce qui cloche, pas ce qui va bien. */
export type CleSignal = "sansSuite" | "sansMouvement" | "jamaisContacte" | "nonAttribue";

export const SIGNAUX: Array<{ cle: CleSignal; label: string; pourquoi: string }> = [
  {
    cle: "sansSuite",
    label: "Sans suite prévue",
    pourquoi: "Aucune date de retour : personne ne les rappellera tout seul.",
  },
  {
    cle: "sansMouvement",
    label: "Sans mouvement 5 j+",
    pourquoi: "Rien ne bouge depuis 5 jours — la carte pourrit où qu'elle soit.",
  },
  {
    cle: "jamaisContacte",
    label: "Jamais contacté",
    pourquoi: "Ils ont laissé leurs coordonnées et n'ont jamais eu de réponse.",
  },
  {
    cle: "nonAttribue",
    label: "Non attribué",
    pourquoi: "Personne n'en est responsable, donc personne ne s'en occupe.",
  },
];

export interface FiltreQualif {
  /** Vide = toutes les températures. */
  temperatures: LeadTemperature[];
  /** Vide = aucun signal exigé. Plusieurs signaux = ET, pas OU. */
  signaux: CleSignal[];
  /** Vide = tous les objectifs. */
  objectifs: string[];
}

export const FILTRE_VIDE: FiltreQualif = { temperatures: [], signaux: [], objectifs: [] };

export function estVide(f: FiltreQualif): boolean {
  return f.temperatures.length === 0 && f.signaux.length === 0 && f.objectifs.length === 0;
}

export function nbActifs(f: FiltreQualif): number {
  return f.temperatures.length + f.signaux.length + f.objectifs.length;
}

/**
 * Le lead porte-t-il ce signal ?
 *
 * ⚠️ « Sans suite prévue » ne s'applique qu'aux leads VIVANTS. Un converti ou
 * un perdu n'a par définition aucune suite à prévoir : les compter ici
 * remplirait le filtre de gens dont on n'attend plus rien, et le rendrait
 * inutilisable au bout d'un mois.
 */
export function porteLeSignal(lead: CrmLead, signal: CleSignal): boolean {
  const vivant = lead.status !== "converted" && lead.status !== "lost" && !lead.dormant;
  switch (signal) {
    case "sansSuite":
      return vivant && !lead.relanceDueAt;
    case "sansMouvement":
      return vivant && stagnationDays(lead) >= 5;
    case "jamaisContacte":
      return vivant && !lead.contactedAt && lead.derniereReponse === null;
    case "nonAttribue":
      return !lead.ownerUserId;
    default:
      return false;
  }
}

/**
 * Applique le filtre. Entre familles c'est un ET (chaud ET sans suite), à
 * l'intérieur d'une famille un OU (chaud OU tiède) — c'est ce que tout le
 * monde attend d'une barre de filtres, et l'inverse ne renverrait jamais rien.
 */
export function passe(lead: CrmLead, f: FiltreQualif): boolean {
  if (f.temperatures.length > 0) {
    const t = computeLeadScore(lead).temperature;
    if (!f.temperatures.includes(t)) return false;
  }
  if (f.objectifs.length > 0) {
    const o = (lead.objectif ?? "").trim();
    if (!o || !f.objectifs.includes(o)) return false;
  }
  // Plusieurs signaux cochés = tous exigés : on cherche les cas les plus
  // abîmés, pas la réunion de tous les problèmes.
  for (const s of f.signaux) {
    if (!porteLeSignal(lead, s)) return false;
  }
  return true;
}

// ── Vues sauvées ───────────────────────────────────────────────────────────
// En localStorage et pas en base : une vue est un confort personnel, propre à
// l'appareil sur lequel on travaille. La passer en base voudrait dire une
// table, une policy, une migration et une synchronisation — pour un réglage
// que personne ne partage.

const CLE = "ls-crm-vues";

export interface VueSauvee {
  nom: string;
  filtre: FiltreQualif;
}

export function lireVues(): VueSauvee[] {
  try {
    const brut = window.localStorage.getItem(CLE);
    if (!brut) return [];
    const lu = JSON.parse(brut) as unknown;
    if (!Array.isArray(lu)) return [];
    // Une vue écrite par une version antérieure ne doit pas faire planter la
    // page : on reconstruit chaque champ sur le vide plutôt que de faire
    // confiance à ce qui traîne.
    return lu
      .filter((v): v is VueSauvee => !!v && typeof (v as VueSauvee).nom === "string")
      .map((v) => ({
        nom: v.nom,
        filtre: {
          temperatures: Array.isArray(v.filtre?.temperatures) ? v.filtre.temperatures : [],
          signaux: Array.isArray(v.filtre?.signaux) ? v.filtre.signaux : [],
          objectifs: Array.isArray(v.filtre?.objectifs) ? v.filtre.objectifs : [],
        },
      }));
  } catch {
    return [];
  }
}

export function ecrireVues(vues: VueSauvee[]): void {
  try {
    window.localStorage.setItem(CLE, JSON.stringify(vues.slice(0, 12)));
  } catch {
    // Stockage plein ou refusé (navigation privée) : on ne casse pas la page
    // pour un raccourci de confort.
  }
}
