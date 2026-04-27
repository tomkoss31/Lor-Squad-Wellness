// Chantier Academy direction 3 (2026-04-28).
// Helper de substitution de variables dans les titres et bodies des
// steps. Variables supportees : {firstName}, {fullName}, {coachName},
// {sponsorName}. Fallback : si une variable n est pas resolvable,
// on remplace par un placeholder neutre ("toi", "ton coach"...).

import type { User } from "../../../types/domain";

export interface TemplateVars {
  /** Prenom du user courant (1er mot de currentUser.name). */
  firstName?: string | null;
  /** Nom complet du user courant. */
  fullName?: string | null;
  /** Prenom du coach referent (resolu via coachReferentUserId). */
  coachName?: string | null;
  /** Nom du sponsor Herbalife (resolu via sponsorId match herbalife_id). */
  sponsorName?: string | null;
}

const FALLBACKS: Record<string, string> = {
  firstName: "toi",
  fullName: "toi",
  coachName: "ton coach",
  sponsorName: "ton sponsor",
};

/**
 * Substitue {var} par vars[var] dans `text`. Si var pas resolvable,
 * fallback ou placeholder generique.
 */
export function substituteTemplate(text: string, vars: TemplateVars): string {
  if (!text || typeof text !== "string") return text;
  return text.replace(/\{(\w+)\}/g, (_, key) => {
    const value = (vars as Record<string, string | null | undefined>)[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
    return FALLBACKS[key] ?? `{${key}}`;
  });
}

/**
 * Construit les TemplateVars a partir du currentUser + liste des users.
 * Coach name = prenom du user dont id === currentUser.coachReferentUserId.
 * Sponsor name = name du user dont herbalifeId === currentUser.sponsorId.
 */
export function buildTemplateVars(
  currentUser: User | null,
  users: User[],
): TemplateVars {
  if (!currentUser) {
    return {};
  }
  const firstName = currentUser.name?.split(/\s+/)[0] ?? null;
  const fullName = currentUser.name ?? null;

  let coachName: string | null = null;
  const coachId = (currentUser as User & { coachReferentUserId?: string }).coachReferentUserId;
  if (coachId) {
    const coach = users.find((u) => u.id === coachId);
    if (coach) {
      coachName = coach.name?.split(/\s+/)[0] ?? null;
    }
  }

  let sponsorName: string | null = null;
  if (currentUser.sponsorId) {
    const sponsor = users.find(
      (u) =>
        (u as User & { herbalifeId?: string }).herbalifeId?.toUpperCase() ===
        currentUser.sponsorId?.toUpperCase(),
    );
    if (sponsor) {
      sponsorName = sponsor.name?.split(/\s+/)[0] ?? null;
    }
  }

  return { firstName, fullName, coachName, sponsorName };
}
