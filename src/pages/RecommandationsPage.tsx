import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface Rec { category: string; priority: string; product?: string; reason: string }

interface BilanWithClient {
  id: string; date: string; client_id: string; recommendations: Rec[]
  clients: { first_name: string; last_name: string } | null
}

const PRIORITY_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  haute:   { bg: 'rgba(251,113,133,0.1)',  text: '#FB7185', label: 'Priorité haute' },
  moyenne: { bg: 'rgba(201,168,76,0.1)',   text: '#C9A84C', label: 'Priorité moyenne' },
  basse:   { bg: 'rgba(122,128,153,0.1)',  text: '#7A8099', label: 'Priorité basse' },
}

const CATEGORY_COLORS: Record<string, string> = {
  'Sommeil': '#A78BFA', 'Hydratation': '#2DD4BF', 'Stress': '#FB7185',
  'Grignotage': '#C9A84C', 'Digestion': '#2DD4BF', 'Énergie': '#F0C96A',
}

export default function RecommandationsPage() {
  const navigate = useNavigate()
  const [bilans, setBilans] = useState<BilanWithClient[]>([])
  const [loading, setLoading] = useState(true)
  const [filterPriority, setFilterPriority] = useState('toutes')
  const [filterCategory, setFilterCategory] = useState('toutes')

  useEffect(() => {
    supabase.from('bilans').select('id, date, client_id, recommendations, clients(first_name, last_name)')
      .not('recommendations', 'eq', '[]').order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => { setBilans((data as unknown as BilanWithClient[]) || []); setLoading(false) })
  }, [])

  const allRecs = bilans.flatMap(b =>
    (b.recommendations || []).map(r => ({
      ...r, clientName: b.clients ? `${b.clients.first_name} ${b.clients.last_name}` : 'Inconnu',
      clientId: b.client_id, date: b.date, bilanId: b.id,
    }))
  )

  const categories = ['toutes', ...Array.from(new Set(allRecs.map(r => r.category)))]
  const filtered = allRecs.filter(r => {
    const okP = filterPriority === 'toutes' || r.priority === filterPriority
    const okC = filterCategory === 'toutes' || r.category === filterCategory
    return okP && okC
  })
  const countByPriority = (p: string) => allRecs.filter(r => r.priority === p).length

  return (
    <div style={{ padding: 32, maxWidth: 1000, margin: '0 auto' }}>
      <style>{`@keyframes shimmer{0%,100%{opacity:.4}50%{opacity:.7}}`}</style>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: '#F0EDE8', margin: '0 0 4px', letterSpacing: '-0.3px' }}>Recommandations</h1>
        <p style={{ fontSize: 13, color: '#7A8099', margin: 0 }}>Synthèse de toutes les recommandations générées depuis les bilans</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Total', value: allRecs.length, color: '#F0EDE8' },
          { label: 'Priorité haute', value: countByPriority('haute'), color: '#FB7185' },
          { label: 'Priorité moyenne', value: countByPriority('moyenne'), color: '#C9A84C' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, color: '#7A8099', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontFamily: 'Syne, sans-serif', fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['toutes','haute','moyenne','basse'].map(p => (
            <button key={p} onClick={() => setFilterPriority(p)} style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: 'none', fontFamily: 'DM Sans, sans-serif', transition: 'all .15s',
              background: filterPriority === p ? '#C9A84C' : 'rgba(255,255,255,0.05)', color: filterPriority === p ? '#0B0D11' : '#7A8099', fontWeight: filterPriority === p ? 600 : 400,
            }}>{p.charAt(0).toUpperCase() + p.slice(1)}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {categories.map(c => (
            <button key={c} onClick={() => setFilterCategory(c)} style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: 'none', fontFamily: 'DM Sans, sans-serif', transition: 'all .15s',
              background: filterCategory === c ? 'rgba(45,212,191,0.15)' : 'rgba(255,255,255,0.05)', color: filterCategory === c ? '#2DD4BF' : '#7A8099',
            }}>{c.charAt(0).toUpperCase() + c.slice(1)}</button>
          ))}
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        Array.from({ length: 4 }).map((_, i) => <div key={i} style={{ background: '#13161C', borderRadius: 12, padding: 20, marginBottom: 12, height: 80, animation: 'shimmer 1.5s infinite' }} />)
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, color: '#4A5068' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
          <div style={{ fontSize: 14, color: '#7A8099', marginBottom: 4 }}>Aucune recommandation</div>
          <div style={{ fontSize: 12 }}>Les recommandations apparaissent après les bilans</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((r, i) => {
            const ps = PRIORITY_STYLE[r.priority] || PRIORITY_STYLE.basse
            const catColor = CATEGORY_COLORS[r.category] || '#7A8099'
            return (
              <div key={i} style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 14, cursor: 'pointer', transition: 'border-color .15s' }}
                onClick={() => navigate(`/clients/${r.clientId}`)}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: `${catColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 16 }}>{r.category === 'Sommeil' ? '◑' : r.category === 'Hydratation' ? '◓' : r.category === 'Stress' ? '◒' : r.category === 'Énergie' ? '✦' : '◐'}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: catColor }}>{r.category}</span>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: ps.bg, color: ps.text, fontWeight: 500 }}>{ps.label}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#7A8099', marginBottom: 4 }}>{r.reason}</div>
                  {r.product && <div style={{ fontSize: 12, color: '#C9A84C', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/></svg>
                    {r.product}
                  </div>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 12, color: '#F0EDE8', fontWeight: 500, marginBottom: 3 }}>{r.clientName}</div>
                  <div style={{ fontSize: 11, color: '#4A5068' }}>{new Date(r.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
