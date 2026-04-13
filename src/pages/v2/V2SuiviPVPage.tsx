import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ClientProduit } from '../../lib/types'
import { LorBadge } from '../../components/ui/LorBadge'
import { LorButton } from '../../components/ui/LorButton'
import { LorEmptyState } from '../../components/ui/LorEmptyState'

function daysBetween(a: string, b: string) { return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400000) }

export function V2SuiviPVPage() {
  const [produits, setProduits] = useState<ClientProduit[]>([])
  const [clients, setClients] = useState<{ id: string; first_name: string; last_name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ client_id: '', produit_name: '', start_date: '', duration_days: 30, pv: 0, price_public: 0 })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const [p, c] = await Promise.all([
      supabase.from('client_produits').select('*').eq('status', 'actif').order('start_date', { ascending: false }),
      supabase.from('clients').select('id, first_name, last_name'),
    ])
    setProduits(p.data || []); setClients(c.data || []); setLoading(false)
  }

  useEffect(() => { load() }, [])

  const today = new Date().toISOString().split('T')[0]
  const pvTotal = produits.reduce((s, p) => s + (p.pv ?? 0), 0)
  const renewSoon = produits.filter(p => p.expected_end_date && daysBetween(today, p.expected_end_date) <= 7).length

  async function handleCreate() {
    if (!form.client_id || !form.produit_name || !form.start_date) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const endDate = new Date(new Date(form.start_date).getTime() + form.duration_days * 86400000).toISOString().split('T')[0]
    await supabase.from('client_produits').insert({ ...form, coach_id: user?.id, expected_end_date: endDate, status: 'actif' })
    await load(); setShowModal(false); setSaving(false)
  }

  const inp = { background: '#1A1E27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', color: '#F0EDE8', fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' as const }
  const lbl = { fontSize: 11, fontWeight: 600 as const, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#7A8099', display: 'block', marginBottom: 6 }

  return (
    <div style={{ padding: '32px 36px', fontFamily: 'DM Sans, sans-serif', maxWidth: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div><p style={{ color: '#4A5068', fontSize: 12, marginBottom: 4 }}>Volume</p><h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 26, color: '#F0EDE8' }}>Suivi PV</h1></div>
        <LorButton onClick={() => setShowModal(true)}>+ Ajouter</LorButton>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {[{ label: 'PV total actifs', value: pvTotal.toFixed(2), color: '#C9A84C' }, { label: 'Clients avec produits', value: new Set(produits.map(p => p.client_id)).size, color: '#2DD4BF' }, { label: 'Renouvellements cette semaine', value: renewSoon, color: '#FB7185' }].map(s => (
          <div key={s.label} style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 20 }}>
            <p style={{ color: '#7A8099', fontSize: 12, marginBottom: 8 }}>{s.label}</p>
            <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 28, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {loading ? <p style={{ color: '#7A8099' }}>Chargement…</p> : produits.length === 0
        ? <LorEmptyState icon="◈" title="Aucun programme actif" action={<LorButton onClick={() => setShowModal(true)}>Ajouter</LorButton>} />
        : produits.map(p => {
          const daysElapsed = daysBetween(p.start_date, today)
          const totalDays = p.expected_end_date ? daysBetween(p.start_date, p.expected_end_date) : 30
          const daysLeft = p.expected_end_date ? daysBetween(today, p.expected_end_date) : 0
          const pct = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100))
          const client = clients.find(c => c.id === p.client_id)
          return (
            <div key={p.id} style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 20, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <p style={{ color: '#F0EDE8', fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{p.produit_name}</p>
                  <p style={{ color: '#7A8099', fontSize: 12 }}>{client ? `${client.first_name} ${client.last_name}` : '—'}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {daysLeft <= 7 ? <LorBadge variant="danger">Renouvellement imminent</LorBadge> : daysLeft <= 14 ? <LorBadge variant="warning">À renouveler</LorBadge> : <LorBadge variant="success">Actif</LorBadge>}
                  {p.pv != null && <span style={{ color: '#C9A84C', fontSize: 12, fontWeight: 600 }}>{p.pv} PV</span>}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: '#4A5068' }}>Début {new Date(p.start_date).toLocaleDateString('fr-FR')}</span>
                <span style={{ fontSize: 11, color: daysLeft <= 7 ? '#FB7185' : '#7A8099' }}>{daysLeft} jours restants</span>
              </div>
              <div style={{ height: 4, background: '#1A1E27', borderRadius: 2 }}>
                <div style={{ height: '100%', borderRadius: 2, width: `${pct}%`, background: daysLeft <= 7 ? '#FB7185' : daysLeft <= 14 ? '#C9A84C' : '#2DD4BF', transition: 'width 0.3s' }} />
              </div>
            </div>
          )
        })}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 32, width: '100%', maxWidth: 480, fontFamily: 'DM Sans, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: '#F0EDE8' }}>Nouveau programme</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#7A8099', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label style={lbl}>Client</label>
                <select style={inp} value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}>
                  <option value="">Sélectionner…</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Nom du produit</label><input style={inp} value={form.produit_name} onChange={e => setForm(f => ({ ...f, produit_name: e.target.value }))} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={lbl}>Date de début</label><input style={inp} type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                <div><label style={lbl}>Durée (jours)</label><input style={inp} type="number" value={form.duration_days} onChange={e => setForm(f => ({ ...f, duration_days: Number(e.target.value) }))} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={lbl}>PV</label><input style={inp} type="number" step="0.01" value={form.pv || ''} onChange={e => setForm(f => ({ ...f, pv: Number(e.target.value) }))} /></div>
                <div><label style={lbl}>Prix public</label><input style={inp} type="number" step="0.01" value={form.price_public || ''} onChange={e => setForm(f => ({ ...f, price_public: Number(e.target.value) }))} /></div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <LorButton variant="secondary" onClick={() => setShowModal(false)}>Annuler</LorButton>
                <LorButton loading={saving} onClick={handleCreate}>Créer</LorButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
