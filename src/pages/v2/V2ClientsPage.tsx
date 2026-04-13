import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClients } from '../../hooks/useClients'
import { Client } from '../../lib/types'
import { LorButton } from '../../components/ui/LorButton'
import { LorBadge } from '../../components/ui/LorBadge'
import { LorInput } from '../../components/ui/LorInput'
import { LorEmptyState } from '../../components/ui/LorEmptyState'

const PAGE_SIZE = 12

function CreateClientModal({ onClose, onCreate }: { onClose: () => void; onCreate: (data: Partial<Client>) => Promise<unknown> }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', gender: '', height_cm: '', objective: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.first_name || !form.last_name) { setError('Prénom et nom requis'); return }
    setLoading(true)
    try {
      await onCreate({
        ...form,
        gender: (form.gender || undefined) as Client['gender'],
        height_cm: form.height_cm ? Number(form.height_cm) : undefined,
        status: 'actif'
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally { setLoading(false) }
  }

  const inputStyle = { background: '#1A1E27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', color: '#F0EDE8', fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: 11, fontWeight: 600 as const, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#7A8099', display: 'block', marginBottom: 6 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
      <div style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 32, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', fontFamily: 'DM Sans, sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 20, color: '#F0EDE8' }}>Nouveau client</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#7A8099', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={labelStyle}>Prénom *</label><input style={inputStyle} value={form.first_name} onChange={set('first_name')} placeholder="Marie" /></div>
            <div><label style={labelStyle}>Nom *</label><input style={inputStyle} value={form.last_name} onChange={set('last_name')} placeholder="Dupont" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={labelStyle}>Email</label><input style={inputStyle} type="email" value={form.email} onChange={set('email')} placeholder="marie@email.com" /></div>
            <div><label style={labelStyle}>Téléphone</label><input style={inputStyle} value={form.phone} onChange={set('phone')} placeholder="06 XX XX XX XX" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Genre</label>
              <select style={inputStyle} value={form.gender} onChange={set('gender')}>
                <option value="">Non précisé</option>
                <option value="femme">Femme</option>
                <option value="homme">Homme</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div><label style={labelStyle}>Taille (cm)</label><input style={inputStyle} type="number" value={form.height_cm} onChange={set('height_cm')} placeholder="168" /></div>
          </div>
          <div>
            <label style={labelStyle}>Objectif principal</label>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={form.objective} onChange={set('objective')} placeholder="Perte de poids, regain d'énergie..." />
          </div>
          {error && <p style={{ color: '#FB7185', fontSize: 13 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <LorButton variant="secondary" type="button" onClick={onClose}>Annuler</LorButton>
            <LorButton type="submit" loading={loading}>Créer le client</LorButton>
          </div>
        </form>
      </div>
    </div>
  )
}

export function V2ClientsPage() {
  const navigate = useNavigate()
  const { clients, loading, createClient } = useClients()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('tous')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)

  const filtered = clients
    .filter(c => statusFilter === 'tous' || c.status === statusFilter)
    .filter(c => `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()))

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div style={{ padding: '32px 36px', fontFamily: 'DM Sans, sans-serif', maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <p style={{ color: '#4A5068', fontSize: 12, marginBottom: 4 }}>Gestion</p>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 26, color: '#F0EDE8' }}>Clients</h1>
        </div>
        <LorButton onClick={() => setShowModal(true)}>+ Nouveau client</LorButton>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <LorInput placeholder="Rechercher un client..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} style={{ maxWidth: 280 }} />
        {['tous', 'actif', 'pause', 'inactif'].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }} style={{ padding: '8px 16px', borderRadius: 20, border: '1px solid', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', background: statusFilter === s ? 'rgba(201,168,76,0.1)' : 'transparent', borderColor: statusFilter === s ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.07)', color: statusFilter === s ? '#C9A84C' : '#7A8099' }}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[1,2,3,4,5,6].map(i => <div key={i} style={{ height: 120, background: '#13161C', borderRadius: 12, animation: 'shimmer 1.5s infinite' }} />)}
        </div>
      ) : paginated.length === 0 ? (
        <LorEmptyState icon="👥" title="Aucun client trouvé" subtitle="Crée ton premier client pour commencer." action={<LorButton onClick={() => setShowModal(true)}>Créer un client</LorButton>} />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {paginated.map(c => (
              <div key={c.id} style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 20, cursor: 'pointer', transition: 'border-color 0.15s' }}
                onClick={() => navigate(`/v2/clients/${c.id}`)}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(201,168,76,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C9A84C', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                    {c.first_name.charAt(0)}{c.last_name.charAt(0)}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <p style={{ color: '#F0EDE8', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.first_name} {c.last_name}</p>
                    <p style={{ color: '#4A5068', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.objective ?? '—'}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <LorBadge variant={c.status === 'actif' ? 'success' : c.status === 'pause' ? 'warning' : 'default'}>{c.status}</LorBadge>
                  <span style={{ color: '#C9A84C', fontSize: 12 }}>Voir →</span>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 24 }}>
              <LorButton variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Précédent</LorButton>
              <span style={{ color: '#7A8099', fontSize: 13 }}>{page} / {totalPages}</span>
              <LorButton variant="secondary" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Suivant →</LorButton>
            </div>
          )}
        </>
      )}

      {showModal && <CreateClientModal onClose={() => setShowModal(false)} onCreate={createClient} />}
      <style>{`@keyframes shimmer{0%,100%{opacity:.4}50%{opacity:.7}}`}</style>
    </div>
  )
}
