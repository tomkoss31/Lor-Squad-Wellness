// ============================================================================
// PWA v2 — Onglet Évolution (chantier refonte identité PWA client 2026-07)
// ----------------------------------------------------------------------------
// Transformation départ→aujourd'hui, 4 indicateurs clés, courbe de poids
// animée, mensurations interactives (silhouette + feuille de saisie).
//
// Données réelles : métriques (poids/masse grasse/muscle/eau) depuis
// metrics_history, mensurations (taille/hanches/cuisse/bras) depuis
// liveData.measurements. Les zones du design sans donnée réelle (cou, poitrine,
// mollets) restent en attente de saisie. L'édition de mensuration est en état
// local (persistance branchée sur le flux measurements dans une passe
// ultérieure — cf. ClientMeasurementsSection existant).
// ============================================================================
import { useState, type CSSProperties } from 'react'
import { getSupabaseClient } from '../../../services/supabaseClient'
import { recordClientXp } from '../../../features/client-xp/useClientXp'

const ANTON = "'Anton', sans-serif"
const SORA = "'Sora', sans-serif"
const MONO = "'JetBrains Mono', monospace"

// Mapping zone v2 → colonne réelle client_measurements (les 10 colonnes existent).
const ZONE_TO_COL: Record<string, string> = {
  cou: 'neck', poitrine: 'chest', brasG: 'arm_left', brasD: 'arm_right',
  taille: 'waist', hanches: 'hips', cuisseG: 'thigh_left', cuisseD: 'thigh_right',
  molletG: 'calf_left', molletD: 'calf_right',
}

export interface EvolutionMetricPoint {
  date: string
  weight?: number
  bodyFat?: number
  muscleMass?: number
  hydration?: number
  visceralFat?: number
  metabolicAge?: number
}
type MetricKey = 'weight' | 'bodyFat' | 'muscleMass' | 'hydration' | 'visceralFat' | 'metabolicAge'
// Les 6 métriques du body-scan. goodDown = baisser est favorable.
const METRICS: Array<{ key: MetricKey; label: string; short: string; unit: string; color: string; goodDown: boolean }> = [
  { key: 'weight', label: 'Poids', short: 'Poids', unit: 'kg', color: 'var(--teal)', goodDown: true },
  { key: 'bodyFat', label: 'Masse grasse', short: 'Masse grasse', unit: '%', color: 'var(--coral)', goodDown: true },
  { key: 'muscleMass', label: 'Masse musculaire', short: 'Muscle', unit: 'kg', color: 'var(--lime)', goodDown: false },
  { key: 'hydration', label: 'Hydratation', short: 'Eau', unit: '%', color: 'var(--violet)', goodDown: false },
  { key: 'visceralFat', label: 'Graisse viscérale', short: 'Graisse visc.', unit: '', color: 'var(--gold)', goodDown: true },
  { key: 'metabolicAge', label: 'Âge métabolique', short: 'Âge méta.', unit: 'ans', color: 'var(--emerald)', goodDown: true },
]
export interface EvolutionMeasurement {
  measured_at: string
  waist_cm?: number
  hips_cm?: number
  thigh_cm?: number
  arm_cm?: number
}
export interface EvolutionTabProps {
  token: string
  ageYears: number | null
  metrics: EvolutionMetricPoint[]
  measurements: EvolutionMeasurement[]
}

// Zones du design (silhouette). Les 4 premières se mappent sur les données
// réelles ; les autres attendent une saisie (data à venir).
const ZONE_DEFS: Array<{ key: string; label: string; cx: number; cy: number; from?: 'waist' | 'hips' | 'thigh' | 'arm' }> = [
  { key: 'cou', label: 'Tour de cou', cx: 80, cy: 52 },
  { key: 'poitrine', label: 'Tour de poitrine', cx: 80, cy: 88 },
  { key: 'brasG', label: 'Bras gauche', cx: 50, cy: 112, from: 'arm' },
  { key: 'brasD', label: 'Bras droit', cx: 110, cy: 112, from: 'arm' },
  { key: 'taille', label: 'Tour de taille', cx: 80, cy: 138, from: 'waist' },
  { key: 'hanches', label: 'Tour de hanches', cx: 80, cy: 168, from: 'hips' },
  { key: 'cuisseG', label: 'Cuisse gauche', cx: 71, cy: 214, from: 'thigh' },
  { key: 'cuisseD', label: 'Cuisse droite', cx: 89, cy: 214, from: 'thigh' },
  { key: 'molletG', label: 'Mollet gauche', cx: 71, cy: 288 },
  { key: 'molletD', label: 'Mollet droit', cx: 89, cy: 288 },
]

