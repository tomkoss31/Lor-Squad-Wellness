import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getSupabaseClient } from '../services/supabaseClient'

const GOOGLE_MAPS = 'https://www.google.com/maps/place/LA+BASE+Shakes%26Drinks/@49.1619589,5.3840559,17z'

function MetricDelta({ value, unit, reverse = false }: { value: number; unit: string; reverse?: boolean }) {
  const good = reverse ? value < 0 : value > 0
  const color = value === 0 ? '#9CA3AF' : good ? '#0D9488' : '#DC2626'
  const prefix = value > 0 ? '+' : ''
  return <span style={{ fontSize: 11, color, fontWeight: 600 }}>{prefix}{value.toFixed(1)}{unit}</span>
}

function MiniChart({ data, field, color }: { data: Record<string, number | string>[]; field: string; color: string }) {
  if (data.length < 2) return null
  const values = data.map(d => Number(d[field]))
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const W = 200, H = 60, PAD = 8

  const points = data.map((d, i) => ({
    x: PAD + (i / (data.length - 1)) * (W - PAD * 2),
    y: H - PAD - ((Number(d[field]) - min) / range) * (H - PAD * 2),
    val: Number(d[field]),
  }))

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <svg width={W} height={H} style={{ overflow: 'visible', width: '100%' }}>
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.5" fill={color} stroke="#fff" strokeWidth="1.5"/>
          {(i === 0 || i === points.length - 1) && (
            <text x={p.x} y={p.y - 9} textAnchor="middle" fontSize="9" fontWeight="600" fill="#6B7280">{p.val.toFixed(1)}</text>
          )}
        </g>
      ))}
    </svg>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReportData = Record<string, any>

