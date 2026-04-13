import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface Client {
  id: string; first_name: string; last_name: string; email?: string
  phone?: string; objective?: string; status: string; height_cm?: number
  gender?: string; notes?: string; created_at: string
}

interface Bilan {
  id: string; date: string; energy_level?: number
  sleep_quality?: number; water_liters?: number; main_objective?: string
  recommendations?: { category: string; priority: string; product?: string; reason: string }[]
}

const TABS = ['Profil', 'Bilans', 'Body Scan', 'Suivis']
const AVATAR_COLORS = ['#C9A84C','#2DD4BF','#A78BFA','#FB7185']

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [client, setClient] = useState<Client | null>(null)
  const [bilans, setBilans] = useState<Bilan[]>([])
  const [tab, setTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Client>>({})

  useEffect(() => { fetchClient() }, [id])

  const fetchClient = async () => {
    try {
      setLoading(true)
      const [clientRes, bilansRes] = await Promise.all([
        supabase.from('clients').select('*').eq('id', id).single(),
        supabase.from('bilans').select('*').eq('client_id', id).order('date', { ascending: false }),
      ])
      if (clientRes.error) throw clientRes.error
      setClient(clientRes.data)
      setEditForm(clientRes.data)
      setBilans(bilansRes.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const { error } = await supabase.from('clients').update(editForm).eq('id', id)
      if (error) throw error
      await fetchClient()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div style={{ padding:32, display:'flex', justifyContent:'center', paddingTop:80 }}>
      <div style={{ width:32, height:32, border:'2px solid rgba(201,168,76,0.2)', borderTop:'2px solid #C9A84C', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!client) return (
    <div style={{ padding:32, textAlign:'center', color:'#7A8099' }}>Client introuvable</div>
  )

  const initials = `${client.first_name[0]}${client.last_name[0]}`.toUpperCase()
  const avatarColor = AVATAR_COLORS[0]

  const inputStyle: React.CSSProperties = { width:'100%', background:'#1A1E27', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'11px 14px', fontSize:14, color:'#F0EDE8', fontFamily:'DM Sans,sans-serif', outline:'none' }
  const labelStyle: React.CSSProperties = { fontSize:11, color:'#7A8099', letterSpacing:'1px', textTransform:'uppercase', display:'block', marginBottom:6 }

  return (
    <div style={{ padding:32, maxWidth:900, margin:'0 auto' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Back */}
      <button onClick={() => navigate('/clients')} style={{ display:'flex', alignItems:'center', gap:8, background:'none', border:'none', color:'#7A8099', cursor:'pointer', fontFamily:'DM Sans,sans-serif', fontSize:13, marginBottom:24, padding:0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="15 18 9 12 15 6"/></svg>
        Retour aux clients
      </button>

      {/* Header client */}
      <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:28, background:'#13161C', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:24 }}>
        <div style={{ width:60, height:60, borderRadius:'50%', background:`${avatarColor}20`, color:avatarColor, border:`2px solid ${avatarColor}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontFamily:'Syne,sans-serif', fontWeight:700, flexShrink:0 }}>
          {initials}
        </div>
        <div style={{ flex:1 }}>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:800, color:'#F0EDE8', margin:'0 0 4px' }}>
            {client.first_name} {client.last_name}
          </h1>
          <p style={{ fontSize:13, color:'#7A8099', margin:0 }}>{client.objective || 'Objectif non défini'}</p>
        </div>
        <button
          onClick={() => navigate(`/clients/${id}/bilan/new`)}
          style={{ background:'#C9A84C', color:'#0B0D11', border:'none', borderRadius:10, padding:'11px 20px', fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:8, whiteSpace:'nowrap' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nouveau bilan
        </button>
      </div>

      {/* Onglets */}
      <div style={{ display:'flex', gap:4, marginBottom:24, background:'#13161C', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:4 }}>
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            style={{
              flex:1, padding:'9px', borderRadius:9, border:'none', cursor:'pointer', fontSize:13, fontFamily:'DM Sans,sans-serif', fontWeight: tab === i ? 500 : 400, transition:'all .15s',
              background: tab === i ? '#1A1E27' : 'transparent',
              color: tab === i ? '#F0EDE8' : '#7A8099',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ONGLET PROFIL */}
      {tab === 0 && (
        <div style={{ background:'#13161C', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:28 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
            <div>
              <label style={labelStyle}>Prénom</label>
              <input style={inputStyle} value={editForm.first_name || ''} onChange={e => setEditForm(f => ({...f, first_name: e.target.value}))} />
            </div>
            <div>
              <label style={labelStyle}>Nom</label>
              <input style={inputStyle} value={editForm.last_name || ''} onChange={e => setEditForm(f => ({...f, last_name: e.target.value}))} />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input style={inputStyle} value={editForm.email || ''} onChange={e => setEditForm(f => ({...f, email: e.target.value}))} />
            </div>
            <div>
              <label style={labelStyle}>Téléphone</label>
              <input style={inputStyle} value={editForm.phone || ''} onChange={e => setEditForm(f => ({...f, phone: e.target.value}))} />
            </div>
            <div>
              <label style={labelStyle}>Taille (cm)</label>
              <input style={inputStyle} type="number" value={editForm.height_cm || ''} onChange={e => setEditForm(f => ({...f, height_cm: parseFloat(e.target.value)}))} />
            </div>
            <div>
              <label style={labelStyle}>Statut</label>
              <select style={{...inputStyle, appearance:'none' as const}} value={editForm.status || 'actif'} onChange={e => setEditForm(f => ({...f, status: e.target.value}))}>
                <option value="actif">Actif</option>
                <option value="pause">En pause</option>
                <option value="inactif">Inactif</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={labelStyle}>Notes coach</label>
            <textarea style={{...inputStyle, resize:'vertical' as const}} rows={3} value={editForm.notes || ''} onChange={e => setEditForm(f => ({...f, notes: e.target.value}))} placeholder="Observations importantes..." />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ background:'#C9A84C', color:'#0B0D11', border:'none', borderRadius:10, padding:'12px 24px', fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, cursor:'pointer', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      )}

      {/* ONGLET BILANS */}
      {tab === 1 && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {bilans.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 0', background:'#13161C', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, color:'#4A5068' }}>
              <div style={{ fontSize:32, marginBottom:12 }}>📋</div>
              <div style={{ fontSize:14, marginBottom:4 }}>Aucun bilan enregistré</div>
              <button onClick={() => navigate(`/clients/${id}/bilan/new`)} style={{ marginTop:12, background:'#C9A84C', color:'#0B0D11', border:'none', borderRadius:8, padding:'10px 20px', fontFamily:'Syne,sans-serif', fontWeight:700, cursor:'pointer', fontSize:13 }}>
                Créer le premier bilan
              </button>
            </div>
          ) : (
            bilans.map(bilan => (
              <div key={bilan.id} style={{ background:'#13161C', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                  <div style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, color:'#F0EDE8' }}>
                    Bilan du {new Date(bilan.date).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })}
                  </div>
                  <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, background:'rgba(45,212,191,0.1)', color:'#2DD4BF' }}>Complété</span>
                </div>
                <div style={{ display:'flex', gap:20 }}>
                  {bilan.energy_level !== undefined && bilan.energy_level > 0 && (
                    <div style={{ fontSize:12, color:'#7A8099' }}>Énergie : <span style={{ color:'#C9A84C' }}>{'★'.repeat(bilan.energy_level)}</span></div>
                  )}
                  {bilan.sleep_quality !== undefined && bilan.sleep_quality > 0 && (
                    <div style={{ fontSize:12, color:'#7A8099' }}>Sommeil : <span style={{ color:'#A78BFA' }}>{'★'.repeat(bilan.sleep_quality)}</span></div>
                  )}
                  {bilan.water_liters !== undefined && (
                    <div style={{ fontSize:12, color:'#7A8099' }}>Eau : <span style={{ color:'#2DD4BF' }}>{bilan.water_liters}L/j</span></div>
                  )}
                </div>
                {bilan.recommendations && bilan.recommendations.length > 0 && (
                  <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize:11, color:'#7A8099', marginBottom:8, letterSpacing:'1px', textTransform:'uppercase' }}>Recommandations</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                      {bilan.recommendations.map((r, i) => (
                        <span key={i} style={{ fontSize:11, padding:'4px 12px', borderRadius:20, background: r.priority === 'haute' ? 'rgba(251,113,133,0.1)' : 'rgba(201,168,76,0.1)', color: r.priority === 'haute' ? '#FB7185' : '#C9A84C' }}>
                          {r.category} {r.product ? `— ${r.product}` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ONGLET BODY SCAN */}
      {tab === 2 && (
        <div style={{ textAlign:'center', padding:'48px 0', background:'#13161C', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14 }}>
          <div style={{ fontSize:32, marginBottom:12 }}>⚖️</div>
          <div style={{ fontSize:14, color:'#7A8099', marginBottom:16 }}>Aucun body scan enregistré</div>
          <button
            onClick={() => navigate(`/clients/${id}/scan/new`)}
            style={{ background:'#C9A84C', color:'#0B0D11', border:'none', borderRadius:8, padding:'10px 20px', fontFamily:'Syne,sans-serif', fontWeight:700, cursor:'pointer', fontSize:13 }}
          >
            Faire un body scan
          </button>
        </div>
      )}

      {/* ONGLET SUIVIS */}
      {tab === 3 && (
        <div style={{ textAlign:'center', padding:'48px 0', background:'#13161C', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14 }}>
          <div style={{ fontSize:32, marginBottom:12 }}>📈</div>
          <div style={{ fontSize:14, color:'#7A8099', marginBottom:16 }}>Aucun suivi enregistré</div>
          <button
            onClick={() => navigate(`/clients/${id}/suivi/new`)}
            style={{ background:'#C9A84C', color:'#0B0D11', border:'none', borderRadius:8, padding:'10px 20px', fontFamily:'Syne,sans-serif', fontWeight:700, cursor:'pointer', fontSize:13 }}
          >
            Démarrer un suivi
          </button>
        </div>
      )}
    </div>
  )
}
