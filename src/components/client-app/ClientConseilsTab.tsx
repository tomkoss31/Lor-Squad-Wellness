// Chantier Conseils client (2026-04-24) — nouvel onglet riche remplaçant
// l'ancien placeholder "Coaching". 4 sections : alertes sport, assiette
// idéale, routine quotidienne, mot du coach.

import { useMemo, useState } from "react";
import "./ClientConseilsTab.css";
import type { ClientLiveData } from "../../hooks/useClientLiveData";

interface ClientAccountMeta {
  client_first_name?: string;
  coach_name?: string;
  program_title?: string;
}

interface Props {
  liveData: ClientLiveData | null;
  clientAppAccount: ClientAccountMeta | null;
}

type Objective = "weight-loss" | "sport";

function inferObjective(live: ClientLiveData | null, meta: ClientAccountMeta | null): Objective {
  const raw = (live?.client?.objective ?? "").toLowerCase();
  if (
    raw === "sport" ||
    raw === "mass-gain" ||
    raw === "strength" ||
    raw === "cutting" ||
    raw === "endurance" ||
    raw === "fitness" ||
    raw === "competition"
  ) {
    return "sport";
  }
  const title = `${meta?.program_title ?? ""} ${live?.client?.current_program ?? ""}`.toLowerCase();
  if (/sport|performance|prise[- ]de[- ]masse|endurance|cutting|crossfit|h24|creatine|créatine/.test(title)) {
    return "sport";
  }
  return "weight-loss";
}

// ─── Assiette idéale ─────────────────────────────────────────────────
interface PlateSector {
  label: string;
  pct: number;
  color: string;
  items: string[];
}

function plateForObjective(obj: Objective): PlateSector[] {
  if (obj === "sport") {
    return [
      {
        label: "Protéines",
        pct: 33,
        color: "#D4537E",
        items: ["Poulet / dinde", "Poissons blancs / gras", "Œufs / Rebuild whey"],
      },
      {
        label: "Glucides complets",
        pct: 33,
        color: "#8B4A1B",
        items: ["Riz complet / basmati", "Patate douce", "Quinoa / pâtes complètes"],
      },
      {
        label: "Légumes",
        pct: 33,
        color: "#1D9E75",
        items: ["Brocolis / haricots verts", "Salade variée", "Courgettes / poivrons"],
      },
    ];
  }
  // weight-loss : 25 / 25 / 50
  return [
    {
      label: "Protéines",
      pct: 25,
      color: "#D4537E",
      items: ["Poulet / poisson maigre", "Œufs / skyr", "Formula 1 Herbalife"],
    },
    {
      label: "Glucides complets",
      pct: 25,
      color: "#8B4A1B",
      items: ["Riz complet (petite portion)", "Patate douce", "Légumineuses"],
    },
    {
      label: "Légumes",
      pct: 50,
      color: "#1D9E75",
      items: ["Salade verte à volonté", "Légumes vapeur", "Crudités variées"],
    },
  ];
}