function fmt(n: number | undefined, digits = 1): string {
  return n == null || !isFinite(n) ? '—' : n.toFixed(digits)
}

export function EvolutionTab({ token, ageYears, metrics, measurements }: EvolutionTabProps) {
  const [measView, setMeasView] = useState<'face' | 'back'>('face')
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('weight')
  const [activeZone, setActiveZone] = useState<string | null>(null)
  const [sheetVal, setSheetVal] = useState(0)
  const [localMeasures, setLocalMeasures] = useState<Record<string, number>>({})
  const [draftKeys, setDraftKeys] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)

  async function saveSession() {
    if (draftKeys.length === 0 || saving) return
    setSaving(true)
    const measures: Record<string, number> = {}
    for (const zk of draftKeys) {
      const col = ZONE_TO_COL[zk]
      const val = localMeasures[zk]
      if (col && typeof val === 'number') measures[col] = val
    }
    try {
      const sb = await getSupabaseClient()
      if (sb) {
        const { error } = await sb.functions.invoke('client-app-save-measurement', { body: { token, measures } })
        if (!error) {
          void recordClientXp(token, 'measurement_added')
          setSavedOk(true)
          setDraftKeys([])
          window.setTimeout(() => setSavedOk(false), 2500)
        }
      }
    } catch {
      /* silencieux */
    } finally {
      setSaving(false)
    }
  }

  const withWeight = metrics.filter((m) => typeof m.weight === 'number' && isFinite(m.weight as number))
  const firstM = withWeight[0]
  const lastM = withWeight[withWeight.length - 1]

  const weightStart = firstM?.weight
  const weightNow = lastM?.weight
  const weightDelta = weightStart != null && weightNow != null ? Math.round((weightNow - weightStart) * 10) / 10 : null

  // Dernière + première mensuration (pour delta)
  const measSorted = [...measurements].sort((a, b) => a.measured_at.localeCompare(b.measured_at))
  const measFirst = measSorted[0]
  const measLast = measSorted[measSorted.length - 1]
  const lastMeasDate = measLast ? new Date(measLast.measured_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : null

  function realCur(from?: 'waist' | 'hips' | 'thigh' | 'arm'): number | undefined {
    if (!from || !measLast) return undefined
    return measLast[`${from}_cm` as keyof EvolutionMeasurement] as number | undefined
  }
  function realStart(from?: 'waist' | 'hips' | 'thigh' | 'arm'): number | undefined {
    if (!from || !measFirst) return undefined
    return measFirst[`${from}_cm` as keyof EvolutionMeasurement] as number | undefined
  }

  const zones = ZONE_DEFS.map((z) => {
    const cur = localMeasures[z.key] ?? realCur(z.from)
    const start = realStart(z.from)
    const filled = cur != null
    const delta = filled && start != null ? Math.round((start - cur) * 10) / 10 : null
    return {
      ...z,
      cur,
      filled,
      curTxt: filled ? `${cur} cm` : '—',
      deltaTxt: delta == null ? '' : delta > 0 ? `− ${delta}` : delta < 0 ? `+ ${Math.abs(delta)}` : '0.0',
      deltaColor: delta != null && delta > 0 ? 'var(--teal)' : 'var(--dim)',
      dotFill: draftKeys.includes(z.key) ? 'var(--lime)' : filled ? 'var(--teal)' : 'transparent',
      dotStroke: filled ? 'var(--teal)' : 'var(--lime)',
      draft: draftKeys.includes(z.key),
    }
  })
  const filledCount = zones.filter((z) => z.filled).length
  const totalLostCm = zones.reduce((s, z) => {
    const start = realStart(z.from)
    if (z.cur == null || start == null) return s
    const d = start - z.cur
    return d > 0 ? s + d : s
  }, 0)

  // Quelles métriques ont au moins une valeur (pour n'afficher que le pertinent).
  const availableMetrics = METRICS.filter((mt) => metrics.some((m) => typeof m[mt.key] === 'number'))
  const activeMetricKey = availableMetrics.some((m) => m.key === selectedMetric) ? selectedMetric : (availableMetrics[0]?.key ?? 'weight')
  const sel = METRICS.find((m) => m.key === activeMetricKey) ?? METRICS[0]

  // Valeur courante/départ/delta d'une métrique.
  function metricStat(key: MetricKey) {
    const pts = metrics.map((m) => m[key]).filter((v): v is number => typeof v === 'number')
    if (pts.length === 0) return { cur: undefined as number | undefined, start: undefined as number | undefined, delta: null as number | null }
    const cur = pts[pts.length - 1]
    const start = pts[0]
    return { cur, start, delta: Math.round((cur - start) * 10) / 10 }
  }

  // Courbe de la métrique sélectionnée.
  const W = 300, H = 132, P = 14, top = 8, bottom = 104
  const selSeries = metrics.map((m) => ({ date: m.date, v: m[activeMetricKey] })).filter((p): p is { date: string; v: number } => typeof p.v === 'number')
  const n = selSeries.length
  const selVals = selSeries.map((p) => p.v)
  const rawMin = n ? Math.min(...selVals) : 0
  const rawMax = n ? Math.max(...selVals) : 1
  const padY = (rawMax - rawMin) * 0.12 || Math.max(1, rawMax * 0.05)
  const lo = rawMin - padY, hi = rawMax + padY, span = hi - lo || 1
  const pts = selVals.map((w, i) => {
    const x = P + (n > 1 ? (i * (W - 2 * P)) / (n - 1) : 0)
    const y = top + ((hi - w) / span) * (bottom - top)
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10] as [number, number]
  })
  const chartLine = pts.map((p) => p.join(',')).join(' ')
  const chartArea = `${P},${bottom} ${chartLine} ${W - P},${bottom}`
  const selStat = metricStat(activeMetricKey)
  // Étiquettes de date : ~5 réparties.
  const dateLabelIdx = n <= 5 ? selSeries.map((_, i) => i) : [0, Math.round(n * 0.25), Math.round(n * 0.5), Math.round(n * 0.75), n - 1]
  const dateLabels = [...new Set(dateLabelIdx)].map((i) => new Date(selSeries[i].date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }))

  // ── Valeurs secondaires (en PLUS, pas en remplacement) ──────────────────
  // Masse grasse : les kg de graisse perdus (poids × %MG). Muscle : le % du poids.
  const r1 = (x: number) => Math.round(x * 10) / 10
  const mFirstFat = metrics.find((m) => typeof m.weight === 'number' && typeof m.bodyFat === 'number')
  const mLastFat = [...metrics].reverse().find((m) => typeof m.weight === 'number' && typeof m.bodyFat === 'number')
  const fatKgDelta = mFirstFat && mLastFat ? r1((mLastFat.weight! * mLastFat.bodyFat!) / 100 - (mFirstFat.weight! * mFirstFat.bodyFat!) / 100) : null
  const mFirstMus = metrics.find((m) => typeof m.weight === 'number' && typeof m.muscleMass === 'number')
  const mLastMus = [...metrics].reverse().find((m) => typeof m.weight === 'number' && typeof m.muscleMass === 'number')
  const musclePctNow = mLastMus ? r1((mLastMus.muscleMass! / mLastMus.weight!) * 100) : null
  const musclePctDelta = mFirstMus && mLastMus ? r1((mLastMus.muscleMass! / mLastMus.weight!) * 100 - (mFirstMus.muscleMass! / mFirstMus.weight!) * 100) : null
  function secondaryFor(key: MetricKey): string | null {
    if (key === 'bodyFat' && fatKgDelta != null) return `${fatKgDelta <= 0 ? '≈ −' : '≈ +'}${Math.abs(fatKgDelta)} kg de graisse`
    if (key === 'muscleMass' && musclePctNow != null) return `${musclePctNow}% du poids${musclePctDelta != null && musclePctDelta !== 0 ? ` (${musclePctDelta > 0 ? '+' : '−'}${Math.abs(musclePctDelta)})` : ''}`
    return null
  }
  // Étiquetage courbe : tous les points si peu nombreux, sinon on éclaircit.
  const labelStep = Math.max(1, Math.ceil(n / 12))

  const card: CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 18 }
  const activeZoneDef = ZONE_DEFS.find((z) => z.key === activeZone) || null

  function openZone(key: string) {
    const z = zones.find((x) => x.key === key)
    setActiveZone(key)
    setSheetVal(z?.cur ?? 0)
  }
  function validateZone() {
    if (!activeZone) return
    setLocalMeasures((m) => ({ ...m, [activeZone]: sheetVal }))
    setDraftKeys((d) => (d.includes(activeZone) ? d : [...d, activeZone]))
    setActiveZone(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'lbRise .4s ease both' }}>
      {/* Confidentialité + âge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 13px', borderRadius: 12, background: 'color-mix(in srgb,var(--teal) 8%,var(--surface))', border: '.5px solid color-mix(in srgb,var(--teal) 24%,transparent)', borderLeft: '3px solid var(--teal)', fontSize: 12, color: 'var(--teal)' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
        <span style={{ flex: 1 }}>Tes données de santé sont protégées, hébergées en Europe.</span>
      </div>
      {ageYears != null && (
        <div style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text)' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.7"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
          <strong>{ageYears} ans</strong>
        </div>
      )}

      {/* Transformation */}
      <div style={card}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--teal)', fontWeight: 600, marginBottom: 14 }}>Ma transformation</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', color: 'var(--dim)' }}>DÉPART</div>
            <div style={{ fontFamily: ANTON, fontSize: 30, color: 'var(--muted)', lineHeight: 1, marginTop: 5 }}>{fmt(weightStart)}</div>
            <div style={{ fontSize: 10.5, color: 'var(--dim)', marginTop: 4 }}>{firstM ? new Date(firstM.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}</div>
          </div>
          <svg width="26" height="16" viewBox="0 0 26 16" fill="none" stroke="var(--dim)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 8h20M17 3l5 5-5 5" /></svg>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', color: 'var(--teal)' }}>AUJOURD'HUI</div>
            <div style={{ fontFamily: ANTON, fontSize: 30, color: 'var(--teal)', lineHeight: 1, marginTop: 5 }}>{fmt(weightNow)}</div>
            <div style={{ fontSize: 10.5, color: 'var(--dim)', marginTop: 4 }}>{lastM ? new Date(lastM.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ borderRadius: 13, padding: 14, textAlign: 'center', background: 'linear-gradient(135deg,color-mix(in srgb,var(--teal) 20%,var(--surface)),var(--surface))', border: '1px solid color-mix(in srgb,var(--teal) 26%,transparent)' }}>
            <div style={{ fontFamily: ANTON, fontSize: 24, color: 'var(--teal)' }}>{weightDelta == null ? '—' : `${weightDelta <= 0 ? '−' : '+'} ${Math.abs(weightDelta)} kg`}</div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: 'var(--muted)', marginTop: 4 }}>POIDS {weightDelta != null && weightDelta > 0 ? 'PRIS' : 'PERDU'}</div>
          </div>
          <div style={{ borderRadius: 13, padding: 14, textAlign: 'center', background: 'linear-gradient(135deg,color-mix(in srgb,var(--lime) 18%,var(--surface)),var(--surface))', border: '1px solid color-mix(in srgb,var(--lime) 26%,transparent)' }}>
            <div style={{ fontFamily: ANTON, fontSize: 24, color: 'var(--lime)' }}>{totalLostCm > 0 ? `− ${Math.round(totalLostCm * 10) / 10} cm` : '— cm'}</div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: 'var(--muted)', marginTop: 4 }}>AU TOTAL</div>
          </div>
        </div>
      </div>

      {/* Indicateurs clés (cliquables → change la courbe) */}
      <div>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--dim)', fontWeight: 600, margin: '2px 2px 9px' }}>Tes indicateurs · touche pour la courbe</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
          {METRICS.filter((mt) => ['weight', 'bodyFat', 'muscleMass', 'hydration'].includes(mt.key)).map((mt, i) => {
            const st = metricStat(mt.key)
            const improved = st.delta == null ? null : mt.goodDown ? st.delta < 0 : st.delta > 0
            const deltaColor = improved == null ? 'var(--dim)' : improved ? 'var(--teal)' : 'var(--coral)'
            const isSel = activeMetricKey === mt.key
            return (
              <button key={mt.key} onClick={() => setSelectedMetric(mt.key)} style={{ textAlign: 'left', background: isSel ? `color-mix(in srgb,${mt.color} 8%,var(--surface))` : 'var(--surface)', border: `1px solid ${isSel ? mt.color : 'var(--border)'}`, borderTop: `3px solid ${mt.color}`, borderRadius: 13, padding: 13, cursor: 'pointer', animation: 'lbRise .5s ease both', animationDelay: `${0.05 + i * 0.07}s` }}>
                <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.08em', color: 'var(--muted)', textTransform: 'uppercase' }}>{mt.label}</div>
                <div style={{ fontFamily: ANTON, fontSize: 25, color: 'var(--text)', margin: '5px 0 3px' }}>{fmt(st.cur)}<span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: "'Inter'" }}> {mt.unit}</span></div>
                <div style={{ fontSize: 12, color: deltaColor, fontWeight: 600 }}>
                  {st.delta == null ? '—' : `${st.delta > 0 ? '↑ +' : st.delta < 0 ? '↓ −' : ''}${Math.abs(st.delta)} ${mt.unit}`}
                  <span style={{ color: 'var(--dim)', fontWeight: 400 }}> depuis le départ</span>
                </div>
                {secondaryFor(mt.key) && (
                  <div style={{ fontSize: 11, color: mt.color, fontWeight: 600, marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 7, background: `color-mix(in srgb,${mt.color} 12%,transparent)` }}>{secondaryFor(mt.key)}</div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Chips : toutes les métriques disponibles */}
      {availableMetrics.length > 1 && (
        <div className="lb-scroll" style={{ display: 'flex', gap: 7, overflowX: 'auto', padding: '0 0 2px' }}>
          {availableMetrics.map((mt) => {
            const isSel = activeMetricKey === mt.key
            return (
              <button key={mt.key} onClick={() => setSelectedMetric(mt.key)} style={{ flex: 'none', padding: '8px 13px', borderRadius: 999, background: isSel ? `color-mix(in srgb,${mt.color} 16%,var(--surface))` : 'var(--surface)', border: `1px solid ${isSel ? mt.color : 'var(--border)'}`, color: isSel ? mt.color : 'var(--muted)', fontFamily: "'Inter'", fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>{mt.short}</button>
            )
          })}
        </div>
      )}

      {/* Courbe de la métrique sélectionnée */}
      {n >= 2 ? (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: sel.color, fontWeight: 600 }}>Courbe · {sel.label} · {n} bilans</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 'none' }}>
              <span style={{ fontFamily: ANTON, fontSize: 17, color: 'var(--text)' }}>{fmt(selStat.cur)}<span style={{ fontFamily: "'Inter'", fontSize: 10, color: 'var(--muted)' }}> {sel.unit}</span></span>
              {selStat.delta != null && <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: '#04201b', background: sel.color, padding: '3px 8px', borderRadius: 8 }}>{selStat.delta > 0 ? '+' : selStat.delta < 0 ? '−' : ''}{Math.abs(selStat.delta)}</span>}
            </div>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
            <defs><linearGradient id="pwaMetricArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={sel.color} stopOpacity="0.28" /><stop offset="1" stopColor={sel.color} stopOpacity="0" /></linearGradient></defs>
            <line x1="14" y1={bottom} x2={W - 14} y2={bottom} stroke="var(--border)" strokeWidth="1" />
            <polygon points={chartArea} fill="url(#pwaMetricArea)" style={{ animation: 'lbFade .9s ease .3s both' }} />
            <polyline points={chartLine} fill="none" stroke={sel.color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 640, animation: 'lbDraw 1s cubic-bezier(.16,1,.3,1) forwards' }} />
            {pts.map((p, i) => {
              const isLast = i === pts.length - 1
              const showLabel = i % labelStep === 0 || isLast
              return (
                <g key={i}>
                  <circle cx={p[0]} cy={p[1]} r={isLast ? 4.5 : 2.4} fill={sel.color} stroke="var(--bg)" strokeWidth={isLast ? 2 : 1.2} style={isLast ? { transformBox: 'fill-box', transformOrigin: 'center', animation: 'lbPop .5s cubic-bezier(.16,1,.3,1) .8s both' } : undefined} />
                  {showLabel && <text x={Math.max(11, Math.min(p[0], W - 11))} y={p[1] - 7} fill="var(--text)" fontFamily="'JetBrains Mono', monospace" fontSize="6.5" fontWeight="700" textAnchor="middle">{fmt(selVals[i])}</text>}
                </g>
              )
            })}
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 9.5, color: 'var(--dim)', marginTop: 6 }}>
            {dateLabels.map((d, i) => <span key={i}>{d}</span>)}
          </div>
        </div>
      ) : (
        <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          Il faut au moins 2 bilans pour tracer la courbe de {sel.label.toLowerCase()}.
        </div>
      )}

      {/* Mensurations interactives */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Mensurations</div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>{filledCount}/{ZONE_DEFS.length} zones{lastMeasDate ? ` · dernière session ${lastMeasDate}` : ''}</div>
          </div>
          <div style={{ display: 'inline-flex', padding: 3, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', flex: 'none' }}>
            {(['face', 'back'] as const).map((v) => (
              <button key={v} onClick={() => setMeasView(v)} style={{ padding: '5px 13px', border: 'none', borderRadius: 7, background: measView === v ? 'var(--surface)' : 'transparent', color: measView === v ? 'var(--text)' : 'var(--muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{v === 'face' ? 'Face' : 'Dos'}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <svg viewBox="0 0 160 340" style={{ width: 150, height: 'auto', overflow: 'visible' }}>
            <g fill="color-mix(in srgb,var(--teal) 5%,transparent)" stroke="var(--border2)" strokeWidth="1.4" strokeLinejoin="round">
              <circle cx="80" cy="30" r="16" />
              <path d="M64 66 C64 60 72 54 80 54 C88 54 96 60 96 66 L100 98 C102 114 98 130 92 142 L88 176 C88 183 72 183 72 176 L68 142 C62 130 58 114 60 98 Z" />
              <path d="M64 70 C54 76 48 98 47 120 C46 130 53 131 55 121 C57 103 61 88 67 80" />
              <path d="M96 70 C106 76 112 98 113 120 C114 130 107 131 105 121 C103 103 99 88 93 80" />
              <path d="M74 177 C72 212 70 252 68 302 C67 314 77 314 79 302 C80 252 80 212 80 179" />
              <path d="M86 177 C88 212 90 252 92 302 C93 314 83 314 81 302 C80 252 80 212 80 179" />
            </g>
            {zones.map((z) => (
              <circle key={z.key} cx={z.cx} cy={z.cy} r="9" fill={z.dotFill} stroke={z.dotStroke} strokeWidth="2" style={{ cursor: 'pointer', animation: z.filled ? 'none' : 'lbPulse 1.8s infinite' }} onClick={() => openZone(z.key)} />
            ))}
          </svg>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {zones.map((z) => (
            <button key={z.key} onClick={() => openZone(z.key)} style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', borderRadius: 11, background: 'var(--surface2)', border: `1px solid ${activeZone === z.key ? 'var(--lime)' : 'var(--border)'}`, cursor: 'pointer' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: z.dotStroke, flex: 'none' }} />
              <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{z.label}</span>
              <span style={{ fontFamily: ANTON, fontSize: 15, color: 'var(--text)' }}>{z.curTxt}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: z.deltaColor, minWidth: 52, textAlign: 'right' }}>{z.deltaTxt}</span>
            </button>
          ))}
        </div>

        {draftKeys.length > 0 && (
          <button onClick={() => void saveSession()} disabled={saving} style={{ marginTop: 12, width: '100%', minHeight: 46, borderRadius: 12, border: 'none', cursor: saving ? 'default' : 'pointer', background: 'linear-gradient(120deg,var(--teal),var(--lime))', color: '#04201b', fontFamily: SORA, fontWeight: 700, fontSize: 14, opacity: saving ? 0.7 : 1 }}>{saving ? 'Enregistrement…' : `Enregistrer la session (${draftKeys.length})`}</button>
        )}
        {savedOk && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12.5, color: 'var(--teal)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            Session enregistrée · +10 XP
          </div>
        )}

        {lastMeasDate && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--border)' }}>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, marginBottom: 8 }}>Sessions enregistrées</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 11px', borderRadius: 9, background: 'var(--surface2)', fontSize: 12 }}>
              <span style={{ flex: 1, color: 'var(--text)' }}>{measLast ? new Date(measLast.measured_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span>
              <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600, background: 'color-mix(in srgb,var(--teal) 16%,transparent)', color: 'var(--teal)' }}>Saisi</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', background: 'linear-gradient(135deg,color-mix(in srgb,var(--lime) 12%,var(--surface)),var(--surface))', border: '1px solid color-mix(in srgb,var(--lime) 20%,var(--border))', borderRadius: 16, padding: 18 }}>
        <div style={{ fontFamily: SORA, fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>Continue comme ça !</div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>Chaque nouvelle mesure confirme ta progression.</div>
      </div>

      {/* Feuille de saisie mensuration */}
      {activeZone && activeZoneDef && (
        <div onClick={() => setActiveZone(null)} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', background: 'var(--surface)', borderTop: '1px solid var(--border2)', borderRadius: '26px 26px 0 0', padding: '22px 22px calc(26px + env(safe-area-inset-bottom, 0px))', animation: 'lbSheet .3s cubic-bezier(.16,1,.3,1)' }}>
            <div style={{ width: 40, height: 4, borderRadius: 999, background: 'var(--border2)', margin: '0 auto 18px' }} />
            <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--teal)', fontWeight: 600 }}>Mensuration</div>
            <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 19, color: 'var(--text)', margin: '4px 0 22px' }}>{activeZoneDef.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 22 }}>
              <button onClick={() => setSheetVal((v) => Math.max(0, Math.round((v - 0.5) * 2) / 2))} style={{ width: 52, height: 52, borderRadius: 15, background: 'var(--surface2)', border: '1px solid var(--border2)', color: 'var(--text)', fontSize: 26, fontWeight: 700, cursor: 'pointer', lineHeight: 1 }}>−</button>
              <div style={{ textAlign: 'center', minWidth: 110 }}>
                <div style={{ fontFamily: ANTON, fontSize: 44, color: 'var(--text)', lineHeight: 1 }}>{sheetVal}</div>
                <div style={{ fontFamily: MONO, fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>CENTIMÈTRES</div>
              </div>
              <button onClick={() => setSheetVal((v) => Math.round((v + 0.5) * 2) / 2)} style={{ width: 52, height: 52, borderRadius: 15, background: 'var(--lime)', border: 'none', color: '#04201b', fontSize: 26, fontWeight: 700, cursor: 'pointer', lineHeight: 1 }}>+</button>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setActiveZone(null)} style={{ flex: 'none', padding: '0 20px', minHeight: 50, borderRadius: 13, background: 'var(--surface2)', border: '1px solid var(--border2)', color: 'var(--muted)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
              <button onClick={validateZone} style={{ flex: 1, minHeight: 50, borderRadius: 13, border: 'none', cursor: 'pointer', background: 'linear-gradient(120deg,var(--teal),var(--lime))', color: '#04201b', fontFamily: SORA, fontWeight: 700, fontSize: 15 }}>Valider</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
