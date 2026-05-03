// =============================================================================
// FormationCalculatorPage — quick win #7 (2026-11-04)
//
// Strategy Plan Calculator — Projection 12 mois
// Port React natif du HTML standalone "calculateur-strategy-plan.html"
// fourni par Thomas. Logique calibree France (1 VP = 1.50€, marge 50%,
// 1 RO = 1.50€, Sup avg = 3500 VP).
//
// Refonte : passage de 8-4-1 a 5-3-1 (formule plus accessible).
//
// Inputs (sliders) :
//   - Nouveaux clients/mois (default 5, range 2-15)
//   - Recurrents qui repassent (default 3, range 0-10)
//   - Panier moyen VP (default 75, range 50-150)
//   - Nouveaux coachs (default 1, range 0-3)
//
// Outputs :
//   - 4 stats (VP M12, RO M12, Revenu M12, Cumul 12 mois)
//   - 5 badges rangs (Supervisor, World Team, GET, Millionaire, President's)
//   - Chart Recharts ComposedChart (Bar VP gold + Line RO teal)
//   - Tableau 12 mois detaille
//
// Vision multiplicateur : 1/5, 1/3, 1/2, 100%, 2x, 3x — applique a VP, RO,
// Revenu pour visualiser des scenarios "et si seulement..."
//
// Disclaimer DGCCRF/Herbalife obligatoire en bas.
// Theme-aware via var(--ls-*).
// =============================================================================

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RankPinBadge } from "../components/rank/RankPinBadge";
import { RANK_LABELS, type HerbalifeRank } from "../types/domain";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ─── Calibrage France (validé Thomas) ─────────────────────────────────────
const PRICE_VP = 1.5; // 1 VP = 1.50€ retail
const RETAIL_MARGIN = 0.5; // marge perso Supervisor 50%
const RO_VALUE = 1.5; // 1 RO point = 1.50€ commission
const SUP_AVG_VP = 3500; // VP moyen par superviseur en aval

// ─── Defaults 5-3-1 (refonte 2026-11-04) ──────────────────────────────────
const DEFAULTS = {
  newClients: 5,
  recurrentClients: 3,
  averageBasket: 75,
  newCoachs: 1,
};

const VISION_MULTIPLIERS = [
  { label: "1/5", value: 0.2 },
  { label: "1/3", value: 0.33 },
  { label: "1/2", value: 0.5 },
  { label: "100%", value: 1 },
  { label: "2x", value: 2 },
  { label: "3x", value: 3 },
];

/**
 * Échelle des paliers Herbalife affichés sous le chart, dans l'ordre
 * de progression. Refonte 2026-05-03 : passage de 5 → 9 paliers avec
 * pins officiels (Active Sup, Active WT, GET 2500, Millionaire 7500
 * en plus). Le pin de chaque palier est rendu via RankPinBadge.
 */
const RANK_LADDER: HerbalifeRank[] = [
  "success_builder_42", // 1000 PV qualifiant
  "supervisor_50", // 2500 PV + m≥2
  "active_supervisor_50", // Sup + maintien
  "world_team_50", // 1+ downline Sup + m≥3
  "active_world_team_50", // WT + downline solide
  "get_team_50", // 1000 RO
  "get_team_2500_50", // 2500 RO
  "millionaire_50", // 4000 RO
  "millionaire_7500_50", // 7500 RO
  "presidents_50", // 10 000 RO+
];

interface MonthData {
  m: number;
  vp: number;
  ro: number;
  rank: HerbalifeRank;
  revenue: number;
  sups: number;
}

interface ComputeParams {
  newC: number;
  recC: number;
  panier: number;
  coachC: number;
}

