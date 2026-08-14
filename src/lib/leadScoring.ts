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

export interface UnifiedLeadScore {
  /** 0-10, comparable entre toutes les sources. Sert au tri. */
  score: number;
  temperature: LeadTemperature;
  /** En trois mots, ce qui rend ce lead chaud ou froid. Affiché à côté de la
   *  température — un nombre sur 10 ne dit pas quoi faire, une raison si. */
  raison: string;
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
    return { score, temperature, raison: "questionnaire" };
  }

  const jours = joursDepuis(lead.createdAt);
  const jamaisContacte = !lead.contactedAt && lead.status === "new";

  // ── Ce qu'il a FAIT. Deux gestes décident à eux seuls, parce qu'ils ne
  //    laissent aucun doute sur l'intention.
  if (lead.abandonAvantCreneau && jours <= 14) {
    return { score: 10, temperature: "hot", raison: "parti sans créneau" };
  }
  if (lead.rdvLabel) {
    return { score: 9, temperature: "hot", raison: "rendez-vous pris" };
  }
  if (lead.callbackRequestedAt) {
    return { score: 9, temperature: "hot", raison: "a demandé à être rappelé" };
  }

  // ── Sinon, un barème court. Chaque ligne doit pouvoir s'expliquer en une
  //    phrase à quelqu'un qui n'a jamais ouvert le code.
  let raw = 0;
  const motifs: string[] = [];

  // Quand. C'est le signal le plus fort après l'action : une demande du jour
  // se rappelle le jour même, une demande de mars ne se rappelle plus pareil.
  if (jours <= 2) { raw += 4; motifs.push("tout frais"); }
  else if (jours <= 7) { raw += 2; motifs.push("cette semaine"); }
  else if (jours > 60 && jamaisContacte) { raw -= 2; motifs.push("jamais rappelé depuis 2 mois"); }
  else if (jours > 30 && jamaisContacte) { raw -= 1; motifs.push("en attente depuis 1 mois"); }

  // Comment le joindre.
  if (lead.contactIsPhone) { raw += 3; motifs.push("a laissé son numéro"); }
  else if (lead.contact) { raw += 1; motifs.push("a laissé son email"); }

  // La confiance d'un client qui le recommande vaut mieux qu'un formulaire.
  if (lead.viaName) { raw += 2; motifs.push("recommandé"); }

  // Déjà en mouvement.
  if (lead.status === "qualified") { raw += 3; motifs.push("qualifié"); }
  else if (lead.status === "contacted") { raw += 2; motifs.push("déjà contacté"); }

  if (lead.relanceDue) { raw += 1; motifs.push("relance due"); }

  // Motivation déclarée sur le bilan online (0-10 → 0-3).
  if (typeof lead.bilanMotivation === "number") {
    const m = Math.round((lead.bilanMotivation / 10) * 3);
    if (m > 0) { raw += m; motifs.push(`motivation ${lead.bilanMotivation}/10`); }
  }

  const score = clamp10(raw);
  return {
    score,
    temperature: scoreToTemperature(score),
    // Les deux motifs qui pèsent le plus, dans l'ordre où on les a ajoutés.
    raison: motifs.slice(0, 2).join(" · ") || "rien de plus à dire",
  };
}
