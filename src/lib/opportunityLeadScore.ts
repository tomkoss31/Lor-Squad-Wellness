// =============================================================================
// opportunityLeadScore — scoring du funnel Opportunité gated (chantier 2026-06).
// Brief : docs/BRIEF_OPPORTUNITE_GATED_2026-06.md §5
//
// Barème additif transparent → profil + score + température.
// Stocké dans prospect_leads.metadata (pas de migration en V1).
// =============================================================================

export type LeadProfile = "curious" | "side_income" | "career_change";
export type LeadTemperature = "hot" | "warm" | "cold";

export interface OpportunityScore {
  profile: LeadProfile | null;
  score: number;
  temperature: LeadTemperature;
}

const PROFILE_POINTS: Record<string, number> = {
  career_change: 3,
  side_income: 2,
  curious: 0,
};
const HOURS_POINTS: Record<string, number> = {
  "10p": 3,
  "5_10": 2,
  "2_5": 1,
  lt2: 0,
};
const NETWORK_LOVE_POINTS: Record<string, number> = { beaucoup: 2, depend: 1, peu: 0 };
const NETWORK_KNOWS_POINTS: Record<string, number> = { plein: 2, quelques: 1, pas: 0 };
const WHY_NOW_URGENT = new Set(["marre_job", "besoin_sous", "liberte"]);

export function scoreOpportunityLead(answers: Record<string, string>): OpportunityScore {
  let score = 0;
  const profile = (answers.profile as LeadProfile) || null;

  score += PROFILE_POINTS[answers.profile] ?? 0;
  score += HOURS_POINTS[answers.hours] ?? 0;
  score += NETWORK_LOVE_POINTS[answers.network_love] ?? 0;
  score += NETWORK_KNOWS_POINTS[answers.network_knows] ?? 0;
  if (WHY_NOW_URGENT.has(answers.why_now)) score += 2;
  if (answers.wants_visio === "semaine") score += 2;
  if (answers.product_affinity === "passionne") score += 1;

  const temperature: LeadTemperature = score >= 8 ? "hot" : score >= 4 ? "warm" : "cold";
  return { profile, score, temperature };
}

export const PROFILE_LABEL: Record<LeadProfile, string> = {
  curious: "🔍 Curieux",
  side_income: "💸 Complément",
  career_change: "🚀 Reconversion",
};

export const TEMPERATURE_META: Record<LeadTemperature, { label: string; emoji: string; color: string }> = {
  hot: { label: "Chaud", emoji: "🔥", color: "#E2484A" },
  warm: { label: "Tiède", emoji: "🟡", color: "#BA7517" },
  cold: { label: "Froid", emoji: "❄️", color: "#3F6DB0" },
};
