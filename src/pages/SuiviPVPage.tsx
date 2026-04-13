import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface ClientProduit {
  id: string; client_id: string; produit_name: string; start_date: string; expected_end_date?: string
  pv?: number; price_public?: number; status: string; notes?: string
  clients?: { first_name: string; last_name: string }
}

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  actif: { bg: 'rgba(45,212,191,0.1)', text: '#2DD4BF' },
  'terminé': { bg: 'rgba(122,128,153,0.1)', text: '#7A8099' },
  pause: { bg: 'rgba(201,168,76,0.1)', text: '#C9A84C' },
  'annulé': { bg: 'rgba(251,113,133,0.1)', text: '#FB7185' },
}

function daysLeft(endDate?: string): number | null {
  if (!endDate) return null
  return Math.ceil((new Date(endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
}

function daysElapsed(startDate: string): number {
  return Math.max(0, Math.floor((new Date().getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)))
}

function RenewalBadge({ days }: { days: number | null }) {
  if (days === null) return null
  if (days < 0) return <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'rgba(122,128,153,0.1)', color: '#7A8099' }}>Terminé</span>
  if (days <= 7) return <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'rgba(251,113,133,0.12)', color: '#FB7185', fontWeight: 600 }}>⚠ Renouvellement dans {days}j</span>
  if (days <= 14) return <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'rgba(201,168,76,0.12)', color: '#C9A84C', fontWeight: 500 }}>Renouvellement dans {days}j</span>
  return <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'rgba(45,212,191,0.08)', color: '#2DD4BF' }}>{days}j restants</span>
}

