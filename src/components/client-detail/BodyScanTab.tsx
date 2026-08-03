// =============================================================================
// BodyScanTab — onglet « Mesures » de la fiche client, version 2 (2026-08-03).
//
// POURQUOI : l'onglet faisait 13,1 écrans de haut sur un iPhone. Il empilait
// 4 cartes « Lecture body scan » EN MÊME TEMPS (masse grasse, muscle,
// hydratation, âge métabolique) alors qu'on n'en lit qu'une à la fois, plus un
// radar, un tableau et le panneau mensurations.
//
// PRINCIPE : une métrique à la fois. On choisit un indicateur (tuile ou chip),
// la courbe ET la lecture suivent. Le reste est replié, à un clic.
//
// ⚠️ RIEN N'EST SUPPRIMÉ et AUCUN CALCUL N'EST TOUCHÉ : les 4 cartes d'insight
// sont les mêmes composants qu'avant, avec exactement les mêmes props ; le
// radar et le tableau sont intacts, juste repliés. C'est de la réorganisation
// d'affichage, pas un changement de logique.
// =============================================================================

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BodyFatInsightCard } from "../body-scan/BodyFatInsightCard";
import { BodyScanRadar } from "../body-scan/BodyScanRadar";
import { HydrationVisceralInsightCard } from "../body-scan/HydrationVisceralInsightCard";
import { MetabolicAgeInsightCard } from "../body-scan/MetabolicAgeInsightCard";
import { MuscleMassInsightCard } from "../body-scan/MuscleMassInsightCard";
import { Card } from "../ui/Card";
import { getEffectiveAge } from "../../lib/age";
import { formatDate } from "../../lib/calculations";
import type { AssessmentRecord, BodyScanMetrics, Client } from "../../types/domain";

type MetricKey = "weight" | "bodyFat" | "muscleMass" | "hydration" | "visceralFat" | "metabolicAge";

interface MetricDef {
  key: MetricKey;
  /** Libellé court (tuile + chip). */
  label: string;
  unit: string;
  /** Accent — teal / coral / lime / violet, l'identité de l'app. */
  color: string;
  decimals: number;
  /** true = monter est bon (muscle, hydratation). */
  higherIsBetter: boolean;
}

const METRICS: MetricDef[] = [
  { key: "weight", label: "Poids", unit: "kg", color: "var(--ls-teal)", decimals: 1, higherIsBetter: false },
  { key: "bodyFat", label: "Masse grasse", unit: "%", color: "var(--ls-coral)", decimals: 1, higherIsBetter: false },
  { key: "muscleMass", label: "Muscle", unit: "kg", color: "var(--ls-lime)", decimals: 1, higherIsBetter: true },
  { key: "hydration", label: "Hydratation", unit: "%", color: "var(--ls-violet, #A78BFA)", decimals: 1, higherIsBetter: true },
  { key: "visceralFat", label: "Graisse visc.", unit: "", color: "var(--ls-teal)", decimals: 0, higherIsBetter: false },
  { key: "metabolicAge", label: "Âge méta.", unit: "ans", color: "var(--ls-lime)", decimals: 0, higherIsBetter: false }
];

function fmt(value: number, decimals: number): string {
  return decimals > 0 ? value.toFixed(decimals).replace(/\.0$/, "") : String(Math.round(value));
}

