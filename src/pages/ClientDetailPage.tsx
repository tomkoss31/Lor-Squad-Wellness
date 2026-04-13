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

interface BodyScan {
  id: string; date: string; weight_kg?: number; fat_mass_percent?: number
  muscle_mass_kg?: number; water_percent?: number; visceral_fat_level?: number
  bmr?: number; metabolic_age?: number; bmi?: number
  waist_cm?: number; hip_cm?: number; chest_cm?: number; notes?: string
}

interface Suivi {
  id: string; date: string; week_number?: number
  energy_level?: number; hunger_level?: number; sleep_quality?: number
  digestion_quality?: number; bloating?: number; water_liters?: number
  meals_respected?: boolean; small_victories?: string; remaining_blockers?: string; notes?: string
}

const TABS = ['Profil', 'Bilans', 'Body Scan', 'Suivis']
const AVATAR_COLORS = ['#C9A84C','#2DD4BF','#A78BFA','#FB7185']

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [client, setClient] = useState<Client | null>(null)
  const [bilans, setBilans] = useState<Bilan[]>([])
  const [bodyScans, setBodyScans] = useState<BodyScan[]>([])
  const [suivis, setSuivis] = useState<Suivi[]>([])
  const [tab, setTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Client>>({})

  useEffect(() => { fetchClient() }, [id])

  const fetchClient = async () => {
    try {
      setLoading(true)
      const [clientRes, bilansRes, scansRes, suivisRes] = await Promise.all([
        supabase.from('clients').select('*').eq('id', id).single(),
        supabase.from('bilans').select('*').eq('client_id', id).order('date', { ascending: false }),
        supabase.from('body_scans').select('*').eq('client_id', id).order('date', { ascending: false }),
        supabase.from('suivis').select('*').eq('client_id', id).order('date', { ascending: false }),
      ])
      if (clientRes.error) throw clientRes.error
      setClient(clientRes.data)
      setEditForm(clientRes.data)
      setBilans(bilansRes.data || [])
      setBodyScans(scansRes.data || [])
      setSuivis(suivisRes.data || [])
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

  if (!client) return <div style={{ padding:32, textAlign:'center', color:'#7A8099' }}>Client introuvable</div>

  const initials = `${client.first_name[0]}${client.last_name[0]}`.toUpperCase()
  const avatarColor = AVATAR_COLORS[0]
  const inputStyle: React.CSSProperties = { width:'100%', background:'#1A1E27', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'11px 14px', fontSize:14, color:'#F0EDE8', fontFamily:'DM Sans,sans-serif', outline:'none' }
  const labelStyle: React.CSSProperties = { fontSize:11, color:'#7A8099', letterSpacing:'1px', textTransform:'uppercase', display:'block', marginBottom:6 }

  return (
    <div className="page-enter" style={{ padding:32, maxWidth:900, margin:'0 auto' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <button onClick={() => navigate('/clients')} style={{ display:'flex', alignItems:'center', gap:8, background:'none', border:'none', color:'#7A8099', cursor:'pointer', fontFamily:'DM Sans,sans-serif', fontSize:13, marginBottom:24, padding:0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="15 18 9 12 15 6"/></svg>
        Retour aux clients
      </button>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:28, background:'#13161C', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:24 }}>
        <div style={{ width:60, height:60, borderRadius:'50%', background:`${avatarColor}20`, color:avatarColor, border:`2px solid ${avatarColor}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontFamily:'Syne,sans-serif', fontWeight:700, flexShrink:0 }}>{initials}</div>
        <div style={{ flex:1 }}>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:800, color:'#F0EDE8', margin:'0 0 4px' }}>{client.first_name} {client.last_name}</h1>
          <p style={{ fontSize:13, color:'#7A8099', margin:0 }}>{client.objective || 'Objectif non défini'}</p>
        </div>
        <button onClick={() => navigate(`/clients/${id}/bilan/new`)} style={{ background:'#C9A84C', color:'#0B0D11', border:'none', borderRadius:10, padding:'11px 20px', fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:8, whiteSpace:'nowrap' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nouveau bilan
        </button>
      </div>

      {/* Onglets */}
      <div style={{ display:'flex', gap:4, marginBottom:24, background:'#13161C', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:4 }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{ flex:1, padding:'9px', borderRadius:9, border:'none', cursor:'pointer', fontSize:13, fontFamily:'DM Sans,sans-serif', fontWeight: tab === i ? 500 : 400, transition:'all .15s', background: tab === i ? '#1A1E27' : 'transparent', color: tab === i ? '#F0EDE8' : '#7A8099' }}>{t}</button>
        ))}
      </div>

      {/* PROFIL */}
      {tab === 0 && (
        <div style={{ background:'#13161C', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:28 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
            <div><label style={labelStyle}>Prénom</label><input style={inputStyle} value={editForm.first_name || ''} onChange={e => setEditForm(f => ({...f, first_name: e.target.value}))} /></div>
            <div><label style={labelStyle}>Nom</label><input style={inputStyle} value={editForm.last_name || ''} onChange={e => setEditForm(f => ({...f, last_name: e.target.value}))} /></div>
            <div><label style={labelStyle}>Email</label><input style={inputStyle} value={editForm.email || ''} onChange={e => setEditForm(f => ({...f, email: e.target.value}))} /></div>
            <div><label style={labelStyle}>Téléphone</label><input style={inputStyle} value={editForm.phone || ''} onChange={e => setEditForm(f => ({...f, phone: e.target.value}))} /></div>
            <div><label style={labelStyle}>Taille (cm)</label><input style={inputStyle} type="number" value={editForm.height_cm || ''} onChange={e => setEditForm(f => ({...f, height_cm: parseFloat(e.target.value)}))} /></div>
            <div><label style={labelStyle}>Statut</label><select style={{...inputStyle, appearance:'none' as const}} value={editForm.status || 'actif'} onChange={e => setEditForm(f => ({...f, status: e.target.value}))}><option value="actif">Actif</option><option value="pause">En pause</option><option value="inactif">Inactif</option></select></div>
          </div>
          <div style={{ marginBottom:16 }}><label style={labelStyle}>Notes coach</label><textarea style={{...inputStyle, resize:'vertical' as const}} rows={3} value={editForm.notes || ''} onChange={e => setEditForm(f => ({...f, notes: e.target.value}))} placeholder="Observations importantes..." /></div>
          <button onClick={handleSave} disabled={saving} style={{ background:'#C9A84C', color:'#0B0D11', border:'none', borderRadius:10, padding:'12px 24px', fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, cursor:'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</button>
        </div>
      )}

      {/* BILANS */}
      {tab === 1 && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {bilans.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 0', background:'#13161C', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, color:'#4A5068' }}>
              <div style={{ fontSize:32, marginBottom:12 }}>📋</div>
              <div style={{ fontSize:14, marginBottom:4 }}>Aucun bilan enregistré</div>
              <button onClick={() => navigate(`/clients/${id}/bilan/new`)} style={{ marginTop:12, background:'#C9A84C', color:'#0B0D11', border:'none', borderRadius:8, padding:'10px 20px', fontFamily:'Syne,sans-serif', fontWeight:700, cursor:'pointer', fontSize:13 }}>Créer le premier bilan</button>
            </div>
          ) : bilans.map(bilan => (
            <div key={bilan.id} style={{ background:'#13161C', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <div style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, color:'#F0EDE8' }}>Bilan du {new Date(bilan.date).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })}</div>
                <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, background:'rgba(45,212,191,0.1)', color:'#2DD4BF' }}>Complété</span>
              </div>
              <div style={{ display:'flex', gap:20 }}>
                {bilan.energy_level !== undefined && bilan.energy_level > 0 && <div style={{ fontSize:12, color:'#7A8099' }}>Énergie : <span style={{ color:'#C9A84C' }}>{'★'.repeat(bilan.energy_level)}</span></div>}
                {bilan.sleep_quality !== undefined && bilan.sleep_quality > 0 && <div style={{ fontSize:12, color:'#7A8099' }}>Sommeil : <span style={{ color:'#A78BFA' }}>{'★'.repeat(bilan.sleep_quality)}</span></div>}
                {bilan.water_liters !== undefined && <div style={{ fontSize:12, color:'#7A8099' }}>Eau : <span style={{ color:'#2DD4BF' }}>{bilan.water_liters}L/j</span></div>}
              </div>
              {bilan.recommendations && bilan.recommendations.length > 0 && (
                <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize:11, color:'#7A8099', marginBottom:8, letterSpacing:'1px', textTransform:'uppercase' }}>Recommandations</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {bilan.recommendations.map((r, i) => (
                      <span key={i} style={{ fontSize:11, padding:'4px 12px', borderRadius:20, background: r.priority === 'haute' ? 'rgba(251,113,133,0.1)' : 'rgba(201,168,76,0.1)', color: r.priority === 'haute' ? '#FB7185' : '#C9A84C' }}>{r.category} {r.product ? `— ${r.product}` : ''}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* BODY SCAN */}
      {tab === 2 && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button onClick={() => navigate(`/clients/${id}/scan/new`)} style={{ background:'#C9A84C', color:'#0B0D11', border:'none', borderRadius:10, padding:'10px 18px', fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nouveau scan
            </button>
          </div>

          {bodyScans.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 0', background:'#13161C', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, color:'#4A5068' }}>
              <div style={{ fontSize:32, marginBottom:12 }}>⚖️</div>
              <div style={{ fontSize:14, color:'#7A8099', marginBottom:4 }}>Aucun body scan enregistré</div>
            </div>
          ) : (
            <>
              {(() => {
                const scan = bodyScans[0]
                const metrics = [
                  { label: 'Masse grasse', value: scan.fat_mass_percent, unit: '%', max: 50, color: '#FB7185' },
                  { label: 'Masse musculaire', value: scan.muscle_mass_kg, unit: ' kg', max: 80, color: '#2DD4BF' },
                  { label: 'Hydratation', value: scan.water_percent, unit: '%', max: 100, color: '#A78BFA' },
                  { label: 'Graisse viscérale', value: scan.visceral_fat_level, unit: '', max: 30, color: '#C9A84C' },
                ]
                return (
                  <div style={{ background:'#13161C', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:24 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                      <div style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, color:'#F0EDE8' }}>Dernier scan</div>
                      <span style={{ fontSize:12, color:'#7A8099' }}>{new Date(scan.date).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })}</span>
                    </div>
                    <div style={{ display:'flex', gap:16, marginBottom:24 }}>
                      {scan.weight_kg && <div style={{ flex:1, background:'#1A1E27', borderRadius:12, padding:'16px', textAlign:'center' }}><div style={{ fontSize:36, fontFamily:'Syne,sans-serif', fontWeight:800, color:'#C9A84C', lineHeight:1 }}>{scan.weight_kg}</div><div style={{ fontSize:12, color:'#7A8099', marginTop:4 }}>kg</div></div>}
                      {scan.bmi && <div style={{ flex:1, background:'#1A1E27', borderRadius:12, padding:'16px', textAlign:'center' }}><div style={{ fontSize:36, fontFamily:'Syne,sans-serif', fontWeight:800, color: scan.bmi < 18.5 || scan.bmi > 25 ? '#FB7185' : '#2DD4BF', lineHeight:1 }}>{scan.bmi}</div><div style={{ fontSize:12, color:'#7A8099', marginTop:4 }}>IMC</div></div>}
                      {scan.metabolic_age && <div style={{ flex:1, background:'#1A1E27', borderRadius:12, padding:'16px', textAlign:'center' }}><div style={{ fontSize:36, fontFamily:'Syne,sans-serif', fontWeight:800, color:'#A78BFA', lineHeight:1 }}>{scan.metabolic_age}</div><div style={{ fontSize:12, color:'#7A8099', marginTop:4 }}>Âge méta.</div></div>}
                      {scan.bmr && <div style={{ flex:1, background:'#1A1E27', borderRadius:12, padding:'16px', textAlign:'center' }}><div style={{ fontSize:28, fontFamily:'Syne,sans-serif', fontWeight:800, color:'#F0C96A', lineHeight:1 }}>{scan.bmr}</div><div style={{ fontSize:12, color:'#7A8099', marginTop:4 }}>kcal/j</div></div>}
                    </div>
                    {metrics.map(m => m.value !== undefined && m.value !== null && (
                      <div key={m.label} style={{ marginBottom:14 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                          <span style={{ fontSize:13, color:'#7A8099' }}>{m.label}</span>
                          <span style={{ fontSize:14, fontFamily:'Syne,sans-serif', fontWeight:700, color:'#F0EDE8' }}>{m.value}{m.unit}</span>
                        </div>
                        <div style={{ height:5, background:'#1A1E27', borderRadius:3, overflow:'hidden' }}>
                          <div style={{ width:`${Math.min(100, Math.round((m.value / m.max) * 100))}%`, height:'100%', background:m.color, borderRadius:3 }} />
                        </div>
                      </div>
                    ))}
                    {(scan.waist_cm || scan.hip_cm || scan.chest_cm) && (
                      <div style={{ marginTop:16, paddingTop:16, borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', gap:12 }}>
                        {scan.waist_cm && <div style={{ flex:1, textAlign:'center' }}><div style={{ fontSize:16, fontFamily:'Syne,sans-serif', fontWeight:700, color:'#F0EDE8' }}>{scan.waist_cm} cm</div><div style={{ fontSize:11, color:'#4A5068' }}>Tour de taille</div></div>}
                        {scan.hip_cm && <div style={{ flex:1, textAlign:'center' }}><div style={{ fontSize:16, fontFamily:'Syne,sans-serif', fontWeight:700, color:'#F0EDE8' }}>{scan.hip_cm} cm</div><div style={{ fontSize:11, color:'#4A5068' }}>Tour de hanches</div></div>}
                        {scan.chest_cm && <div style={{ flex:1, textAlign:'center' }}><div style={{ fontSize:16, fontFamily:'Syne,sans-serif', fontWeight:700, color:'#F0EDE8' }}>{scan.chest_cm} cm</div><div style={{ fontSize:11, color:'#4A5068' }}>Tour de poitrine</div></div>}
                      </div>
                    )}
                  </div>
                )
              })()}
              {bodyScans.length > 1 && (
                <div style={{ background:'#13161C', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:20 }}>
                  <div style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, color:'#F0EDE8', marginBottom:14 }}>Historique</div>
                  {bodyScans.slice(1).map(scan => (
                    <div key={scan.id} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.05)', fontSize:13 }}>
                      <span style={{ color:'#7A8099' }}>{new Date(scan.date).toLocaleDateString('fr-FR')}</span>
                      {scan.weight_kg && <span style={{ color:'#C9A84C', fontWeight:600 }}>{scan.weight_kg} kg</span>}
                      {scan.fat_mass_percent && <span style={{ color:'#FB7185' }}>MG {scan.fat_mass_percent}%</span>}
                      {scan.muscle_mass_kg && <span style={{ color:'#2DD4BF' }}>MM {scan.muscle_mass_kg} kg</span>}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* SUIVIS */}
      {tab === 3 && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button onClick={() => navigate(`/clients/${id}/suivi/new`)} style={{ background:'#C9A84C', color:'#0B0D11', border:'none', borderRadius:10, padding:'10px 18px', fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nouveau suivi
            </button>
          </div>
          {suivis.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 0', background:'#13161C', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, color:'#4A5068' }}>
              <div style={{ fontSize:32, marginBottom:12 }}>📈</div>
              <div style={{ fontSize:14, color:'#7A8099', marginBottom:4 }}>Aucun suivi enregistré</div>
            </div>
          ) : suivis.map(suivi => (
            <div key={suivi.id} style={{ background:'#13161C', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, color:'#F0EDE8' }}>Suivi semaine {suivi.week_number || '—'}</span>
                  {suivi.meals_respected !== null && suivi.meals_respected !== undefined && (
                    <span style={{ fontSize:11, padding:'2px 10px', borderRadius:20, background: suivi.meals_respected ? 'rgba(45,212,191,0.1)' : 'rgba(251,113,133,0.1)', color: suivi.meals_respected ? '#2DD4BF' : '#FB7185' }}>
                      Repas {suivi.meals_respected ? 'respectés' : 'non respectés'}
                    </span>
                  )}
                </div>
                <span style={{ fontSize:12, color:'#7A8099' }}>{new Date(suivi.date).toLocaleDateString('fr-FR', { day:'numeric', month:'long' })}</span>
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:16, marginBottom:12 }}>
                {[
                  { label:'Énergie', value:suivi.energy_level, color:'#C9A84C' },
                  { label:'Sommeil', value:suivi.sleep_quality, color:'#A78BFA' },
                  { label:'Digestion', value:suivi.digestion_quality, color:'#2DD4BF' },
                  { label:'Faim', value:suivi.hunger_level, color:'#F0C96A' },
                ].filter(m => m.value && m.value > 0).map(m => (
                  <div key={m.label} style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:11, color:'#4A5068' }}>{m.label}</span>
                    <span style={{ color:m.color, fontSize:13 }}>{'★'.repeat(m.value || 0)}{'☆'.repeat(5 - (m.value || 0))}</span>
                  </div>
                ))}
                {suivi.water_liters && <div style={{ display:'flex', alignItems:'center', gap:6 }}><span style={{ fontSize:11, color:'#4A5068' }}>Eau</span><span style={{ fontSize:13, color:'#2DD4BF', fontWeight:600 }}>{suivi.water_liters}L</span></div>}
              </div>
              {suivi.small_victories && (
                <div style={{ background:'rgba(201,168,76,0.06)', border:'1px solid rgba(201,168,76,0.15)', borderRadius:8, padding:'10px 14px', marginBottom:8 }}>
                  <div style={{ fontSize:10, color:'#C9A84C', letterSpacing:'1px', textTransform:'uppercase', marginBottom:4 }}>Victoires</div>
                  <div style={{ fontSize:13, color:'#F0EDE8' }}>{suivi.small_victories}</div>
                </div>
              )}
              {suivi.remaining_blockers && (
                <div style={{ background:'rgba(251,113,133,0.06)', border:'1px solid rgba(251,113,133,0.15)', borderRadius:8, padding:'10px 14px' }}>
                  <div style={{ fontSize:10, color:'#FB7185', letterSpacing:'1px', textTransform:'uppercase', marginBottom:4 }}>Points bloquants</div>
                  <div style={{ fontSize:13, color:'#F0EDE8' }}>{suivi.remaining_blockers}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
