// =============================================================================
// leadScoring — température d'un lead, toutes sources confondues.
//
// Chantier refonte CRM Liste/Pipeline/Fiche détail, Phase 3 (2026-07-16).
// Décision plan : pas de nouvelle colonne SQL — tout est calculé à la volée
// côté client. `opportunite` a déjà un scoring dédié (funnel gated, brief
// docs/BRIEF_OPPORTUNITE_GATED_2026-06.md) stocké en DB à la soumission — on
// le RÉUTILISE (renormalisé /15 → /10) plutôt que d'en calculer un second qui
// contredirait le funnel.
//
// ── REFONTE DU 2026-08-11 ────────────────────────────────────────────────────
//
// La fiche se contredisait. Laure laisse son numéro à 19 h 58 en voulant
// réserver au club, s'arrête avant de choisir son heure, et deux heures plus
// tard sa fiche affichait :
//
//     ⛔ A laissé ses coordonnées, puis n'a jamais choisi de créneau.
//     ❄️ Froid · 3/10
//
// Le bloc disait « rappelle-la maintenant », la puce disait « froid ». Le
// barème ne comptait que des signaux FIGÉS — un téléphone (+2), une ville (+1)
// — et ignorait les deux seules choses qui font vraiment la chaleur d'un lead :
// ce qu'il vient de FAIRE, et QUAND.
//
// Le nouveau barème part de là :
//   • ce qu'il a fait  → un rendez-vous pris, ou une réservation interrompue,
//                        décide à lui seul : c'est chaud, point.
//   • quand            → une demande d'aujourd'hui n'est pas une demande de
//                        mars. Le temps refroidit, y compris un bon lead.
//   • comment le joindre → un numéro vaut mieux qu'un email : on décroche.
//
// Retiré : la ville. Habiter Verdun ne dit rien de l'envie de quelqu'un — ça
// ne servait qu'à gonfler les scores de tout le monde de la même façon.
//
// Et la puce dit maintenant POURQUOI (« Chaud · sans créneau ») au lieu d'un
// nombre sur 10 que personne ne sait interpréter.
// =============================================================================

import type { CrmLead } from "../hooks/useCrmLeads";
import type { LeadTemperature } from "./opportunityLeadScore";

export type { LeadTemperature };

/** Une contribution au score, avec son montant sur 100 (ex. « tout frais » +40). */
export interface MotifScore {
  motif: string;
  points: number;
}

export interface UnifiedLeadScore {
  /** 0-10, comparable entre toutes les sources. Sert au TRI (ne pas changer). */
  score: number;
  /** Le même score sur 100, pour l'affichage (carte CRM Board V2). La maquette
   *  montre « 🔥 82 » : c'est cette échelle-là. */
  score100: number;
  temperature: LeadTemperature;
  /** En trois mots, ce qui rend ce lead chaud ou froid. Affiché à côté de la
   *  température — un nombre sur 10 ne dit pas quoi faire, une raison si. */
  raison: string;
  /** Le détail auditable du score, chaque contribution avec son montant /100.
   *  C'est la ligne « Pourquoi 82 : … (+30) · … (+20) » de la maquette. Vide
   *  pour les scores forfaitaires (funnel, geste décisif). */
  details: MotifScore[];
}

/** Température — vocabulaire unique dans tout le CRM (Liste/Pipeline/Détail).
    Couleurs en `var(--ls-*)` (theme-safe), contrairement à
    `opportunityLeadScore.TEMPERATURE_META` qui reste en hex pour ne pas
    perturber le funnel gated existant. */
export const TEMP_META: Record<LeadTemperature, { emoji: string; label: string; color: string }> = {
  hot: { emoji: "🔥", label: "Chaud", color: "var(--ls-coral)" },
  warm: { emoji: "🌤️", label: "Tiède", color: "var(--ls-teal)" },
  cold: { emoji: "❄️", label: "Froid", color: "var(--ls-text-muted)" },
};

function clamp10(n: number): number {
  return Math.max(0, Math.min(10, Math.round(n)));
}

function scoreToTemperature(score: number): LeadTemperature {
  if (score >= 7) return "hot";
  if (score >= 4) return "warm";
  return "cold";
}