// ─── Courbe ─────────────────────────────────────────────────────────────────
// SVG maison plutôt que recharts : on veut la valeur écrite sur CHAQUE point
// et la date en dessous (demande Thomas 2026-08-03), ce que la version
// « sparkline » ne montrait pas. Léger, sans dépendance ajoutée.
function MetricChart({
  points,
  color,
  decimals
}: {
  points: { date: string; value: number }[];
  color: string;
  decimals: number;
}) {
  const W = 340;
  const H = 176;
  const PT = 28;
  const PB = 34;
  const PL = 38;
  const PR = 18;

  if (points.length < 2) {
    return (
      <p className="py-6 text-center text-sm text-[var(--ls-text-muted)]">
        Il faut au moins deux relevés pour tracer une courbe.
      </p>
    );
  }

  const values = points.map((p) => p.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  const pad = (max - min) * 0.25 || 1;
  min -= pad;
  max += pad;

  const x = (i: number) => PL + i * ((W - PL - PR) / (points.length - 1));
  const y = (v: number) => PT + (1 - (v - min) / (max - min)) * (H - PT - PB);
  const coords = points.map((p, i) => ({ x: x(i), y: y(p.value) }));

  const line = coords.map((c, i) => `${i ? "L" : "M"}${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  const area = `${line} L${coords[coords.length - 1].x.toFixed(1)} ${H - PB} L${coords[0].x.toFixed(1)} ${H - PB} Z`;
  const gradientId = `bs-grad-${color.replace(/[^a-z0-9]/gi, "")}`;

  // 3 repères horizontaux + échelle : on lit une valeur sans deviner.
  const guides = [0, 0.5, 1].map((ratio) => {
    const value = min + (max - min) * (1 - ratio);
    return { value, y: y(value) };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Courbe d'évolution">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {guides.map((g, i) => (
        <g key={i}>
          <line x1={PL} y1={g.y} x2={W - PR} y2={g.y} stroke="var(--ls-border)" strokeWidth="1" />
          <text
            x={PL - 8}
            y={g.y + 3.5}
            textAnchor="end"
            fontSize="9"
            fill="var(--ls-text-hint)"
            fontFamily="ui-monospace, monospace"
          >
            {fmt(g.value, decimals)}
          </text>
        </g>
      ))}

      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {coords.map((c, i) => {
        const isLast = i === coords.length - 1;
        const anchor = i === 0 ? "start" : isLast ? "end" : "middle";
        const labelX = i === 0 ? c.x - 4 : isLast ? c.x + 4 : c.x;
        return (
          <g key={i}>
            <circle
              cx={c.x}
              cy={c.y}
              r={isLast ? 5 : 3.5}
              fill={color}
              stroke={isLast ? "var(--ls-surface)" : undefined}
              strokeWidth={isLast ? 2 : undefined}
            />
            <text
              x={labelX}
              y={c.y - 11}
              textAnchor={anchor}
              fontSize={isLast ? 12 : 10.5}
              fontWeight="700"
              fill={isLast ? color : "var(--ls-text)"}
              fontFamily="ui-monospace, monospace"
            >
              {fmt(points[i].value, decimals)}
            </text>
            <text
              x={c.x}
              y={H - 12}
              textAnchor="middle"
              fontSize="9.5"
              fill="var(--ls-text-hint)"
              fontFamily="ui-monospace, monospace"
            >
              {formatDate(points[i].date)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Bloc repliable ─────────────────────────────────────────────────────────
function Fold({
  icon,
  title,
  subtitle,
  children
}: {
  icon: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" className="bs-fold" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="bs-fold-ico" aria-hidden="true">{icon}</span>
        <span>
          {title}
          <span className="bs-fold-sub">{subtitle}</span>
        </span>
        <span className="bs-fold-chev" aria-hidden="true">{open ? "▾" : "▸"}</span>
      </button>
      {open ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

export function BodyScanTab({
  client,
  latestBodyScan,
  previousAssessment,
  firstAssessment
}: {
  client: Client;
  latestBodyScan: BodyScanMetrics | null;
  previousAssessment: AssessmentRecord | null;
  firstAssessment: AssessmentRecord;
}) {
  const [selected, setSelected] = useState<MetricKey>("weight");

  // Historique trié — même tri que la version précédente (les cartes d'insight
  // le refaisaient chacune de leur côté).
  const history = useMemo(
    () =>
      [...(client.assessments ?? [])].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    [client.assessments]
  );

  const seriesFor = (key: MetricKey) =>
    history
      .filter((a) => (a.bodyScan?.[key] ?? 0) > 0)
      .map((a) => ({ date: a.date, value: a.bodyScan?.[key] ?? 0 }));

  if (!latestBodyScan) {
    return (
      <Card>
        <div className="rounded-[20px] bg-[var(--ls-surface2)] px-6 py-10 text-center">
          <div style={{ fontSize: 32, marginBottom: 12 }} aria-hidden="true">⚖️</div>
          <p className="text-sm text-[var(--ls-text-muted)]">Aucun body scan enregistré</p>
          <Link
            to={`/clients/${client.id}/follow-up/new`}
            className="mt-4 inline-flex min-h-[40px] items-center gap-2 rounded-[12px] bg-[var(--ls-teal)] px-4 py-2 text-sm font-bold text-[var(--ls-teal-contrast)]"
          >
            Démarrer un body scan
          </Link>
        </div>
      </Card>
    );
  }

  const current = METRICS.find((m) => m.key === selected) ?? METRICS[0];
  const currentSeries = seriesFor(current.key);
  const startWeight = firstAssessment.bodyScan?.weight ?? 0;
  const startMuscle = firstAssessment.bodyScan?.muscleMass ?? 0;
  const weightDelta = Number(((latestBodyScan.weight ?? 0) - startWeight).toFixed(1));
  const muscleDelta = Number(((latestBodyScan.muscleMass ?? 0) - startMuscle).toFixed(1));

  const currentDelta =
    currentSeries.length > 1
      ? Number((currentSeries[currentSeries.length - 1].value - currentSeries[0].value).toFixed(1))
      : null;
  const deltaIsGood =
    currentDelta === null || currentDelta === 0
      ? null
      : current.higherIsBetter
        ? currentDelta > 0
        : currentDelta < 0;

  return (
    <Card className="space-y-4">
      <style>{BODY_SCAN_STYLES}</style>

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow-label">Body Scan</p>
          <h2 className="mt-2 text-xl font-bold text-[var(--ls-text)]" style={{ fontFamily: "Syne, sans-serif" }}>
            Évolution corporelle
          </h2>
        </div>
        <Link
          to={`/clients/${client.id}/follow-up/new`}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-[12px] bg-[var(--ls-teal)] px-4 py-2 text-sm font-bold text-[var(--ls-teal-contrast)]"
        >
          + Nouveau scan
        </Link>
      </div>

      {/* ── 1 · La transformation, d'un coup d'œil ── */}
      {startWeight > 0 ? (
        <div className="bs-card">
          <p className="bs-mono">La transformation</p>
          <div className="bs-transfo">
            <div className="bs-side">
              <span className="bs-side-l">Départ</span>
              <span className="bs-side-v">{fmt(startWeight, 1)}</span>
              <span className="bs-side-d">{formatDate(firstAssessment.date)}</span>
            </div>
            <span className="bs-arrow" aria-hidden="true">→</span>
            <div className="bs-side is-now">
              <span className="bs-side-l">Aujourd&apos;hui</span>
              <span className="bs-side-v">{fmt(latestBodyScan.weight ?? 0, 1)}</span>
              <span className="bs-side-d">{formatDate(history[history.length - 1]?.date ?? firstAssessment.date)}</span>
            </div>
          </div>
          <div className="bs-wins">
            <div className="bs-win">
              <span className="bs-win-v">{weightDelta > 0 ? "+" : ""}{fmt(weightDelta, 1)} kg</span>
              <span className="bs-win-l">{weightDelta <= 0 ? "Poids perdu" : "Poids pris"}</span>
            </div>
            {startMuscle > 0 ? (
              <div className="bs-win is-lime">
                <span className="bs-win-v">{muscleDelta > 0 ? "+" : ""}{fmt(muscleDelta, 1)} kg</span>
                <span className="bs-win-l">{muscleDelta >= 0 ? "Muscle gagné" : "Muscle perdu"}</span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* ── 2 · Les indicateurs — touche pour la courbe ── */}
      <p className="bs-mono">Les indicateurs · touche pour la courbe</p>
      <div className="bs-grid">
        {METRICS.map((metric) => {
          const value = latestBodyScan[metric.key] ?? 0;
          if (!value) return null;
          const serie = seriesFor(metric.key);
          const delta =
            serie.length > 1 ? Number((serie[serie.length - 1].value - serie[0].value).toFixed(1)) : null;
          const good = delta === null || delta === 0 ? null : metric.higherIsBetter ? delta > 0 : delta < 0;
          return (
            <button
              key={metric.key}
              type="button"
              className={`bs-m${selected === metric.key ? " is-sel" : ""}`}
              style={{ borderTopColor: metric.color }}
              aria-pressed={selected === metric.key}
              onClick={() => setSelected(metric.key)}
            >
              <span className="bs-m-lab">{metric.label}</span>
              <span className="bs-m-val">
                {fmt(value, metric.decimals)}
                {metric.unit ? <small>{metric.unit}</small> : null}
              </span>
              <span className={`bs-m-d ${good === null ? "is-flat" : good ? "is-good" : "is-warn"}`}>
                {delta === null ? "—" : delta === 0 ? "=" : `${delta > 0 ? "+" : ""}${fmt(delta, metric.decimals)} ${metric.unit}`}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── 3 · Sélecteur de courbe + courbe ── */}
      <p className="bs-mono">La courbe · choisis l&apos;indicateur</p>
      <div className="bs-chips" role="tablist" aria-label="Choisir la courbe">
        {METRICS.filter((m) => (latestBodyScan[m.key] ?? 0) > 0).map((metric) => (
          <button
            key={metric.key}
            type="button"
            role="tab"
            aria-selected={selected === metric.key}
            className={`bs-chip${selected === metric.key ? " is-on" : ""}`}
            style={selected === metric.key ? { background: metric.color, borderColor: metric.color } : undefined}
            onClick={() => setSelected(metric.key)}
          >
            {metric.label}
          </button>
        ))}
      </div>

      <div className="bs-card">
        <div className="bs-chart-h">
          <span className="bs-mono">{current.label} · {currentSeries.length} relevé{currentSeries.length > 1 ? "s" : ""}</span>
          <span className="bs-chart-now" style={{ color: current.color }}>
            {fmt(latestBodyScan[current.key] ?? 0, current.decimals)} {current.unit}
          </span>
        </div>
        <MetricChart points={currentSeries} color={current.color} decimals={current.decimals} />
        {currentSeries.length > 1 ? (
          <div className="bs-chart-f">
            <span>
              Départ <b>{fmt(currentSeries[0].value, current.decimals)} {current.unit}</b> · {formatDate(currentSeries[0].date)}
            </span>
            <span>
              Écart{" "}
              <b className={deltaIsGood === null ? "is-flat" : deltaIsGood ? "is-good" : "is-warn"}>
                {currentDelta === 0 ? "stable" : `${(currentDelta ?? 0) > 0 ? "+" : ""}${fmt(currentDelta ?? 0, current.decimals)} ${current.unit}`}
              </b>
            </span>
          </div>
        ) : null}
      </div>

      {/* ── 4 · La lecture de l'indicateur choisi (composants inchangés) ── */}
      {selected === "bodyFat" ? (
        <BodyFatInsightCard
          current={{ weight: latestBodyScan.weight, percent: latestBodyScan.bodyFat }}
          objective={client.objective}
          sex={client.sex}
          age={getEffectiveAge(client)}
          previous={
            previousAssessment
              ? {
                  weight: previousAssessment.bodyScan?.weight ?? 0,
                  percent: previousAssessment.bodyScan?.bodyFat ?? 0
                }
              : null
          }
          initial={{
            weight: firstAssessment.bodyScan?.weight ?? 0,
            percent: firstAssessment.bodyScan?.bodyFat ?? 0
          }}
          history={history.map((assessment) => ({
            date: assessment.date,
            weight: assessment.bodyScan?.weight ?? 0,
            percent: assessment.bodyScan?.bodyFat ?? 0
          }))}
        />
      ) : null}

      {selected === "muscleMass" ? (
        <MuscleMassInsightCard
          current={{ weight: latestBodyScan.weight, muscleMass: latestBodyScan.muscleMass }}
          previous={
            previousAssessment
              ? {
                  weight: previousAssessment.bodyScan?.weight ?? 0,
                  muscleMass: previousAssessment.bodyScan?.muscleMass ?? 0
                }
              : null
          }
          initial={{
            weight: firstAssessment.bodyScan?.weight ?? 0,
            muscleMass: firstAssessment.bodyScan?.muscleMass ?? 0
          }}
          history={history.map((assessment) => ({
            date: assessment.date,
            weight: assessment.bodyScan?.weight ?? 0,
            muscleMass: assessment.bodyScan?.muscleMass ?? 0
          }))}
        />
      ) : null}

      {selected === "hydration" || selected === "visceralFat" ? (
        <HydrationVisceralInsightCard
          weight={latestBodyScan.weight}
          hydrationPercent={latestBodyScan.hydration}
          sex={client.sex}
          visceralFat={latestBodyScan.visceralFat}
          history={history.map((assessment) => ({
            date: assessment.date,
            weight: assessment.bodyScan?.weight ?? 0,
            hydrationPercent: assessment.bodyScan?.hydration ?? 0,
            visceralFat: assessment.bodyScan?.visceralFat ?? 0
          }))}
        />
      ) : null}

      {selected === "metabolicAge" && (latestBodyScan.metabolicAge ?? 0) > 0 ? (
        <MetabolicAgeInsightCard
          current={latestBodyScan.metabolicAge}
          realAge={getEffectiveAge(client)}
          history={history.map((assessment) => ({
            date: assessment.date,
            metabolicAge: assessment.bodyScan?.metabolicAge ?? 0
          }))}
        />
      ) : null}

      {/* ── 5 · Le reste, replié — rien n'est perdu ── */}
      <Fold icon="🎯" title="Le radar 5 axes" subtitle="Vue d'ensemble de l'équilibre corporel">
        <div className="flex items-center justify-center rounded-[16px] bg-[var(--ls-surface2)] p-6">
          <BodyScanRadar
            size={220}
            metrics={[
              { label: "Poids", value: latestBodyScan.weight ?? 0, max: 120, color: "var(--ls-teal)" },
              { label: "M. grasse", value: latestBodyScan.bodyFat ?? 0, max: 50, color: "var(--ls-coral)" },
              { label: "Muscle", value: latestBodyScan.muscleMass ?? 0, max: 80, color: "var(--ls-lime)" },
              { label: "Hydrat.", value: latestBodyScan.hydration ?? 0, max: 100, color: "#A78BFA" },
              { label: "Viscéral", value: latestBodyScan.visceralFat ?? 0, max: 20, color: "var(--ls-teal)" }
            ]}
          />
        </div>
      </Fold>

      {history.length > 1 ? (
        <Fold
          icon="📊"
          title="Tableau de tous les relevés"
          subtitle={`${history.filter((a) => a.bodyScan?.weight).length} bilans, toutes les valeurs`}
        >
          <div className="overflow-hidden rounded-[14px] border border-[var(--ls-border)]">
            {history
              .filter((a) => a.bodyScan?.weight)
              .map((a, i) => {
                const scan = a.bodyScan;
                return (
                  <div
                    key={a.id ?? i}
                    className="list-row flex items-center justify-between gap-3 px-4 py-3"
                    style={{ borderBottom: "1px solid var(--ls-border)" }}
                  >
                    <span className="text-sm text-[var(--ls-text-muted)]">{formatDate(a.date)}</span>
                    {scan?.weight ? <span className="text-sm font-semibold text-[var(--ls-teal)]">{scan.weight} kg</span> : null}
                    {scan?.bodyFat ? <span className="text-sm text-[var(--ls-coral)]">MG {scan.bodyFat}%</span> : null}
                    {scan?.muscleMass ? <span className="text-sm text-[var(--ls-lime)]">MM {scan.muscleMass} kg</span> : null}
                    {scan?.hydration ? <span className="text-sm text-[#A78BFA]">{scan.hydration}%</span> : null}
                  </div>
                );
              })}
          </div>
        </Fold>
      ) : null}
    </Card>
  );
}

const BODY_SCAN_STYLES = `
.bs-mono { font-family:'JetBrains Mono',ui-monospace,monospace; font-size:10.5px; letter-spacing:.10em; text-transform:uppercase; color:var(--ls-text-muted); margin:2px 0 8px; }
.bs-card { background:var(--ls-surface2); border:1px solid var(--ls-border); border-radius:16px; padding:14px; }

.bs-transfo { display:flex; align-items:center; justify-content:space-between; margin:10px 0 12px; }
.bs-side { flex:1; text-align:center; }
.bs-side-l { display:block; font-size:9.5px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--ls-text-hint); }
.bs-side-v { display:block; font-family:'Anton',Impact,sans-serif; font-size:32px; line-height:1.05; letter-spacing:.5px; color:var(--ls-text-muted); }
.bs-side.is-now .bs-side-v { color:var(--ls-teal); }
.bs-side-d { display:block; font-size:10.5px; color:var(--ls-text-hint); margin-top:1px; }
.bs-arrow { color:var(--ls-text-hint); font-size:17px; padding:0 4px; }
.bs-wins { display:flex; gap:9px; }
.bs-win { flex:1; text-align:center; border-radius:12px; padding:11px 10px; background:color-mix(in srgb, var(--ls-teal) 10%, transparent); border:1px solid color-mix(in srgb, var(--ls-teal) 32%, transparent); }
.bs-win.is-lime { background:color-mix(in srgb, var(--ls-lime) 9%, transparent); border-color:color-mix(in srgb, var(--ls-lime) 30%, transparent); }
.bs-win-v { display:block; font-family:'Anton',Impact,sans-serif; font-size:23px; letter-spacing:.4px; color:var(--ls-teal); }
.bs-win.is-lime .bs-win-v { color:var(--ls-lime); }
.bs-win-l { display:block; font-size:9px; font-weight:700; letter-spacing:.07em; text-transform:uppercase; color:var(--ls-text-muted); margin-top:2px; }

.bs-grid { display:grid; grid-template-columns:1fr 1fr; gap:9px; }
@media (min-width:900px) { .bs-grid { grid-template-columns:repeat(3,1fr); } }
.bs-m { text-align:left; background:var(--ls-surface2); border:1px solid var(--ls-border); border-top:3px solid var(--ls-teal); border-radius:12px; padding:11px 12px; cursor:pointer; transition:.14s; min-height:44px; }
.bs-m:active { transform:scale(.985); }
.bs-m.is-sel { border-color:var(--ls-teal); background:color-mix(in srgb, var(--ls-teal) 8%, var(--ls-surface2)); }
.bs-m-lab { display:block; font-family:'JetBrains Mono',ui-monospace,monospace; font-size:9px; letter-spacing:.09em; text-transform:uppercase; color:var(--ls-text-muted); }
.bs-m-val { display:block; font-family:'Anton',Impact,sans-serif; font-size:26px; line-height:1.15; color:var(--ls-text); margin-top:2px; }
.bs-m-val small { font-size:12px; color:var(--ls-text-muted); margin-left:2px; }
.bs-m-d { display:block; font-size:11px; font-weight:700; margin-top:2px; }

.bs-chips { display:flex; gap:7px; overflow-x:auto; padding-bottom:4px; }
.bs-chips::-webkit-scrollbar { height:0; }
.bs-chip { white-space:nowrap; font-size:12px; font-weight:600; padding:8px 13px; border-radius:999px; border:1px solid var(--ls-border); background:var(--ls-surface2); color:var(--ls-text-muted); cursor:pointer; min-height:38px; }
.bs-chip.is-on { color:var(--ls-teal-contrast); font-weight:700; }

.bs-chart-h { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:2px; }
.bs-chart-h .bs-mono { margin:0; }
.bs-chart-now { font-family:'Anton',Impact,sans-serif; font-size:20px; letter-spacing:.4px; }
.bs-chart-f { display:flex; justify-content:space-between; gap:8px; margin-top:8px; padding-top:9px; border-top:1px solid var(--ls-border); font-size:11.5px; color:var(--ls-text-muted); }
.bs-chart-f b { color:var(--ls-text); }

.is-good { color:var(--ls-teal); }
.is-warn { color:var(--ls-gold); }
.is-flat { color:var(--ls-text-hint); }

.bs-fold { width:100%; display:flex; align-items:center; gap:10px; text-align:left; background:var(--ls-surface2); border:1px solid var(--ls-border); border-radius:13px; padding:13px 14px; cursor:pointer; color:var(--ls-text); font-size:13.5px; font-weight:600; min-height:52px; }
.bs-fold:hover { border-color:var(--ls-border2); }
.bs-fold-ico { width:26px; height:26px; flex:0 0 auto; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:13px; background:color-mix(in srgb, var(--ls-teal) 13%, transparent); }
.bs-fold-sub { display:block; font-size:11px; font-weight:400; color:var(--ls-text-muted); margin-top:1px; }
.bs-fold-chev { margin-left:auto; color:var(--ls-text-hint); font-size:12px; }
`;
