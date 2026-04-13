import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Bilan, Recommendation } from '../../lib/types'
import { LorBadge } from '../../components/ui/LorBadge'
import { LorEmptyState } from '../../components/ui/LorEmptyState'

export function V2RecommandationsPage() {
  const [bilans, setBilans] = useState<Bilan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('bilans').select('*, clients(first_name, last_name)').order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => { setBilans(data || []); setLoading(false) })
  }, [])

  const allRecs = bilans.flatMap(b =>
    (b.recommendations || []).map((r: Recommendation) => ({ ...r, bilan: b }))
  )

  const priorityOrder = { haute: 0, moyenne: 1, basse: 2 }
  const sorted = [...allRecs].sort((a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2))

  return (
    <div style={{ padding: '32px 36px', fontFamily: 'DM Sans, sans-serif', maxWidth: 900 }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: '#4A5068', fontSize: 12, marginBottom: 4 }}>Analyse</p>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 26, color: '#F0EDE8' }}>Recommandations</h1>
      </div>

      {loading ? <p style={{ color: '#7A8099' }}>Chargement…</p> : sorted.length === 0 ? (
        <LorEmptyState icon="✦" title="Aucune recommandation" subtitle="Les recommandations apparaîtront après les bilans." />
      ) : sorted.map((r, i) => (
        <div key={i} style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 20, marginBottom: 12, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <LorBadge variant={r.priority === 'haute' ? 'danger' : r.priority === 'moyenne' ? 'warning' : 'default'}>{r.priority}</LorBadge>
              <span style={{ color: '#C9A84C', fontSize: 12, fontWeight: 600 }}>{r.category}</span>
            </div>
            <p style={{ color: '#F0EDE8', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{r.reason}</p>
            {r.product && <p style={{ color: '#7A8099', fontSize: 12 }}>Produit suggéré : <span style={{ color: '#2DD4BF' }}>{r.product}</span></p>}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ color: '#4A5068', fontSize: 11 }}>{new Date(r.bilan.created_at).toLocaleDateString('fr-FR')}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