function ProgressBar({ startDate, endDate }: { startDate: string; endDate?: string }) {
  if (!endDate) return null
  const total = new Date(endDate).getTime() - new Date(startDate).getTime()
  const elapsed = new Date().getTime() - new Date(startDate).getTime()
  const pct = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
  const color = pct >= 85 ? '#FB7185' : pct >= 70 ? '#C9A84C' : '#2DD4BF'
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: '#4A5068' }}>{daysElapsed(startDate)} jours écoulés</span>
        <span style={{ fontSize: 11, color }}>{pct}%</span>
      </div>
      <div style={{ height: 4, background: '#1A1E27', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

export default function SuiviPVPage() {
  const { user } = useAuth()
  const [produits, setProduits] = useState<ClientProduit[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('actif')
  const [clients, setClients] = useState<{ id: string; first_name: string; last_name: string }[]>([])
  const [form, setForm] = useState({ client_id: '', produit_name: '', start_date: new Date().toISOString().split('T')[0], duration_days: '30', pv: '', price_public: '', notes: '' })
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [produitsRes, clientsRes] = await Promise.all([
      supabase.from('client_produits').select('*, clients(first_name, last_name)').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, first_name, last_name').eq('status', 'actif').order('first_name'),
    ])
    setProduits((produitsRes.data as unknown as ClientProduit[]) || [])
    setClients(clientsRes.data || [])
    setLoading(false)
  }

  const filtered = produits.filter(p => filterStatus === 'tous' || p.status === filterStatus)
  const totalPV = produits.filter(p => p.status === 'actif').reduce((sum, p) => sum + (p.pv || 0), 0)
  const activeCount = produits.filter(p => p.status === 'actif').length
  const urgentRenewals = produits.filter(p => { const d = daysLeft(p.expected_end_date); return p.status === 'actif' && d !== null && d <= 7 }).length

  const handleCreate = async () => {
    if (!form.client_id || !form.produit_name || !form.start_date) { setFormError('Client, produit et date de début sont obligatoires.'); return }
    try {
      setSaving(true); setFormError(null)
      const startDate = new Date(form.start_date); const endDate = new Date(startDate); endDate.setDate(endDate.getDate() + parseInt(form.duration_days || '30'))
      const { error } = await supabase.from('client_produits').insert({
        client_id: form.client_id, coach_id: user!.id, produit_name: form.produit_name,
        start_date: form.start_date, expected_end_date: endDate.toISOString().split('T')[0],
        pv: parseFloat(form.pv) || null, price_public: parseFloat(form.price_public) || null,
        notes: form.notes || null, status: 'actif',
      })
      if (error) throw error
      setShowModal(false); setForm({ client_id: '', produit_name: '', start_date: new Date().toISOString().split('T')[0], duration_days: '30', pv: '', price_public: '', notes: '' })
      await fetchAll()
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Erreur') } finally { setSaving(false) }
  }

  const inputStyle: React.CSSProperties = { width: '100%', background: '#1A1E27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#F0EDE8', fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { fontSize: 11, color: '#7A8099', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: 6 }

  return (
    <div style={{ padding: 32, maxWidth: 1100, margin: '0 auto' }}>
      <style>{`@keyframes shimmer{0%,100%{opacity:.4}50%{opacity:.7}}`}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: '#F0EDE8', margin: '0 0 4px', letterSpacing: '-0.3px' }}>Suivi PV & Produits</h1>
          <p style={{ fontSize: 13, color: '#7A8099', margin: 0 }}>Programmes actifs, renouvellements et points volume</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ background: '#C9A84C', color: '#0B0D11', border: 'none', borderRadius: 10, padding: '11px 20px', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Ajouter un programme
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'PV ce mois', value: totalPV.toFixed(1), color: '#C9A84C', sub: 'Points volume actifs' },
          { label: 'Programmes actifs', value: activeCount, color: '#2DD4BF', sub: 'En cours' },
          { label: 'Renouvellements urgents', value: urgentRenewals, color: '#FB7185', sub: 'Dans les 7 jours' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '18px 20px', borderTop: `2px solid ${s.color}` }}>
            <div style={{ fontSize: 11, color: '#7A8099', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontFamily: 'Syne, sans-serif', fontWeight: 700, color: s.color, lineHeight: 1, marginBottom: 5 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#4A5068' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['actif','pause','terminé','tous'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{
            padding: '7px 16px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: 'none', fontFamily: 'DM Sans, sans-serif', transition: 'all .15s',
            background: filterStatus === s ? '#C9A84C' : 'rgba(255,255,255,0.05)', color: filterStatus === s ? '#0B0D11' : '#7A8099', fontWeight: filterStatus === s ? 600 : 400,
          }}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
        ))}
      </div>

      {/* Liste */}
      {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} style={{ background: '#13161C', borderRadius: 12, padding: 20, marginBottom: 12, height: 100, animation: 'shimmer 1.5s infinite' }} />)
      : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, color: '#4A5068' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📦</div>
          <div style={{ fontSize: 14, color: '#7A8099', marginBottom: 4 }}>Aucun programme {filterStatus !== 'tous' ? filterStatus : ''}</div>
          <button onClick={() => setShowModal(true)} style={{ marginTop: 12, background: '#C9A84C', color: '#0B0D11', border: 'none', borderRadius: 8, padding: '10px 20px', fontFamily: 'Syne, sans-serif', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Ajouter un programme</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(p => {
            const ss = STATUS_STYLE[p.status] || STATUS_STYLE.actif
            const days = daysLeft(p.expected_end_date)
            return (
              <div key={p.id} style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: '#F0EDE8' }}>{p.produit_name}</span>
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: ss.bg, color: ss.text, fontWeight: 500 }}>{p.status}</span>
                      <RenewalBadge days={days} />
                    </div>
                    {p.clients && <div style={{ fontSize: 13, color: '#7A8099' }}>{p.clients.first_name} {p.clients.last_name}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {p.pv && <div style={{ fontSize: 18, fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#C9A84C' }}>{p.pv} PV</div>}
                    {p.price_public && <div style={{ fontSize: 12, color: '#7A8099' }}>{p.price_public}€</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 20, marginBottom: 12, fontSize: 12, color: '#4A5068' }}>
                  <span>Début : {new Date(p.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  {p.expected_end_date && <span>Fin prévue : {new Date(p.expected_end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                </div>
                <ProgressBar startDate={p.start_date} endDate={p.expected_end_date} />
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: '#F0EDE8' }}>Nouveau programme</div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#7A8099', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
            </div>
            {formError && <div style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.2)', borderRadius: 8, padding: '10px 14px', color: '#FB7185', fontSize: 13, marginBottom: 16 }}>{formError}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><label style={labelStyle}>Client *</label><select style={{ ...inputStyle, appearance: 'none', color: form.client_id ? '#F0EDE8' : '#4A5068' }} value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}><option value="">Sélectionner un client</option>{clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}</select></div>
              <div><label style={labelStyle}>Produit / Programme *</label><input style={inputStyle} placeholder="Formula 1 Nutritional Shake Mix" value={form.produit_name} onChange={e => setForm(f => ({ ...f, produit_name: e.target.value }))} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>Date de début *</label><input style={inputStyle} type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                <div><label style={labelStyle}>Durée (jours)</label><select style={{ ...inputStyle, appearance: 'none' }} value={form.duration_days} onChange={e => setForm(f => ({ ...f, duration_days: e.target.value }))}><option value="21">21 jours</option><option value="30">30 jours</option><option value="60">60 jours</option><option value="90">90 jours</option></select></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>Points Volume (PV)</label><input style={inputStyle} type="number" step="0.1" placeholder="34.5" value={form.pv} onChange={e => setForm(f => ({ ...f, pv: e.target.value }))} /></div>
                <div><label style={labelStyle}>Prix public (€)</label><input style={inputStyle} type="number" step="0.01" placeholder="49.90" value={form.price_public} onChange={e => setForm(f => ({ ...f, price_public: e.target.value }))} /></div>
              </div>
              <div><label style={labelStyle}>Notes</label><textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2} placeholder="Observations..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#7A8099', fontFamily: 'DM Sans, sans-serif', fontSize: 14, cursor: 'pointer' }}>Annuler</button>
              <button onClick={handleCreate} disabled={saving} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: '#C9A84C', color: '#0B0D11', fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Création...' : 'Créer le programme'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