function compute(p: ComputeParams): MonthData[] {
  const { newC, recC, panier, coachC } = p;
  const months: MonthData[] = [];
  let n1 = 0;
  let n2 = 0;
  let n3 = 0;
  let cumulRec = 0;

  for (let m = 1; m <= 12; m++) {
    const personalVP = (newC + cumulRec) * panier;
    if (m >= 3) n1 += coachC * Math.max(2, Math.floor(m * 0.7));
    if (m >= 5) n2 += coachC * Math.max(1, Math.floor(m * 0.45));
    if (m >= 7) n3 += coachC * Math.max(1, Math.floor(m * 0.3));
    const totalSups = n1 + n2 + n3;
    const ro = Math.round(
      n1 * SUP_AVG_VP * 0.05 + n2 * SUP_AVG_VP * 0.04 + n3 * SUP_AVG_VP * 0.02,
    );
    const retailRevenue = personalVP * PRICE_VP * RETAIL_MARGIN;
    const royaltyRevenue = ro * RO_VALUE;
    const revenue = Math.round(retailRevenue + royaltyRevenue);

    // Logique progression Herbalife (validée Thomas) :
    // chaque palier override le précédent si conditions remplies.
    let rank: HerbalifeRank = "distributor_25";
    if (personalVP >= 1000) rank = "success_builder_42";
    if (personalVP >= 2500 && m >= 2) rank = "supervisor_50";
    if (personalVP >= 2500 && m >= 4) rank = "active_supervisor_50";
    if (m >= 3 && totalSups >= 1) rank = "world_team_50";
    if (m >= 5 && totalSups >= 2) rank = "active_world_team_50";
    if (ro >= 1000) rank = "get_team_50";
    if (ro >= 2500) rank = "get_team_2500_50";
    if (ro >= 4000) rank = "millionaire_50";
    if (ro >= 7500) rank = "millionaire_7500_50";
    if (ro >= 10000) rank = "presidents_50";

    months.push({ m, vp: Math.round(personalVP), ro, rank, revenue, sups: totalSups });
    cumulRec += recC;
  }
  return months;
}

function formatNumber(n: number): string {
  return n.toLocaleString("fr-FR");
}

function formatEur(n: number): string {
  return n.toLocaleString("fr-FR") + " €";
}

