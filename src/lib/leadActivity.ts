// =============================================================================
// leadActivity — badge de stagnation ⏳ Nj pour un CrmLead.
//
// Chantier refonte CRM Liste/Pipeline/Fiche détail, Phase 3 (2026-07-16).
// Proxy « dernière activité » = contactedAt ?? createdAt, sauf client_referrals
// qui n'a ni l'une ni l'autre colonne contacted_at en base (confirmé par
// requête SQL 2026-07-16) — contactedAt y est toujours null, donc le fallback
// createdAt s'applique naturellement, pas de cas spécial à coder.
// =============================================================================

import type { CrmLead } from "../hooks/useCrmLeads";

const MS_PER_DAY = 86_400_000;

export function lastActivityAt(lead: CrmLead): string {
  return lead.contactedAt ?? lead.createdAt;
}

export function stagnationDays(lead: CrmLead): number {
  const t = new Date(lastActivityAt(lead)).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / MS_PER_DAY));
}

/**
 * Un lead « vivant » (pas converti/perdu/endormi) sans mouvement récent.
 * Seuil différencié : un lead tout juste reçu (new) a plus de marge (3j)
 * qu'un lead déjà contacté qui traîne (2j) — une fois le 1er contact fait,
 * on veut être alerté plus vite pour ne pas laisser retomber un prospect
 * chaud.
 */
export function isStagnant(lead: CrmLead): boolean {
  if (lead.dormant || lead.status === "converted" || lead.status === "lost") return false;
  const threshold = lead.status === "new" ? 3 : 2;
  return stagnationDays(lead) >= threshold;
}
