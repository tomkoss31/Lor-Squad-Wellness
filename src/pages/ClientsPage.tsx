import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Client {
  id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  objective?: string
  status: string
  created_at: string
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  actif:   { bg: 'rgba(45,212,191,0.12)',  text: '#2DD4BF' },
  inactif: { bg: 'rgba(122,128,153,0.12)', text: '#7A8099' },
  pause:   { bg: 'rgba(201,168,76,0.12)',  text: '#C9A84C' },
}

const AVATAR_COLORS = ['#C9A84C', '#2DD4BF', '#A78BFA', '#FB7185', '#F0C96A', '#60A5FA']

function Avatar({ firstName, lastName, index }: { firstName: string; lastName: string; index: number }) {
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length]
  const initials = `${firstName[0]}${lastName[0]}`.toUpperCase()
  return (
    <div style={{
      width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
      background: `${color}20`, color, border: `1px solid ${color}30`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, fontWeight: 600, fontFamily: 'Syne, sans-serif',
    }}>
      {initials}
    </div>
  )
}

export default function ClientsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('tous')
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    phone: '', objective: '', gender: '', height_cm: '',
  })
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => { fetchClients() }, [])

  const fetchClients = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setClients(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = clients.filter(c => {
    const matchSearch = `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'tous' || c.status === filterStatus
    return matchSearch && matchStatus
  })

  const handleCreate = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setFormError('Prénom et nom sont obligatoires.')
      return
    }
    try {
      setCreating(true)
      setFormError(null)
      const { error } = await supabase.from('clients').insert({
        ...form,
        height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
        coach_id: user!.id,
        status: 'actif',
      })
      if (error) throw error
      setShowModal(false)
      setForm({ first_name: '', last_name: '', email: '', phone: '', objective: '', gender: '', height_cm: '' })
      await fetchClients()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur lors de la création')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div style={{ padding: 32, maxWidth: 1100, margin: '0 auto' }}>
      <style>{`
        @keyframes shimmer { 0%,100%{opacity:.4} 50%{opacity:.7} }
        .client-row:hover { background: rgba(255,255,255,0.02) !important; cursor: pointer; }
        .lor-input-s { width:100%; background:#1A1E27; border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:11px 14px; font-size:14px; color:#F0EDE8; font-family:'DM Sans',sans-serif; outline:none; transition:border .2s; }
        .lor-input-s:focus { border-color:rgba(201,168,76,0.5); }
        .lor-input-s::placeholder { color:#4A5068; }
        .lor-select-s { width:100%; background:#1A1E27; border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:11px 14px; font-size:14px; color:#F0EDE8; font-family:'DM Sans',sans-serif; outline:none; appearance:none; }
        .lor-select-s:focus { border-color:rgba(201,168,76,0.5); }
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:28 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:24, fontWeight:800, color:'#F0EDE8', margin:'0 0 4px', letterSpacing:'-0.3px' }}>
            Mes clients
          </h1>
          <p style={{ fontSize:13, color:'#7A8099', margin:0 }}>
            {clients.filter(c => c.status === 'actif').length} actifs · {clients.length} au total
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ background:'#C9A84C', color:'#0B0D11', border:'none', borderRadius:10, padding:'11px 20px', fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nouveau client
        </button>
      </div>

      {/* Filtres */}
      <div style={{ display:'flex', gap:12, marginBottom:24 }}>
        <div style={{ position:'relative', flex:1 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4A5068" strokeWidth="1.5" style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            className="lor-input-s"
            style={{ paddingLeft:38 }}
            placeholder="Rechercher un client..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {['tous','actif','pause','inactif'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            style={{
              padding:'0 16px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer', border:'none', fontFamily:'DM Sans,sans-serif', transition:'all .15s',
              background: filterStatus === s ? '#C9A84C' : 'rgba(255,255,255,0.05)',
              color: filterStatus === s ? '#0B0D11' : '#7A8099',
            }}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div style={{ background:'#13161C', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, overflow:'hidden' }}>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width:42, height:42, borderRadius:'50%', background:'rgba(255,255,255,0.05)', animation:'shimmer 1.5s infinite', flexShrink:0 }} />
              <div style={{ flex:1 }}>
                <div style={{ height:13, width:'30%', background:'rgba(255,255,255,0.05)', borderRadius:4, marginBottom:7, animation:'shimmer 1.5s infinite' }} />
                <div style={{ height:10, width:'20%', background:'rgba(255,255,255,0.05)', borderRadius:4, animation:'shimmer 1.5s infinite' }} />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 0', color:'#4A5068' }}>
            <div style={{ fontSize:32, marginBottom:12 }}>👤</div>
            <div style={{ fontSize:14, marginBottom:4 }}>Aucun client trouvé</div>
            <div style={{ fontSize:12 }}>Modifie ta recherche ou crée un nouveau client</div>
          </div>
        ) : (
          filtered.map((client, i) => {
            const sc = STATUS_COLORS[client.status] || STATUS_COLORS.actif
            return (
              <div
                key={client.id}
                className="client-row"
                onClick={() => navigate(`/clients/${client.id}`)}
                style={{ display:'flex', alignItems:'center', gap:14, padding:'15px 20px', borderBottom: i < filtered.length-1 ? '1px solid rgba(255,255,255,0.05)' : 'none', transition:'background .15s' }}
              >
                <Avatar firstName={client.first_name} lastName={client.last_name} index={i} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:500, color:'#F0EDE8' }}>
                    {client.first_name} {client.last_name}
                  </div>
                  <div style={{ fontSize:12, color:'#7A8099', marginTop:2 }}>
                    {client.objective || 'Objectif non défini'}
                  </div>
                </div>
                <div style={{ fontSize:12, color:'#4A5068' }}>
                  {new Date(client.created_at).toLocaleDateString('fr-FR', { day:'numeric', month:'short' })}
                </div>
                <span style={{ fontSize:11, padding:'4px 12px', borderRadius:20, background:sc.bg, color:sc.text, fontWeight:500 }}>
                  {client.status}
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4A5068" strokeWidth="1.5"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            )
          })
        )}
      </div>

      {/* Modal création */}
      {showModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
          <div style={{ background:'#13161C', border:'1px solid rgba(255,255,255,0.1)', borderRadius:16, padding:32, width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
              <div style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:700, color:'#F0EDE8' }}>Nouveau client</div>
              <button onClick={() => setShowModal(false)} style={{ background:'none', border:'none', color:'#7A8099', cursor:'pointer', fontSize:20, lineHeight:1 }}>×</button>
            </div>

            {formError && (
              <div style={{ background:'rgba(251,113,133,0.08)', border:'1px solid rgba(251,113,133,0.2)', borderRadius:8, padding:'10px 14px', color:'#FB7185', fontSize:13, marginBottom:16 }}>
                {formError}
              </div>
            )}

            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={{ fontSize:11, color:'#7A8099', letterSpacing:'1px', textTransform:'uppercase', display:'block', marginBottom:6 }}>Prénom *</label>
                  <input className="lor-input-s" placeholder="Marie" value={form.first_name} onChange={e => setForm(f => ({...f, first_name: e.target.value}))} />
                </div>
                <div>
                  <label style={{ fontSize:11, color:'#7A8099', letterSpacing:'1px', textTransform:'uppercase', display:'block', marginBottom:6 }}>Nom *</label>
                  <input className="lor-input-s" placeholder="Dupont" value={form.last_name} onChange={e => setForm(f => ({...f, last_name: e.target.value}))} />
                </div>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#7A8099', letterSpacing:'1px', textTransform:'uppercase', display:'block', marginBottom:6 }}>Email</label>
                <input className="lor-input-s" type="email" placeholder="marie@email.com" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={{ fontSize:11, color:'#7A8099', letterSpacing:'1px', textTransform:'uppercase', display:'block', marginBottom:6 }}>Téléphone</label>
                  <input className="lor-input-s" placeholder="06 12 34 56 78" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} />
                </div>
                <div>
                  <label style={{ fontSize:11, color:'#7A8099', letterSpacing:'1px', textTransform:'uppercase', display:'block', marginBottom:6 }}>Genre</label>
                  <select className="lor-select-s" value={form.gender} onChange={e => setForm(f => ({...f, gender: e.target.value}))}>
                    <option value="">Choisir</option>
                    <option value="homme">Homme</option>
                    <option value="femme">Femme</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#7A8099', letterSpacing:'1px', textTransform:'uppercase', display:'block', marginBottom:6 }}>Taille (cm)</label>
                <input className="lor-input-s" type="number" placeholder="165" value={form.height_cm} onChange={e => setForm(f => ({...f, height_cm: e.target.value}))} />
              </div>
              <div>
                <label style={{ fontSize:11, color:'#7A8099', letterSpacing:'1px', textTransform:'uppercase', display:'block', marginBottom:6 }}>Objectif principal</label>
                <select className="lor-select-s" value={form.objective} onChange={e => setForm(f => ({...f, objective: e.target.value}))}>
                  <option value="">Choisir un objectif</option>
                  <option value="perte-de-poids">Perte de poids</option>
                  <option value="prise-de-muscle">Prise de muscle</option>
                  <option value="energie">Boost d'énergie</option>
                  <option value="bien-etre">Bien-être général</option>
                  <option value="sport">Performance sportive</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
            </div>

            <div style={{ display:'flex', gap:12, marginTop:24 }}>
              <button onClick={() => setShowModal(false)} style={{ flex:1, padding:'12px', borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'#7A8099', fontFamily:'DM Sans,sans-serif', fontSize:14, cursor:'pointer' }}>
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                style={{ flex:2, padding:'12px', borderRadius:10, border:'none', background:'#C9A84C', color:'#0B0D11', fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, cursor:'pointer', opacity: creating ? 0.7 : 1 }}
              >
                {creating ? 'Création...' : 'Créer le client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