export function FormationCalculatorPage() {
  const navigate = useNavigate();

  const [newClients, setNewClients] = useState(DEFAULTS.newClients);
  const [recurrentClients, setRecurrentClients] = useState(DEFAULTS.recurrentClients);
  const [averageBasket, setAverageBasket] = useState(DEFAULTS.averageBasket);
  const [newCoachs, setNewCoachs] = useState(DEFAULTS.newCoachs);
  const [visionMult, setVisionMult] = useState(1);

  const data = useMemo<MonthData[]>(() => {
    const raw = compute({
      newC: newClients,
      recC: recurrentClients,
      panier: averageBasket,
      coachC: newCoachs,
    });
    return raw.map((d) => ({
      ...d,
      vp: Math.round(d.vp * visionMult),
      ro: Math.round(d.ro * visionMult),
      revenue: Math.round(d.revenue * visionMult),
    }));
  }, [newClients, recurrentClients, averageBasket, newCoachs, visionMult]);

  const last = data[11];
  const cumul = useMemo(() => data.reduce((a, b) => a + b.revenue, 0), [data]);

  const reachedRanks = useMemo<Set<HerbalifeRank>>(() => {
    const reached = new Set<HerbalifeRank>(data.map((d) => d.rank));
    // Downward unlock : si on atteint un haut palier, tous les paliers
    // précédents sont considérés atteints (logique cumulative).
    const idxMax = Math.max(
      ...data.map((d) => RANK_LADDER.indexOf(d.rank)).filter((i) => i >= 0),
      -1,
    );
    if (idxMax >= 0) {
      for (let i = 0; i <= idxMax; i++) {
        reached.add(RANK_LADDER[i]);
      }
    }
    return reached;
  }, [data]);

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "24px 16px 60px",
        fontFamily: "DM Sans, sans-serif",
        background: "var(--ls-bg)",
        color: "var(--ls-text)",
      }}
    >
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate("/formation")}
          style={{
            background: "transparent",
            border: "0.5px solid var(--ls-border)",
            color: "var(--ls-text-muted)",
            padding: "8px 14px",
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "DM Sans, sans-serif",
            marginBottom: 24,
          }}
        >
          ← Retour à Formation
        </button>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <p
            style={{
              fontSize: 11,
              color: "var(--ls-gold)",
              margin: 0,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            ✦ Formule 5-3-1 · Lor&apos;Squad Académie · Calibré France
          </p>
          <h1
            style={{
              fontFamily: "Syne, serif",
              fontWeight: 800,
              fontSize: "clamp(22px, 4vw, 32px)",
              letterSpacing: "-0.02em",
              color: "var(--ls-text)",
              margin: "10px 0 6px 0",
            }}
          >
            Strategy Plan —{" "}
            <span
              style={{
                background: "linear-gradient(90deg, var(--ls-gold) 0%, var(--ls-teal) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Projection 12 mois
            </span>
          </h1>
          <p style={{ fontSize: 13, color: "var(--ls-text-muted)", margin: 0 }}>
            Visualise ton plan d&apos;action chiffré sur 12 mois selon ta cadence d&apos;activité.
          </p>
        </div>

        {/* CARD 1 : Paramètres mensuels */}
        <Card>
          <CardTitle>Tes paramètres mensuels</CardTitle>
          <SliderRow
            label="Nouveaux clients"
            value={newClients}
            onChange={setNewClients}
            min={2}
            max={15}
            step={1}
          />
          <SliderRow
            label="Récurrents qui repassent"
            value={recurrentClients}
            onChange={setRecurrentClients}
            min={0}
            max={10}
            step={1}
          />
          <SliderRow
            label="Panier moyen (VP)"
            value={averageBasket}
            onChange={setAverageBasket}
            min={50}
            max={150}
            step={5}
          />
          <SliderRow
            label="Nouveaux coachs"
            value={newCoachs}
            onChange={setNewCoachs}
            min={0}
            max={3}
            step={1}
          />
        </Card>

        {/* CARD 2 : Vision + outputs */}
        <Card>
          <CardTitle>Vision — et si seulement…</CardTitle>

          {/* Boutons multiplicateur */}
          <div
            style={{
              display: "flex",
              gap: 6,
              margin: "4px 0 22px",
              flexWrap: "wrap",
            }}
          >
            {VISION_MULTIPLIERS.map((m) => {
              const active = visionMult === m.value;
              return (
                <button
                  key={m.label}
                  type="button"
                  onClick={() => setVisionMult(m.value)}
                  style={{
                    flex: "1 1 80px",
                    padding: "9px 6px",
                    background: active ? "var(--ls-gold)" : "var(--ls-surface2)",
                    color: active ? "var(--ls-bg)" : "var(--ls-text-muted)",
                    border: active
                      ? "0.5px solid var(--ls-gold)"
                      : "0.5px solid color-mix(in srgb, var(--ls-gold) 25%, var(--ls-border))",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: "DM Sans, sans-serif",
                    cursor: "pointer",
                    transition: "all 200ms ease",
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Grille 4 stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 10,
              marginBottom: 20,
            }}
          >
            <Stat label="VP Mois 12" value={formatNumber(last.vp)} sub="volume perso" tone="gold" />
            <Stat label="RO Mois 12" value={formatNumber(last.ro)} sub="royalty pts" tone="teal" />
            <Stat label="Revenu Mois 12*" value={formatEur(last.revenue)} sub="total estimé" tone="gold" />
            <Stat label="Cumul 12 mois*" value={formatEur(cumul)} sub="€ total" tone="gold" />
          </div>

          {/* Badges rangs : pins Herbalife officiels selon progression
              calculée. Refonte 2026-05-03 : 10 paliers (vs 5) + pins visuels. */}
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              justifyContent: "center",
              margin: "14px 0 22px",
              padding: "14px 10px",
              background: "var(--ls-surface)",
              border: "0.5px solid var(--ls-border)",
              borderRadius: 14,
            }}
          >
            {RANK_LADDER.map((rank, idx) => {
              const on = reachedRanks.has(rank);
              return (
                <div
                  key={rank}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 6px",
                    borderRadius: 10,
                    opacity: on ? 1 : 0.32,
                    filter: on ? "none" : "grayscale(0.6)",
                    transition: "all 400ms ease",
                    minWidth: 64,
                  }}
                >
                  <RankPinBadge rank={rank} size="sm" glow={on && idx === RANK_LADDER.findIndex((r) => reachedRanks.has(r) === false) - 1} />
                  <div
                    style={{
                      fontSize: 8.5,
                      letterSpacing: 0.4,
                      textTransform: "uppercase",
                      fontFamily: "DM Sans, sans-serif",
                      fontWeight: 700,
                      color: on ? "var(--ls-text)" : "var(--ls-text-hint)",
                      textAlign: "center",
                      lineHeight: 1.15,
                      maxWidth: 64,
                    }}
                  >
                    {RANK_LABELS[rank].replace(/\s*\(\d+%\)\s*$/, "").replace(/^Millionaire 7 500 RO$/, "Mil. 7500").replace(/^G\.E\.T\. 2 500 RO$/, "GET 2500")}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Légende chart */}
          <div
            style={{
              display: "flex",
              gap: 18,
              fontSize: 11,
              color: "var(--ls-text-muted)",
              margin: "8px 0",
              flexWrap: "wrap",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  background: "var(--ls-gold)",
                }}
              />
              VP perso (axe gauche)
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  background: "var(--ls-teal)",
                }}
              />
              Royalty Overrides (axe droit)
            </span>
          </div>

          {/* Chart Recharts ComposedChart */}
          <div style={{ height: 240, marginBottom: 20 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="color-mix(in srgb, var(--ls-text) 6%, transparent)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="m"
                  tickFormatter={(v) => `M${v}`}
                  tick={{ fill: "var(--ls-text-hint)", fontSize: 10 }}
                  axisLine={{ stroke: "var(--ls-border)" }}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: "var(--ls-gold)", fontSize: 9 }}
                  axisLine={{ stroke: "var(--ls-border)" }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: "var(--ls-teal)", fontSize: 9 }}
                  axisLine={{ stroke: "var(--ls-border)" }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--ls-surface)",
                    border: "1px solid var(--ls-gold)",
                    borderRadius: 8,
                    fontFamily: "DM Sans, sans-serif",
                    fontSize: 12,
                  }}
                  labelFormatter={(v) => `Mois ${v}`}
                  formatter={(value, name) => [
                    formatNumber(Number(value ?? 0)),
                    String(name) === "vp" ? "VP perso" : "Royalty Overrides",
                  ]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="vp"
                  fill="var(--ls-gold)"
                  radius={[3, 3, 0, 0]}
                  barSize={22}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="ro"
                  stroke="var(--ls-teal)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--ls-teal)" }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Tableau 12 mois */}
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12,
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              <thead>
                <tr>
                  {["Mois", "VP", "RO", "Rang"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        color: "var(--ls-text-muted)",
                        fontWeight: 500,
                        padding: "8px 10px",
                        borderBottom: "0.5px solid var(--ls-border)",
                        fontSize: 10,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                  <th
                    style={{
                      textAlign: "right",
                      color: "var(--ls-text-muted)",
                      fontWeight: 500,
                      padding: "8px 10px",
                      borderBottom: "0.5px solid var(--ls-border)",
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                    }}
                  >
                    Revenu*
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.m}>
                    <td
                      style={{
                        padding: "9px 10px",
                        borderBottom: "0.5px solid color-mix(in srgb, var(--ls-text) 4%, transparent)",
                        color: "var(--ls-text)",
                      }}
                    >
                      M{d.m}
                    </td>
                    <td
                      style={{
                        padding: "9px 10px",
                        borderBottom: "0.5px solid color-mix(in srgb, var(--ls-text) 4%, transparent)",
                        color: "var(--ls-gold)",
                        fontWeight: 600,
                      }}
                    >
                      {formatNumber(d.vp)}
                    </td>
                    <td
                      style={{
                        padding: "9px 10px",
                        borderBottom: "0.5px solid color-mix(in srgb, var(--ls-text) 4%, transparent)",
                        color: "var(--ls-teal)",
                        fontWeight: 600,
                      }}
                    >
                      {formatNumber(d.ro)}
                    </td>
                    <td
                      style={{
                        padding: "9px 10px",
                        borderBottom: "0.5px solid color-mix(in srgb, var(--ls-text) 4%, transparent)",
                        color: "var(--ls-text-muted)",
                        fontSize: 10.5,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <RankPinBadge rank={d.rank} size="xs" />
                        <span>{RANK_LABELS[d.rank].replace(/\s*\(\d+%\)\s*$/, "")}</span>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "9px 10px",
                        borderBottom: "0.5px solid color-mix(in srgb, var(--ls-text) 4%, transparent)",
                        color: "var(--ls-text)",
                        fontWeight: 600,
                        textAlign: "right",
                      }}
                    >
                      {formatEur(d.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Disclaimer DGCCRF / Herbalife */}
        <div
          style={{
            fontSize: 10.5,
            color: "var(--ls-text-muted)",
            lineHeight: 1.7,
            padding: "14px 16px",
            borderLeft: "2px solid var(--ls-gold)",
            background: "var(--ls-surface2)",
            borderRadius: "0 8px 8px 0",
            fontFamily: "DM Sans, sans-serif",
            marginTop: 16,
          }}
        >
          <strong style={{ color: "var(--ls-gold)" }}>
            *Avertissement réglementaire (DGCCRF / Herbalife)
          </strong>{" "}
          — Les montants présentés sont donnés à titre illustratif et ne constituent en aucun cas
          une garantie de résultats. Les résultats réels dépendent du temps et des efforts que
          chaque distributeur consacre à son activité indépendante. Un travail acharné permet
          d&apos;obtenir des résultats exceptionnels. La plupart des distributeurs génèrent un revenu
          supplémentaire. Pour les chiffres officiels, consultez{" "}
          <a
            href="https://www.herbalife.com/STE"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--ls-gold)" }}
          >
            Herbalife.com/STE
          </a>{" "}
          (Statement of Average Gross Compensation). Calibrage : 1 VP = 1,50 € · marge perso 50% ·
          1 RO = 1,50 €.
        </div>

        {/* Footer */}
        <p
          style={{
            textAlign: "center",
            marginTop: 28,
            fontSize: 10,
            color: "var(--ls-text-hint)",
            letterSpacing: "0.05em",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          LOR&apos;SQUAD ACADÉMIE · STRATEGY PLAN CALCULATOR V1
        </p>
      </div>
    </div>
  );
}

// ─── Sous-composants ────────────────────────────────────────────────────────
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--ls-surface)",
        border: "0.5px solid color-mix(in srgb, var(--ls-gold) 22%, var(--ls-border))",
        borderRadius: 14,
        padding: "20px 22px",
        marginBottom: 14,
      }}
    >
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        fontSize: 11,
        fontWeight: 700,
        margin: "0 0 16px 0",
        color: "var(--ls-gold)",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      {children}
    </h3>
  );
}

function SliderRow({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        marginBottom: 12,
        flexWrap: "wrap",
      }}
    >
      <label
        style={{
          flex: "0 0 170px",
          color: "var(--ls-text)",
          fontSize: 13,
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        {label}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1, minWidth: 140, accentColor: "var(--ls-gold)" }}
      />
      <span
        style={{
          flex: "0 0 60px",
          textAlign: "right",
          color: "var(--ls-teal)",
          fontWeight: 700,
          fontSize: 14,
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "gold" | "teal";
}) {
  const color = tone === "gold" ? "var(--ls-gold)" : "var(--ls-teal)";
  return (
    <div
      style={{
        background: "var(--ls-surface2)",
        border: `0.5px solid color-mix(in srgb, ${color} 25%, var(--ls-border))`,
        borderRadius: 10,
        padding: 14,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "var(--ls-text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 6,
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontFamily: "Syne, serif",
          fontWeight: 800,
          color,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 10,
          color: "var(--ls-text-hint)",
          marginTop: 4,
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        {sub}
      </div>
    </div>
  );
}