function PlateSvg({ sectors }: { sectors: PlateSector[] }) {
  const R = 80;
  const CX = 90;
  const CY = 90;
  let start = -90; // start at top (12h)
  const arcs = sectors.map((s) => {
    const angle = (s.pct / 100) * 360;
    const end = start + angle;
    const rad = (deg: number) => (deg * Math.PI) / 180;
    const x1 = CX + R * Math.cos(rad(start));
    const y1 = CY + R * Math.sin(rad(start));
    const x2 = CX + R * Math.cos(rad(end));
    const y2 = CY + R * Math.sin(rad(end));
    const largeArc = angle > 180 ? 1 : 0;
    const d = `M ${CX} ${CY} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
    const arc = { d, color: s.color, label: s.label, pct: s.pct, midAngle: (start + end) / 2 };
    start = end;
    return arc;
  });
  return (
    <svg viewBox="0 0 180 180" className="conseils-plate-svg" aria-label="Assiette idéale">
      <circle cx={CX} cy={CY} r={R + 4} fill="#F7F5F0" />
      {arcs.map((a, i) => (
        <path key={i} d={a.d} fill={a.color} opacity={0.85} stroke="#fff" strokeWidth={2} />
      ))}
      {arcs.map((a, i) => {
        const rad = (a.midAngle * Math.PI) / 180;
        const lx = CX + R * 0.58 * Math.cos(rad);
        const ly = CY + R * 0.58 * Math.sin(rad);
        return (
          <text
            key={`t-${i}`}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#fff"
            fontFamily="Syne, sans-serif"
            fontWeight={800}
            fontSize={14}
          >
            {a.pct}%
          </text>
        );
      })}
    </svg>
  );
}

// ─── Routines ────────────────────────────────────────────────────────
interface RoutineItem {
  emoji: string;
  time: string;
  title: string;
  sub: string;
}

const SPORT_DAY: RoutineItem[] = [
  { emoji: "☀️", time: "7h00", title: "Formula 1 + barre", sub: "Petit-déjeuner protéiné + énergie longue durée" },
  { emoji: "🍎", time: "10h30", title: "Collation Achieve", sub: "20 g de protéines entre les repas" },
  { emoji: "⚡", time: "17h30", title: "Liftoff 24", sub: "Boost d'énergie avant l'entraînement" },
  { emoji: "💪", time: "18h00", title: "CR7 Drive", sub: "Intra-training, hydratation + glucides" },
  { emoji: "🥤", time: "19h15", title: "Rebuild whey", sub: "Shake post-entraînement 30 g protéines" },
  { emoji: "🍽️", time: "20h00", title: "Dîner", sub: "Protéines + glucides complets + légumes" },
  { emoji: "🌙", time: "22h30", title: "Rebuild caséine", sub: "Protéines à libération lente pour la nuit" },
];

const REST_DAY: RoutineItem[] = [
  { emoji: "☀️", time: "7h00", title: "Formula 1 + barre", sub: "Petit-déjeuner complet, base nutritionnelle" },
  { emoji: "🍎", time: "10h30", title: "Collation Achieve", sub: "Protéines entre les repas" },
  { emoji: "🍽️", time: "12h30", title: "Midi classique", sub: "Repas équilibré protéines / glucides / légumes" },
  { emoji: "🥛", time: "16h00", title: "Goûter yaourt", sub: "Yaourt grec / skyr + fruit" },
  { emoji: "🌙", time: "21h00", title: "Rebuild soir", sub: "Shake récupération avant le sommeil" },
];

const WEIGHT_LOSS_DAY: RoutineItem[] = [
  { emoji: "☀️", time: "7h30", title: "Formula 1 matin", sub: "Shake complet remplaçant le petit-déj" },
  { emoji: "🍎", time: "10h30", title: "Collation", sub: "Fruit + poignée d'amandes / yaourt" },
  { emoji: "🍽️", time: "13h00", title: "Repas équilibré", sub: "Protéines + légumes à volonté + glucides maîtrisés" },
  { emoji: "🌙", time: "19h30", title: "Dîner léger", sub: "Formula 1 ou poisson + légumes vapeur" },
];

// ─── Format helpers ──────────────────────────────────────────────────
function fmtDateFr(iso?: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return "";
  }
}

// ─── Composant principal ─────────────────────────────────────────────
export function ClientConseilsTab({ liveData, clientAppAccount }: Props) {
  const objective = inferObjective(liveData, clientAppAccount);
  const alerts = liveData?.sport_alerts ?? [];
  const hasSport = objective === "sport";
  const [routineMode, setRoutineMode] = useState<"sport" | "rest">("sport");

  const sectors = useMemo(() => plateForObjective(objective), [objective]);
  const coachAdvice = (liveData?.coach_advice ?? "").trim();
  const coachFirstName = (clientAppAccount?.coach_name ?? "").split(/\s+/)[0] || "ton coach";

  // Date du dernier bilan (last entry of assessment_history)
  const lastAssessmentDate = useMemo(() => {
    const hist = liveData?.assessment_history ?? [];
    if (!hist.length) return null;
    return hist[hist.length - 1].date;
  }, [liveData?.assessment_history]);

  const routineItems: RoutineItem[] = hasSport
    ? routineMode === "sport"
      ? SPORT_DAY
      : REST_DAY
    : WEIGHT_LOSS_DAY;

  return (
    <div className="conseils-root">
      {/* ─── 1. Points d'attention ─── */}
      <section>
        <h2 className="conseils-section-title">⚠️ Tes points d'attention</h2>
        {hasSport && alerts.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {alerts.map((a) => (
              <div key={a.id} className="conseils-alert-card">
                <div className="conseils-alert-icon" aria-hidden="true">{a.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 className="conseils-alert-title">{a.title}</h3>
                  <p className="conseils-alert-detail">{a.detail}</p>
                  <p className="conseils-alert-advice">💡 {a.advice}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="conseils-placeholder">
            Ton bilan ne présente aucun point d&apos;attention majeur. Continue comme ça 💪
          </div>
        )}
      </section>

      {/* ─── 2. Assiette idéale ─── */}
      <section>
        <h2 className="conseils-section-title">🍽️ Ton assiette idéale</h2>
        <div className="conseils-plate-wrap">
          <PlateSvg sectors={sectors} />
          <div className="conseils-plate-legend">
            {sectors.map((s) => (
              <div key={s.label} className="conseils-plate-item">
                <span className="conseils-plate-dot" style={{ background: s.color }} />
                <div>
                  <strong>{s.label} · {s.pct}%</strong>
                  <ul style={{ margin: "4px 0 0", padding: 0, listStyle: "none", color: "#6B7280", fontSize: 12, lineHeight: 1.5 }}>
                    {s.items.map((it) => (
                      <li key={it}>• {it}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 3. Routine quotidienne ─── */}
      <section>
        <h2 className="conseils-section-title">🕐 Ta routine quotidienne</h2>
        {hasSport ? (
          <div className="conseils-routine-toggle" role="tablist" aria-label="Type de journée">
            <button
              type="button"
              role="tab"
              aria-selected={routineMode === "sport"}
              className={routineMode === "sport" ? "active" : ""}
              onClick={() => setRoutineMode("sport")}
            >
              Jour avec sport
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={routineMode === "rest"}
              className={routineMode === "rest" ? "active" : ""}
              onClick={() => setRoutineMode("rest")}
            >
              Jour repos
            </button>
          </div>
        ) : null}
        <div className="conseils-routine-list">
          {routineItems.map((r, i) => (
            <div key={i} className="conseils-routine-item">
              <div className="conseils-routine-emoji" aria-hidden="true">{r.emoji}</div>
              <div className="conseils-routine-time">{r.time}</div>
              <div className="conseils-routine-body">
                <p className="conseils-routine-title">{r.title}</p>
                <p className="conseils-routine-sub">{r.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 4. Mot du coach ─── */}
      <section>
        <h2 className="conseils-section-title">💬 Tes conseils perso du coach</h2>
        {coachAdvice ? (
          <div className="conseils-quote">
            <p className="conseils-quote-head">💬 De la part de {coachFirstName}</p>
            <p className="conseils-quote-body">« {coachAdvice} »</p>
            <p className="conseils-quote-foot">
              — {coachFirstName}
              {lastAssessmentDate ? ` · ${fmtDateFr(lastAssessmentDate)}` : ""}
            </p>
          </div>
        ) : (
          <div className="conseils-placeholder">
            Les conseils personnalisés de {coachFirstName} apparaîtront ici après ton prochain bilan.
          </div>
        )}
      </section>
    </div>
  );
}
