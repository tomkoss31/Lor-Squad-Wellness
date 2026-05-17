// =============================================================================
// businessSimulator — Calcul du plan business pour /business (chantier #7 V2)
// =============================================================================
//
// Logique extraite du mockup Claude Design business-v2.html (2026-05-17).
// 5 paliers (Distri < 200 / SC < 500 / SB < 1500 / Sup < 5000 / TAB >= 5000)
// avec marge dynamique selon palier visé + buffer churn 1.2.
//
// Hypotheses (footnote affichee a l'utilisateur) :
//   - Prix moyen programme : 200 EUR retail
//   - Marge : dynamique selon palier visé (25 / 35 / 42 / 50 / 50+5 %)
//   - Engagement client : 1 programme par mois
//   - Taux conversion prospect -> client : 25%
//   - Buffer churn : 20%
// =============================================================================

export const AVG_PROGRAM_PRICE = 200;
export const PROGRAMS_PER_CLIENT_MONTH = 1;
export const PROSPECT_TO_CLIENT_RATIO = 0.25;
export const CHURN_BUFFER = 1.2;

export const PRESET_AMOUNTS = [100, 300, 500, 1000] as const;
export const PRESET_MONTHS = [3, 6, 12] as const;

export const TRACK_SCALE_MAX = 2000; // pour positionner le marker sur la lane horizontale

export type TierKey = "distri" | "sc" | "sb" | "sup" | "tab";
export type MedalKey = "sc" | "sb" | "sup";

export interface TierInfo {
  key: TierKey;
  name: string;
  marginLabel: string;
  marginPct: number;
  medal: MedalKey;
}

export interface SimulationResult {
  programsPerMonth: number;
  clientsNeeded: number;
  prospectsPerMonth: number;
  tier: TierInfo;
  trackPosition: number; // 0-100 sur la scale TRACK_SCALE_MAX
}

export function computeTier(target: number): TierInfo {
  if (target < 200) {
    return { key: "distri", name: "Distributeur", marginLabel: "25 %", marginPct: 0.25, medal: "sc" };
  }
  if (target < 500) {
    return { key: "sc", name: "Success Coach", marginLabel: "35 %", marginPct: 0.35, medal: "sc" };
  }
  if (target < 1500) {
    return { key: "sb", name: "Success Builder", marginLabel: "42 %", marginPct: 0.42, medal: "sb" };
  }
  if (target < 5000) {
    return { key: "sup", name: "Supervisor", marginLabel: "50 %", marginPct: 0.5, medal: "sup" };
  }
  return { key: "tab", name: "TAB Team", marginLabel: "50 % + bonus", marginPct: 0.5, medal: "sup" };
}

export function simulate(target: number): SimulationResult {
  const tier = computeTier(target);
  const marginPerProgram = AVG_PROGRAM_PRICE * tier.marginPct;
  const programsPerMonth = Math.max(1, Math.ceil(target / marginPerProgram));
  const clientsNeeded = Math.max(
    1,
    Math.ceil((programsPerMonth / PROGRAMS_PER_CLIENT_MONTH) * CHURN_BUFFER),
  );
  const prospectsPerMonth = Math.max(1, Math.ceil(clientsNeeded / PROSPECT_TO_CLIENT_RATIO));
  const trackPosition = (Math.min(target, TRACK_SCALE_MAX) / TRACK_SCALE_MAX) * 100;
  return { programsPerMonth, clientsNeeded, prospectsPerMonth, tier, trackPosition };
}

export function clampCustomTarget(raw: number): number {
  if (Number.isNaN(raw) || raw <= 0) return 0;
  return Math.min(10000, Math.max(50, raw));
}