/** Jours écoulés depuis l'arrivée du lead. */
function joursDepuis(iso: string | null | undefined): number {
  if (!iso) return 999;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 999;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

export function computeLeadScore(lead: CrmLead): UnifiedLeadScore {
  // ── Le funnel Opportunité a son propre score, calculé à la soumission sur
  //    les réponses au questionnaire. On ne le recalcule pas : deux scores qui
  //    se contredisent seraient pires qu'un seul imparfait.
  if (lead.source === "opportunite" && typeof lead.funnelScore === "number") {
    const score = clamp10((lead.funnelScore / 15) * 10);
    const temperature = (lead.funnelTemperature as LeadTemperature) || scoreToTemperature(score);
    return { score, score100: score * 10, temperature, raison: "questionnaire", details: [] };
  }

  const jours = joursDepuis(lead.createdAt);
  const jamaisContacte = !lead.contactedAt && lead.status === "new";

  // ── Ce qu'il a FAIT. Deux gestes décident à eux seuls, parce qu'ils ne
  //    laissent aucun doute sur l'intention.
  if (lead.abandonAvantCreneau && jours <= 14) {
    return { score: 10, score100: 100, temperature: "hot", raison: "parti sans créneau", details: [{ motif: "parti sans réserver de créneau", points: 100 }] };
  }
  if (lead.rdvLabel) {
    return { score: 9, score100: 90, temperature: "hot", raison: "rendez-vous pris", details: [{ motif: "rendez-vous déjà pris", points: 90 }] };
  }
  if (lead.callbackRequestedAt) {
    return { score: 9, score100: 90, temperature: "hot", raison: "a demandé à être rappelé", details: [{ motif: "a demandé à être rappelé", points: 90 }] };
  }

  // ── Sinon, un barème court. Chaque ligne doit pouvoir s'expliquer en une
  //    phrase à quelqu'un qui n'a jamais ouvert le code.
  let raw = 0;
  const motifs: string[] = [];
  const details: MotifScore[] = [];
  // Chaque contribution est enregistrée AVEC son montant /100 (le poids /10 ×10).
  const add = (points: number, motif: string) => { raw += points; motifs.push(motif); details.push({ motif, points: points * 10 }); };

  // Quand. C'est le signal le plus fort après l'action : une demande du jour
  // se rappelle le jour même, une demande de mars ne se rappelle plus pareil.
  if (jours <= 2) add(4, "tout frais");
  else if (jours <= 7) add(2, "cette semaine");
  else if (jours > 60 && jamaisContacte) add(-2, "jamais rappelé depuis 2 mois");
  else if (jours > 30 && jamaisContacte) add(-1, "en attente depuis 1 mois");

  // Comment le joindre.
  if (lead.contactIsPhone) add(3, "a laissé son numéro");
  else if (lead.contact) add(1, "a laissé son email");

  // La confiance d'un client qui le recommande vaut mieux qu'un formulaire.
  if (lead.viaName) add(2, "recommandé");

  // Déjà en mouvement.
  if (lead.status === "qualified") add(3, "qualifié");
  else if (lead.status === "contacted") add(2, "déjà contacté");

  if (lead.relanceDue) add(1, "relance due");

  // Motivation déclarée sur le bilan online (0-10 → 0-3).
  if (typeof lead.bilanMotivation === "number") {
    const m = Math.round((lead.bilanMotivation / 10) * 3);
    if (m > 0) add(m, `motivation ${lead.bilanMotivation}/10`);
  }

  const score = clamp10(raw);
  return {
    score,
    // Le clamp ne bride qu'au-delà de raw=10 (rare) ; en dessous, la somme des
    // details ×10 = score100 exactement — c'est ce qui rend « Pourquoi 82 »
    // arithmétiquement juste dans le cas courant.
    score100: Math.max(0, Math.min(100, raw * 10)),
    temperature: scoreToTemperature(score),
    raison: motifs.slice(0, 2).join(" · ") || "rien de plus à dire",
    // Les contributions positives, de la plus forte à la plus faible.
    details: details.filter((d) => d.points > 0).sort((a, b) => b.points - a.points),
  };
}
