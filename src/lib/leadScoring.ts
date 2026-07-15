// =============================================================================
// leadScoring — score/température unifiés (0-10) pour n'importe quel CrmLead,
// toutes sources confondues.
//
// Chantier refonte CRM Liste/Pipeline/Fiche détail, Phase 3 (2026-07-16).
// Décision plan : pas de nouvelle colonne SQL — tout est calculé à la volée
// côté client. `opportunite` a déjà un scoring dédié (funnel gated, brief
// docs/BRIEF_OPPORTUNITE_GATED_2026-06.md) stocké en DB à la soumission — on
// le RÉUTILISE (renormalisé /15 → /10) plutôt que d'en calculer un second qui
// contredirait le funnel. Les autres sources n'ont pas de scoring existant :
// barème additif simple sur les signaux déjà présents dans CrmLead.
// =============================================================================

import type { CrmLead } from "../hooks/useCrmLeads";
import type { LeadTemperature } from "./opportunityLeadScore";

export type { LeadTemperature };

export interface UnifiedLeadScore {
  /** 0-10, comparable entre toutes les sources. */
  score: number;
  temperature: LeadTemperature;
}

/** Température — vocabulaire unique dans tout le CRM (Liste/Pipeline/Détail).
    Couleurs en `var(--ls-*)` (theme-safe), contrairement à
    `opportunityLeadScore.TEMPERATURE_META` qui reste en hex pour ne pas
    perturber le funnel gated existant. */
export const TEMP_META: Record<LeadTemperature, { emoji: string; label: string; color: string }> = {
  hot: { emoji: "🔥", label: "Chaud", color: "var(--ls-coral)" },
  warm: { emoji: "🌤️", label: "Tiède", color: "var(--ls-gold)" },
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

/**
 * Score 0-10 + température d'un lead, quelle que soit sa source.
 *
 * - `opportunite` : réutilise `funnelScore` (0-15, déjà en DB) renormalisé
 *   sur 10, et `funnelTemperature` si présent (sinon recalculée sur le score
 *   renormalisé — mêmes seuils que les autres sources, cohérence visuelle).
 * - Autres sources : barème additif sur les signaux disponibles au moment du
 *   lead — contact exploitable, ville (RDV présentiel possible), recommandé
 *   par un client connu (confiance transmise), déjà en mouvement (contacté/
 *   qualifié), relance encore due (intérêt pas retombé), motivation déclarée
 *   (bilan online). Poids volontairement simples et centralisés ici — à
 *   ajuster si besoin, pas de logique dupliquée ailleurs.
 */
export function computeLeadScore(lead: CrmLead): UnifiedLeadScore {
  if (lead.source === "opportunite" && typeof lead.funnelScore === "number") {
    const score = clamp10((lead.funnelScore / 15) * 10);
    const temperature = (lead.funnelTemperature as LeadTemperature) || scoreToTemperature(score);
    return { score, temperature };
  }

  let raw = 0;
  if (lead.contactIsPhone) raw += 2;
  else if (lead.contact) raw += 1;
  if (lead.city) raw += 1;
  if (lead.viaName) raw += 2;
  if (lead.status === "contacted" || lead.status === "qualified") raw += 2;
  if (lead.status === "qualified") raw += 1;
  if (lead.relanceDue) raw += 1;
  if (typeof lead.bilanMotivation === "number") raw += Math.round((lead.bilanMotivation / 10) * 3);

  const score = clamp10(raw);
  return { score, temperature: scoreToTemperature(score) };
}
