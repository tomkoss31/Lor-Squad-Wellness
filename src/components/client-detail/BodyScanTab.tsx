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

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
  /**
   * Seconde unité, permutable par le coach (demande Thomas 2026-08-03).
   * « 30,4 % de masse grasse » ne parle pas ; « 22,3 kg de gras » si.
   * Idem à l'envers pour le muscle : les kg bruts ne disent rien sans la
   * part qu'ils représentent dans le poids total.
   * La conversion a besoin du POIDS DU MÊME RELEVÉ — d'où le paramètre.
   */
  alt?: {
    unit: string;
    decimals: number;
    convert: (value: number, weight: number) => number;
  };
}

const METRICS: MetricDef[] = [
  { key: "weight", label: "Poids", unit: "kg", color: "var(--ls-teal)", decimals: 1, higherIsBetter: false },
  {
    key: "bodyFat",
    label: "Masse grasse",
    unit: "%",
    color: "var(--ls-coral)",
    decimals: 1,
    higherIsBetter: false,
    // % du poids → kg de masse grasse
    alt: { unit: "kg", decimals: 1, convert: (percent, weight) => (weight * percent) / 100 }
  },
  {
    key: "muscleMass",
    label: "Muscle",
    unit: "kg",
    color: "var(--ls-lime)",
    decimals: 1,
    higherIsBetter: true,
    // kg de muscle → % du poids
    alt: { unit: "%", decimals: 1, convert: (kg, weight) => (weight > 0 ? (kg / weight) * 100 : 0) }
  },
  { key: "hydration", label: "Hydratation", unit: "%", color: "var(--ls-purple)", decimals: 1, higherIsBetter: true },
  { key: "visceralFat", label: "Graisse visc.", unit: "", color: "var(--ls-teal)", decimals: 0, higherIsBetter: false },
  { key: "metabolicAge", label: "Âge méta.", unit: "ans", color: "var(--ls-lime)", decimals: 0, higherIsBetter: false }
];

function fmt(value: number, decimals: number): string {
  return decimals > 0 ? value.toFixed(decimals).replace(/\.0$/, "") : String(Math.round(value));
}

/**
 * Date courte pour l'axe : « 04/05 », ou « 04/05/26 » en plein écran.
 * `formatDate` rend « 04 mai 2026 » — 11 caractères qui se chevauchent dès
 * qu'un client a plusieurs relevés. La date complète reste lisible dans le
 * tableau des relevés et dans le pied du plein écran.
 */
function shortDate(iso: string, withYear: boolean): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return withYear ? `${day}/${month}/${String(d.getFullYear()).slice(2)}` : `${day}/${month}`;
}

