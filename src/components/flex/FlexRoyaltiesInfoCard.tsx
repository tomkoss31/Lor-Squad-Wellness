// =============================================================================
// FlexRoyaltiesInfoCard — info passive royalties Supervisor+ (V3.b, 2026-11-05)
//
// Carte purement informative affichée sur /flex pour les distri Sup+ qui
// ont droit à des royalties downline. NE rentre PAS dans le calcul des
// cibles FLEX (qui restent basées sur les ventes directes uniquement).
//
// Plan marketing Herbalife V1 :
//   - Supervisor / WT       : 5% RO sur 3 niveaux de Sup en L1
//   - GET                   : 5% RO + 2% bonus à 1000 RO infini
//   - Millionaire           : 5% RO + 4% bonus à 4000 RO infini
//   - President's           : 5% RO + 6% bonus à 10000 RO infini
//
// Hidden si rang < Supervisor (les rangs SC/SB n'ont pas de RO).
// =============================================================================

import type { HerbalifeRank } from "../../types/domain";

interface Props {
  rank: HerbalifeRank;
}

const COPY: Partial<Record<HerbalifeRank, { lines: string[] }>> = {
  supervisor_50: {
    lines: [
      "5 % RO (Royalty Override) sur 3 niveaux de Supervisor sous toi (L1).",
      "À partir de 1 Sup actif en L1, tu touches sur ses ventes downline.",
    ],
  },
  world_team_50: {
    lines: [
      "5 % RO sur 3 niveaux de Sup en L1.",
      "Bonus de production active reconnu en événement Herbalife.",
    ],
  },
  get_team_50: {
    lines: [
      "5 % RO sur 3 niveaux de Sup en L1.",
      "+ 2 % de bonus à l'infini sur ton organisation, dès 1 000 RO.",
    ],
  },
  millionaire_50: {
    lines: [
      "5 % RO sur 3 niveaux de Sup en L1.",
      "+ 4 % de bonus à l'infini, dès 4 000 RO.",
    ],
  },
  presidents_50: {
    lines: [
      "5 % RO sur 3 niveaux de Sup en L1.",
      "+ 6 % de bonus à l'infini, dès 10 000 RO. Ligue d'élite mondiale.",
    ],
  },
};

export function FlexRoyaltiesInfoCard({ rank }: Props) {
  const copy = COPY[rank];
  if (!copy) return null;

  return (
    <div
      style={{
        background: "color-mix(in srgb, var(--ls-purple) 8%, var(--ls-surface))",
        border: "0.5px solid color-mix(in srgb, var(--ls-purple) 35%, transparent)",
        borderRadius: 14,
        padding: "16px 18px",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontFamily: "DM Sans, sans-serif",
          textTransform: "uppercase",
          letterSpacing: 1.2,
          color: "var(--ls-purple)",
          marginBottom: 8,
        }}
      >
        💎 Tes revenus passifs (hors FLEX)
      </div>
      <h3
        style={{
          margin: 0,
          fontFamily: "Syne, sans-serif",
          fontSize: 16,
          fontWeight: 700,
          color: "var(--ls-text)",
          marginBottom: 10,
        }}
      >
        En plus de tes ventes directes
      </h3>
      <ul
        style={{
          margin: 0,
          paddingLeft: 18,
          fontSize: 12,
          color: "var(--ls-text-muted)",
          fontFamily: "DM Sans, sans-serif",
          lineHeight: 1.65,
        }}
      >
        {copy.lines.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
      <p
        style={{
          margin: "10px 0 0 0",
          fontSize: 10,
          color: "var(--ls-text-muted)",
          fontFamily: "DM Sans, sans-serif",
          fontStyle: "italic",
        }}
      >
        Ces revenus dépendent de l'activité de ton équipe et ne sont pas
        modélisés dans tes cibles FLEX (qui couvrent uniquement tes ventes
        directes).
      </p>
    </div>
  );
}