export function EvolutionReportPage() {
  const { token } = useParams<{ token: string }>()
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    ;(async () => {
      const sb = await getSupabaseClient()
      if (!sb) { setError(true); setLoading(false); return }
      const { data, error: err } = await sb.from('client_evolution_reports').select('*').eq('token', token).single()
      if (err || !data) { setError(true); setLoading(false); return }
      setReport(data as ReportData)
      setLoading(false)
    })()
  }, [token])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F4F2EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '2px solid rgba(184,146,42,0.2)', borderTop: '2px solid #B8922A', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (error || !report) return (
    <div style={{ minHeight: '100vh', background: '#F4F2EE', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', fontFamily: 'DM Sans, sans-serif' }}>
      <div>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 48, fontWeight: 800, color: '#B8922A', marginBottom: 16, opacity: 0.3 }}>404</div>
        <div style={{ fontSize: 16, color: '#111827', marginBottom: 8 }}>Rapport introuvable ou expiré</div>
        <div style={{ fontSize: 13, color: '#9CA3AF' }}>Ce lien est valable 90 jours après génération.</div>
      </div>
    </div>
  )

  const metrics = (report.metrics_history ?? []) as Record<string, number | string>[]
  const insights = (report.insights ?? []) as { type: string; icon: string; title: string; message: string }[]
  const recommendations = (report.recommendations ?? []) as { ref: string; name: string; reason: string; publicPrice?: number; public_price?: number }[]
  const first = metrics[0]
  const latest = metrics[metrics.length - 1]
  const reportUrl = window.location.href

  const shareWA = () => window.open(`https://wa.me/?text=${encodeURIComponent(`Mon rapport d'évolution Lor'Squad Wellness : ${reportUrl}`)}`)
  const shareTG = () => window.open(`https://t.me/share/url?url=${encodeURIComponent(reportUrl)}`)
  const shareSMS = () => window.open(`sms:?body=${encodeURIComponent(`Mon rapport d'évolution : ${reportUrl}`)}`)
  const copyLink = () => navigator.clipboard.writeText(reportUrl)

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');*{box-sizing:border-box;margin:0;padding:0}body{background:#F4F2EE}`}</style>
      <div style={{ minHeight: '100vh', background: '#F4F2EE', fontFamily: 'DM Sans, sans-serif', color: '#111827' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 60px' }}>

          {/* HERO */}
          <div style={{ background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 60%, #F4F2EE 100%)', padding: '28px 24px 24px', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 30, height: 30, background: '#B8922A', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14, color: '#111827' }}>Lor&apos;<span style={{ color: '#B8922A' }}>Squad</span> Wellness</div>
              </div>
              <a href={GOOGLE_MAPS} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(184,146,42,0.1)', border: '1px solid rgba(184,146,42,0.2)', borderRadius: 20, padding: '5px 12px', textDecoration: 'none' }}>
                <span style={{ color: '#B8922A', fontSize: 11 }}>★★★★★</span>
                <span style={{ fontSize: 11, color: '#B8922A', fontWeight: 500 }}>Avis Google</span>
              </a>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(184,146,42,0.15)', border: '2px solid rgba(184,146,42,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, color: '#B8922A', flexShrink: 0 }}>
                {(report.client_first_name as string)?.[0]}{(report.client_last_name as string)?.[0]}
              </div>
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 22, color: '#111827', lineHeight: 1.1 }}>
                  {report.client_first_name} {report.client_last_name}
                </div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>Rapport d&apos;évolution · Coach {report.coach_name}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                  {report.assessments_count} bilan{(report.assessments_count as number) > 1 ? 's' : ''} · Du {new Date(report.first_assessment_date as string).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} au {new Date(report.latest_assessment_date as string).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
            </div>

            {report.program_title && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.2)', borderRadius: 20, padding: '4px 12px', fontSize: 11, color: '#0D9488', fontWeight: 500 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                {report.program_title}
              </div>
            )}
          </div>

          <div style={{ padding: '0 16px' }}>

            {/* MÉTRIQUES CLÉS */}
            {first && latest && (
              <div style={{ margin: '20px 0' }}>
                <div style={{ fontSize: 10, color: '#9CA3AF', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10 }}>Évolution depuis le début</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {[
                    { label: 'Poids', unit: 'kg', first: Number(first.weight), latest: Number(latest.weight), color: '#B8922A', reverse: true },
                    { label: 'Masse grasse', unit: 'kg', first: Number(first.bodyFat) * Number(first.weight) / 100, latest: Number(latest.bodyFat) * Number(latest.weight) / 100, color: '#DC2626', reverse: true },
                    { label: 'Masse musculaire', unit: '%', first: (Number(first.muscleMass) / Number(first.weight)) * 100, latest: (Number(latest.muscleMass) / Number(latest.weight)) * 100, color: '#0D9488', reverse: false },
                    { label: 'Hydratation', unit: '%', first: Number(first.hydration), latest: Number(latest.hydration), color: '#7C3AED', reverse: false },
                  ].map(({ label, unit, first: firstVal, latest: latestVal, color, reverse }) => {
                    const delta = latestVal - firstVal
                    return (
                      <div key={field} style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12, padding: '12px 14px', borderTop: `2px solid ${color}` }}>
                        <div style={{ fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{label}</div>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 22, color, lineHeight: 1 }}>{latestVal.toFixed(1)}{unit}</div>
                        <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>
                          Départ : {firstVal.toFixed(1)}{unit} · <MetricDelta value={delta} unit={unit} reverse={reverse}/>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* COURBES */}
            {metrics.length >= 2 && (
              <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 14, padding: 16, marginBottom: 20 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 4 }}>Courbes d&apos;évolution</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 16 }}>Progression sur l&apos;ensemble des bilans</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {[
                    { label: 'Poids (kg)', field: 'weight', color: '#B8922A' },
                    { label: 'Masse grasse (kg)', field: 'bodyFatKg', color: '#DC2626' },
                    { label: 'Masse musculaire (%)', field: 'musclePct', color: '#0D9488' },
                  ].map(({ label, field, color }) => (
                    <div key={field}>
                      <div style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>{label}</div>
                      <MiniChart data={metrics.map(m => ({
                        ...m,
                        bodyFatKg: Number((Number(m.bodyFat) * Number(m.weight) / 100).toFixed(1)),
                        musclePct: Number(((Number(m.muscleMass) / Number(m.weight)) * 100).toFixed(1)),
                      }))} field={field} color={color}/>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TABLEAU */}
            {metrics.length > 0 && (
              <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 14, padding: 16, marginBottom: 20 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 12 }}>Tableau complet</div>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as unknown as undefined }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 500 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                        {['Date', 'Poids', 'M. Grasse', 'Muscle', 'Hydrat.', 'Viscéral', 'Âge M.'].map(h => (
                          <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.map((row, i) => {
                        const prev = i > 0 ? metrics[i - 1] : null
                        // Color: green if improving, red if worsening, neutral otherwise
                        const tc = (field: string, lower: boolean) => {
                          if (!prev) return '#111827'
                          const cur = Number(row[field]), p = Number(prev[field])
                          if (cur === p) return '#111827'
                          const better = lower ? cur < p : cur > p
                          return better ? '#0D9488' : '#DC2626'
                        }
                        return (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', background: i % 2 === 0 ? '#FAFAF9' : '#FFFFFF' }}>
                          <td style={{ padding: '8px', color: '#6B7280', whiteSpace: 'nowrap' }}>{new Date(row.date as string).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                          <td style={{ padding: '8px', fontWeight: 600, color: tc('weight', true) }}>{Number(row.weight).toFixed(1)}</td>
                          <td style={{ padding: '8px', fontWeight: 600, color: tc('bodyFat', true) }}>{Number(row.bodyFat).toFixed(1)}%</td>
                          <td style={{ padding: '8px', fontWeight: 600, color: tc('muscleMass', false) }}>{Number(row.muscleMass).toFixed(1)}</td>
                          <td style={{ padding: '8px', fontWeight: 600, color: tc('hydration', false) }}>{Number(row.hydration).toFixed(1)}%</td>
                          <td style={{ padding: '8px', fontWeight: 600, color: Number(row.visceralFat) >= 13 ? '#DC2626' : Number(row.visceralFat) >= 9 ? '#F59E0B' : '#0D9488' }}>{row.visceralFat}</td>
                          <td style={{ padding: '8px', color: '#111827' }}>{row.metabolicAge}</td>
                        </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* INSIGHTS */}
            {insights.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 12 }}>Ce qui a évolué</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {insights.map((insight, i) => {
                    const borderColor = insight.type === 'positive' ? '#0D9488' : insight.type === 'warning' ? '#DC2626' : insight.type === 'goal' ? '#B8922A' : '#7C3AED'
                    const bgColor = insight.type === 'positive' ? 'rgba(13,148,136,0.05)' : insight.type === 'warning' ? 'rgba(220,38,38,0.05)' : insight.type === 'goal' ? 'rgba(184,146,42,0.05)' : 'rgba(124,58,237,0.05)'
                    return (
                      <div key={i} style={{ background: bgColor, border: `1px solid ${borderColor}20`, borderLeft: `3px solid ${borderColor}`, borderRadius: '0 10px 10px 0', padding: '12px 14px' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: borderColor, marginBottom: 4 }}>{insight.icon} {insight.title}</div>
                        <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}>{insight.message}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* PRODUITS CONSEILLÉS */}
            {recommendations.length > 0 && (
              <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 14, padding: 16, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 4 }}>Produits conseillés</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>Sélectionnés selon tes derniers résultats</div>
                  </div>
                  <a href="https://www.myherbalife.com/fr-fr" target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#0D9488', color: '#fff', borderRadius: 8, padding: '7px 12px', textDecoration: 'none', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h18v18H3z" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                    Commander
                  </a>
                </div>
                {recommendations.map((reco, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderTop: i > 0 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(184,146,42,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B8922A" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 2 }}>{reco.name}</div>
                      <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.5 }}>{reco.reason}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#B8922A', fontFamily: 'Syne, sans-serif', flexShrink: 0 }}>
                      {(reco.public_price ?? reco.publicPrice)?.toFixed(2)} €
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                  <a href="https://apps.apple.com/fr/app/herbalife-shop/id1154285940" target="_blank" rel="noopener noreferrer"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px 0', borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)', background: '#FAFAF9', color: '#6B7280', fontSize: 10, fontWeight: 500, textDecoration: 'none' }}>
                    App Store
                  </a>
                  <a href="https://play.google.com/store/apps/details?id=com.hrbl.mobile.android.ordering&hl=fr" target="_blank" rel="noopener noreferrer"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px 0', borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)', background: '#FAFAF9', color: '#6B7280', fontSize: 10, fontWeight: 500, textDecoration: 'none' }}>
                    Google Play
                  </a>
                  <a href="https://www.myherbalife.com/fr-fr" target="_blank" rel="noopener noreferrer"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px 0', borderRadius: 8, border: '1px solid rgba(184,146,42,0.2)', background: 'rgba(184,146,42,0.06)', color: '#B8922A', fontSize: 10, fontWeight: 600, textDecoration: 'none' }}>
                    MyHerbalife.com
                  </a>
                </div>
              </div>
            )}

            {/* PROCHAIN RDV */}
            {report.next_follow_up && (
              <div style={{ background: 'rgba(13,148,136,0.06)', border: '1px solid rgba(13,148,136,0.15)', borderRadius: 12, padding: '14px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 11, color: '#0D9488', fontWeight: 600, marginBottom: 2 }}>Prochain rendez-vous</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', fontFamily: 'Syne, sans-serif' }}>
                    {new Date(report.next_follow_up as string).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>La Base — Verdun</div>
                </div>
                <a href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent("RDV Lor'Squad Wellness")}&location=${encodeURIComponent('La Base Shakes & Drinks, Verdun')}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0D9488', color: '#fff', borderRadius: 9, padding: '8px 14px', textDecoration: 'none', fontSize: 12, fontWeight: 500, flexShrink: 0 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  Google Agenda
                </a>
              </div>
            )}

            {/* PARTAGE */}
            <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 14, padding: 16, marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
                <div style={{ width: 72, height: 72, background: '#FFFFFF', borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=${encodeURIComponent(reportUrl)}&bgcolor=FFFFFF&color=B8922A`} alt="QR" width={70} height={70}/>
                </div>
                <div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13, color: '#111827', marginBottom: 3 }}>Ton rapport d&apos;évolution</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 8 }}>Partage ou scanne pour retrouver ce rapport</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button onClick={shareWA} style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: 'rgba(37,211,102,0.1)', color: '#16A34A', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>WhatsApp</button>
                    <button onClick={shareTG} style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: 'rgba(0,136,204,0.1)', color: '#0088CC', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>Telegram</button>
                    <button onClick={shareSMS} style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: 'rgba(0,0,0,0.06)', color: '#6B7280', fontSize: 10, fontWeight: 500, cursor: 'pointer' }}>SMS</button>
                    <button onClick={copyLink} style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: 'rgba(184,146,42,0.1)', color: '#B8922A', fontSize: 10, fontWeight: 500, cursor: 'pointer' }}>Copier</button>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'center', fontSize: 10, color: '#9CA3AF' }}>Lor&apos;Squad Wellness · Rapport confidentiel · Valable 90 jours</div>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