// ─── Courbe ─────────────────────────────────────────────────────────────────
// SVG maison plutôt que recharts : on veut la valeur écrite sur CHAQUE point
// et la date en dessous (demande Thomas 2026-08-03), ce que la version
// « sparkline » ne montrait pas. Léger, sans dépendance ajoutée.
function MetricChart({
  points,
  color,
  decimals,
  tall = false,
  activeIndex,
  onPointClick
}: {
  points: { date: string; value: number }[];
  color: string;
  decimals: number;
  /** Version plein écran : plus haute, plus respirante. */
  tall?: boolean;
  /** Point sélectionné (plein écran) : mis en avant + repère vertical. */
  activeIndex?: number;
  /** Rend les points cliquables — on touche pour lire date + valeur exactes. */
  onPointClick?: (index: number) => void;
}) {
  const W = 340;
  const H = tall ? 300 : 176;
  const PT = tall ? 40 : 28;
  const PB = tall ? 44 : 34;
  const PL = tall ? 44 : 38;
  const PR = tall ? 34 : 18;

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

  // ── Densité des étiquettes ────────────────────────────────────────────────
  // Un client suivi depuis 2 ans a une dizaine de relevés : écrire la date sous
  // CHAQUE point les empile en bouillie illisible (constaté sur une vraie fiche
  // à 11 relevés, 2026-08-03). On n'en garde qu'un nombre tenable, réparti
  // régulièrement — le premier et le dernier toujours, ce sont les deux qui
  // comptent. Idem pour les valeurs, en un peu plus dense.
  const pickIndices = (maxCount: number): Set<number> => {
    const last = points.length - 1;
    if (points.length <= maxCount) {
      return new Set(points.map((_, i) => i));
    }
    const kept = new Set<number>([0, last]);
    const inner = maxCount - 2;
    for (let n = 1; n <= inner; n++) {
      const index = Math.round((n * last) / (inner + 1));
      // On évite les étiquettes collées aux extrémités.
      if (index > 0 && index < last) kept.add(index);
    }
    return kept;
  };

  // Volontairement peu d'étiquettes : en plein écran, toucher un point donne la
  // date et la valeur exactes, donc l'axe n'a plus besoin de tout écrire.
  const dateIndices = pickIndices(4);
  const valueIndices = pickIndices(tall ? 6 : 5);
  const dense = points.length > 6;

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

      {/* Repère vertical du point sélectionné (plein écran). */}
      {activeIndex !== undefined && coords[activeIndex] ? (
        <line
          x1={coords[activeIndex].x}
          y1={PT - 8}
          x2={coords[activeIndex].x}
          y2={H - PB}
          stroke={color}
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.55"
        />
      ) : null}

      {coords.map((c, i) => {
        const isLast = i === coords.length - 1;
        const isFirst = i === 0;
        const isActive = activeIndex === i;
        const anchor = isFirst ? "start" : isLast ? "end" : "middle";
        const labelX = isFirst ? c.x - 4 : isLast ? c.x + 4 : c.x;
        return (
          <g key={i}>
            <circle
              cx={c.x}
              cy={c.y}
              r={isActive ? 6.5 : isLast ? 5 : dense ? 2.6 : 3.5}
              fill={color}
              stroke={isActive || isLast ? "var(--ls-surface)" : undefined}
              strokeWidth={isActive || isLast ? 2 : undefined}
            />
            {/* Zone de touche large : un point de 3 px est intouchable au doigt. */}
            {onPointClick ? (
              <circle
                cx={c.x}
                cy={c.y}
                r={14}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onClick={() => onPointClick(i)}
                role="button"
                tabIndex={0}
                aria-label={`${formatDate(points[i].date)} : ${fmt(points[i].value, decimals)}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onPointClick(i);
                }}
              />
            ) : null}
            {valueIndices.has(i) ? (
              <text
                x={labelX}
                y={c.y - 11}
                textAnchor={anchor}
                fontSize={isLast ? 12 : dense ? 9.5 : 10.5}
                fontWeight="700"
                fill={isLast ? color : "var(--ls-text)"}
                fontFamily="ui-monospace, monospace"
              >
                {fmt(points[i].value, decimals)}
              </text>
            ) : null}
            {dateIndices.has(i) ? (
              <text
                x={labelX}
                y={H - 12}
                textAnchor={anchor}
                fontSize="9.5"
                fill="var(--ls-text-hint)"
                fontFamily="ui-monospace, monospace"
              >
                {shortDate(points[i].date, tall)}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Plein écran ────────────────────────────────────────────────────────────
// La courbe en pleine page, tous les relevés depuis le démarrage. Utile en RDV
// pour montrer le chemin parcouru au client (demande Thomas 2026-08-03).
function ChartFullscreen({
  metric,
  points,
  onClose
}: {
  metric: MetricDef;
  points: { date: string; value: number }[];
  onClose: () => void;
}) {
  // Point sélectionné : le dernier relevé par défaut. On touche un point pour
  // lire sa date exacte et sa valeur — c'est ce qui permet d'alléger les
  // étiquettes de l'axe sans rien perdre.
  const [active, setActive] = useState(points.length - 1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // On bloque le scroll du fond pendant l'ouverture.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const first = points[0];
  const last = points[points.length - 1];
  const delta = points.length > 1 ? Number((last.value - first.value).toFixed(1)) : 0;
  const good = delta === 0 ? null : metric.higherIsBetter ? delta > 0 : delta < 0;

  return createPortal(
    <div className="bs-fs" role="dialog" aria-modal="true" aria-label={`Courbe ${metric.label} en plein écran`}>
      <div className="bs-fs-head">
        <div>
          <p className="bs-mono" style={{ margin: 0 }}>Depuis le démarrage · {points.length} relevés</p>
          <h2 className="bs-fs-title" style={{ color: metric.color }}>{metric.label}</h2>
        </div>
        <button type="button" className="bs-fs-close" onClick={onClose} aria-label="Fermer le plein écran">✕</button>
      </div>

      <div className="bs-fs-body">
        <MetricChart
          points={points}
          color={metric.color}
          decimals={metric.decimals}
          tall
          activeIndex={active}
          onPointClick={setActive}
        />
      </div>

      {/* Détail du point touché : date exacte + valeur + écart avec le relevé
          précédent. C'est ce qui permet d'alléger les étiquettes de l'axe sans
          rien perdre (idée Thomas 2026-08-03). */}
      <div className="bs-fs-point">
        <div>
          <span className="bs-fs-point-l">Relevé {active + 1} / {points.length}</span>
          <span className="bs-fs-point-d">{formatDate(points[active].date)}</span>
        </div>
        <div className="bs-fs-point-r">
          <span className="bs-fs-point-v" style={{ color: metric.color }}>
            {fmt(points[active].value, metric.decimals)} {metric.unit}
          </span>
          {active > 0 ? (
            (() => {
              const step = Number((points[active].value - points[active - 1].value).toFixed(1));
              const stepGood = step === 0 ? null : metric.higherIsBetter ? step > 0 : step < 0;
              return (
                <span className={`bs-fs-point-s ${stepGood === null ? "is-flat" : stepGood ? "is-good" : "is-warn"}`}>
                  {step === 0 ? "= stable" : `${step > 0 ? "+" : ""}${fmt(step, metric.decimals)} vs précédent`}
                </span>
              );
            })()
          ) : (
            <span className="bs-fs-point-s is-flat">point de départ</span>
          )}
        </div>
      </div>

      <div className="bs-fs-foot">
        <div>
          <span className="bs-fs-foot-l">Départ</span>
          <span className="bs-fs-foot-v">{fmt(first.value, metric.decimals)} {metric.unit}</span>
          <span className="bs-fs-foot-d">{formatDate(first.date)}</span>
        </div>
        <div>
          <span className="bs-fs-foot-l">Aujourd&apos;hui</span>
          <span className="bs-fs-foot-v" style={{ color: metric.color }}>{fmt(last.value, metric.decimals)} {metric.unit}</span>
          <span className="bs-fs-foot-d">{formatDate(last.date)}</span>
        </div>
        <div>
          <span className="bs-fs-foot-l">Écart</span>
          <span className={`bs-fs-foot-v ${good === null ? "is-flat" : good ? "is-good" : "is-warn"}`}>
            {delta === 0 ? "stable" : `${delta > 0 ? "+" : ""}${fmt(delta, metric.decimals)} ${metric.unit}`}
          </span>
          <span className="bs-fs-foot-d">sur toute la période</span>
        </div>
      </div>
    </div>,
    document.body
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
  const [fullscreen, setFullscreen] = useState(false);
  // Unité permutée par métrique : masse grasse en % ou en kg, muscle en kg ou
  // en % du poids. Le choix vaut partout à la fois (tuile, courbe, plein
  // écran) — sinon on lirait deux unités différentes sur le même écran.
  const [altUnits, setAltUnits] = useState<Partial<Record<MetricKey, boolean>>>({});

  // Historique trié — même tri que la version précédente (les cartes d'insight
  // le refaisaient chacune de leur côté).
  const history = useMemo(
    () =>
      [...(client.assessments ?? [])].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    [client.assessments]
  );

  // ── Unité active d'une métrique ───────────────────────────────────────────
  const isAlt = (m: MetricDef) => Boolean(m.alt && altUnits[m.key]);
  const unitOf = (m: MetricDef) => (isAlt(m) ? m.alt!.unit : m.unit);
  const decimalsOf = (m: MetricDef) => (isAlt(m) ? m.alt!.decimals : m.decimals);
  const toggleUnit = (m: MetricDef) =>
    setAltUnits((prev) => ({ ...prev, [m.key]: !prev[m.key] }));

  /**
   * Série d'un indicateur, dans l'unité choisie. La conversion utilise le poids
   * DU MÊME relevé — pas le poids actuel : 30 % de masse grasse ne pèsent pas
   * le même nombre de kilos au départ et aujourd'hui.
   */
  const seriesFor = (m: MetricDef) =>
    history
      .filter((a) => (a.bodyScan?.[m.key] ?? 0) > 0)
      .map((a) => {
        const raw = a.bodyScan?.[m.key] ?? 0;
        const weight = a.bodyScan?.weight ?? 0;
        return {
          date: a.date,
          value: isAlt(m) ? Number(m.alt!.convert(raw, weight).toFixed(2)) : raw
        };
      })
      .filter((p) => p.value > 0);

  /** Valeur du dernier relevé, dans l'unité choisie. */
  const latestValueOf = (m: MetricDef) => {
    const raw = latestBodyScan?.[m.key] ?? 0;
    if (!isAlt(m)) return raw;
    return m.alt!.convert(raw, latestBodyScan?.weight ?? 0);
  };

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
  const currentSeries = seriesFor(current);
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
          if (!(latestBodyScan[metric.key] ?? 0)) return null;
          const value = latestValueOf(metric);
          const unit = unitOf(metric);
          const decimals = decimalsOf(metric);
          const serie = seriesFor(metric);
          const delta =
            serie.length > 1 ? Number((serie[serie.length - 1].value - serie[0].value).toFixed(1)) : null;
          const good = delta === null || delta === 0 ? null : metric.higherIsBetter ? delta > 0 : delta < 0;
          return (
            <div
              key={metric.key}
              role="button"
              tabIndex={0}
              className={`bs-m${selected === metric.key ? " is-sel" : ""}`}
              style={{ borderTopColor: metric.color }}
              aria-pressed={selected === metric.key}
              onClick={() => setSelected(metric.key)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setSelected(metric.key);
              }}
            >
              <span className="bs-m-top">
                <span className="bs-m-lab">{metric.label}</span>
                {/* Inverseur d'unité : la masse grasse parle mieux en kg, le
                    muscle en % du poids. Le clic ne sélectionne PAS la métrique
                    (stopPropagation) — sinon on ne pourrait plus permuter sans
                    changer de courbe. */}
                {metric.alt ? (
                  <button
                    type="button"
                    className="bs-m-unit"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleUnit(metric);
                    }}
                    aria-label={`Afficher ${metric.label} en ${isAlt(metric) ? metric.unit : metric.alt.unit}`}
                    title={`Basculer en ${isAlt(metric) ? metric.unit : metric.alt.unit}`}
                  >
                    ⇄ {isAlt(metric) ? metric.unit : metric.alt.unit}
                  </button>
                ) : null}
              </span>
              <span className="bs-m-val">
                {fmt(value, decimals)}
                {unit ? <small>{unit}</small> : null}
              </span>
              <span className={`bs-m-d ${good === null ? "is-flat" : good ? "is-good" : "is-warn"}`}>
                {delta === null ? "—" : delta === 0 ? "=" : `${delta > 0 ? "+" : ""}${fmt(delta, decimals)} ${unit}`}
              </span>
            </div>
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
          <span className="bs-chart-actions">
            <span className="bs-chart-now" style={{ color: current.color }}>
              {fmt(latestValueOf(current), decimalsOf(current))} {unitOf(current)}
            </span>
            {currentSeries.length > 1 ? (
              <button
                type="button"
                className="bs-expand"
                onClick={() => setFullscreen(true)}
                aria-label={`Agrandir la courbe ${current.label}`}
              >
                ⤢ Agrandir
              </button>
            ) : null}
          </span>
        </div>
        <MetricChart points={currentSeries} color={current.color} decimals={decimalsOf(current)} />
        {currentSeries.length > 1 ? (
          <div className="bs-chart-f">
            <span>
              Départ <b>{fmt(currentSeries[0].value, decimalsOf(current))} {unitOf(current)}</b> · {formatDate(currentSeries[0].date)}
            </span>
            <span>
              Écart{" "}
              <b className={deltaIsGood === null ? "is-flat" : deltaIsGood ? "is-good" : "is-warn"}>
                {currentDelta === 0 ? "stable" : `${(currentDelta ?? 0) > 0 ? "+" : ""}${fmt(currentDelta ?? 0, decimalsOf(current))} ${unitOf(current)}`}
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
        />
      ) : null}

      {selected === "hydration" || selected === "visceralFat" ? (
        <HydrationVisceralInsightCard
          weight={latestBodyScan.weight}
          hydrationPercent={latestBodyScan.hydration}
          sex={client.sex}
          visceralFat={latestBodyScan.visceralFat}
        />
      ) : null}

      {selected === "metabolicAge" && (latestBodyScan.metabolicAge ?? 0) > 0 ? (
        <MetabolicAgeInsightCard
          current={latestBodyScan.metabolicAge}
          realAge={getEffectiveAge(client)}
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
      {fullscreen && currentSeries.length > 1 ? (
        <ChartFullscreen
          /* Le plein écran hérite de l'unité choisie sur la tuile : on ne veut
             pas lire des % ici et des kg là. */
          metric={{ ...current, unit: unitOf(current), decimals: decimalsOf(current) }}
          points={currentSeries}
          onClose={() => setFullscreen(false)}
        />
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
.bs-m-top { display:flex; align-items:center; justify-content:space-between; gap:6px; min-height:22px; }
.bs-m-lab { display:block; font-family:'JetBrains Mono',ui-monospace,monospace; font-size:9px; letter-spacing:.09em; text-transform:uppercase; color:var(--ls-text-muted); }
/* Inverseur d'unité (masse grasse %/kg, muscle kg/%) — assez grand pour le
   pouce (32px de haut) sans écraser la tuile. */
.bs-m-unit { flex:0 0 auto; font-family:'JetBrains Mono',ui-monospace,monospace; font-size:9.5px; font-weight:700; letter-spacing:.04em;
  padding:5px 8px; min-height:32px; border-radius:999px; cursor:pointer;
  background:var(--ls-surface); border:1px solid var(--ls-border); color:var(--ls-text-muted); }
.bs-m-unit:hover { border-color:var(--ls-teal); color:var(--ls-teal); }
.bs-m-val { display:block; font-family:'Anton',Impact,sans-serif; font-size:26px; line-height:1.15; color:var(--ls-text); margin-top:2px; }
.bs-m-val small { font-size:12px; color:var(--ls-text-muted); margin-left:2px; }
.bs-m-d { display:block; font-size:11px; font-weight:700; margin-top:2px; }

.bs-chips { display:flex; gap:7px; overflow-x:auto; padding-bottom:4px; }
.bs-chips::-webkit-scrollbar { height:0; }
.bs-chip { white-space:nowrap; font-size:12px; font-weight:600; padding:8px 13px; border-radius:999px; border:1px solid var(--ls-border); background:var(--ls-surface2); color:var(--ls-text-muted); cursor:pointer; min-height:38px; }
.bs-chip.is-on { color:var(--ls-teal-contrast); font-weight:700; }

.bs-chart-h { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:2px; }
/* Le libellé cède la place : c'est la valeur et le bouton qui doivent tenir
   sur une ligne, pas l'inverse (constaté à 390 px). */
.bs-chart-h .bs-mono { margin:0; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.bs-chart-actions { flex:0 0 auto; }
.bs-chart-now { font-family:'Anton',Impact,sans-serif; font-size:20px; letter-spacing:.4px; white-space:nowrap; }
.bs-chart-f { display:flex; justify-content:space-between; gap:8px; margin-top:8px; padding-top:9px; border-top:1px solid var(--ls-border); font-size:11.5px; color:var(--ls-text-muted); }
.bs-chart-f b { color:var(--ls-text); }

.is-good { color:var(--ls-teal); }
.is-warn { color:var(--ls-coral); }
.is-flat { color:var(--ls-text-hint); }

.bs-fold { width:100%; display:flex; align-items:center; gap:10px; text-align:left; background:var(--ls-surface2); border:1px solid var(--ls-border); border-radius:13px; padding:13px 14px; cursor:pointer; color:var(--ls-text); font-size:13.5px; font-weight:600; min-height:52px; }
.bs-fold:hover { border-color:var(--ls-border2); }
.bs-fold-ico { width:26px; height:26px; flex:0 0 auto; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:13px; background:color-mix(in srgb, var(--ls-teal) 13%, transparent); }
.bs-fold-sub { display:block; font-size:11px; font-weight:400; color:var(--ls-text-muted); margin-top:1px; }
.bs-fold-chev { margin-left:auto; color:var(--ls-text-hint); font-size:12px; }

/* ── Bouton « agrandir » + plein écran ── */
.bs-chart-actions { display:flex; align-items:center; gap:9px; }
.bs-expand { background:var(--ls-surface); border:1px solid var(--ls-border); border-radius:999px; padding:6px 11px; font-size:11.5px; font-weight:700; color:var(--ls-text-muted); cursor:pointer; min-height:34px; white-space:nowrap; }
.bs-expand:hover { border-color:var(--ls-teal); color:var(--ls-teal); }

.bs-fs { position:fixed; inset:0; z-index:9999; background:var(--ls-bg); display:flex; flex-direction:column;
  padding:calc(14px + env(safe-area-inset-top)) 16px calc(16px + env(safe-area-inset-bottom)); animation:bs-fs-in .2s ease; }
@keyframes bs-fs-in { from { opacity:0; transform:scale(.985); } to { opacity:1; transform:none; } }
@media (prefers-reduced-motion: reduce) { .bs-fs { animation:none; } }
.bs-fs-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:10px; }
.bs-fs-title { font-family:'Anton',Impact,sans-serif; font-size:30px; letter-spacing:.5px; margin:3px 0 0; }
.bs-fs-close { flex:0 0 auto; width:42px; height:42px; border-radius:50%; background:var(--ls-surface2); border:1px solid var(--ls-border);
  color:var(--ls-text); font-size:17px; cursor:pointer; display:flex; align-items:center; justify-content:center; }
.bs-fs-close:hover { border-color:var(--ls-border2); }
.bs-fs-body { flex:1; display:flex; align-items:center; justify-content:center; min-height:0;
  background:var(--ls-surface2); border:1px solid var(--ls-border); border-radius:16px; padding:10px; }
.bs-fs-body svg { max-height:100%; }
.bs-fs-foot { display:flex; gap:9px; margin-top:12px; }
.bs-fs-foot > div { flex:1; background:var(--ls-surface2); border:1px solid var(--ls-border); border-radius:12px; padding:11px 10px; text-align:center; }
.bs-fs-foot-l { display:block; font-size:9px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:var(--ls-text-hint); }
.bs-fs-foot-v { display:block; font-family:'Anton',Impact,sans-serif; font-size:21px; letter-spacing:.3px; color:var(--ls-text); margin-top:2px; }
.bs-fs-foot-d { display:block; font-size:10px; color:var(--ls-text-hint); margin-top:1px; }
.bs-fs-point { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:10px; padding:12px 14px; background:var(--ls-surface2); border:1px solid var(--ls-border); border-radius:13px; }
.bs-fs-point-l { display:block; font-family:"JetBrains Mono",ui-monospace,monospace; font-size:9.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--ls-text-hint); }
.bs-fs-point-d { display:block; font-size:14.5px; font-weight:700; color:var(--ls-text); margin-top:2px; }
.bs-fs-point-r { text-align:right; }
.bs-fs-point-v { display:block; font-family:"Anton",Impact,sans-serif; font-size:24px; letter-spacing:.3px; }
.bs-fs-point-s { display:block; font-size:11.5px; font-weight:700; margin-top:1px; }
body:has(.bs-fs) .noaly-fab { display:none; }
.bs-fs-body { flex:0 1 auto; }
`;
