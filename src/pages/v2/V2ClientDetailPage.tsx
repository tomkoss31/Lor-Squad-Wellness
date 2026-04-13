import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Client, Bilan, BodyScan, Suivi } from '../../lib/types'
import { LorButton } from '../../components/ui/LorButton'
import { LorBadge } from '../../components/ui/LorBadge'
import { LorScoreBar } from '../../components/ui/LorScoreBar'
import { LorEmptyState } from '../../components/ui/LorEmptyState'

type Tab = 'profil' | 'bilans' | 'scan' | 'suivis'

export function V2ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('profil')
  const [client, setClient] = useState<Client | null>(null)
  const [bilans, setBilans] = useState<Bilan[]>([])
  const [scans, setScans] = useState<BodyScan[]>([])
  const [suivis, setSuivis] = useState<Suivi[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<Client>>({})

  useEffect(() => {
    if (!id) return
    async function load() {
      const [c, b, s, sv] = await Promise.all([
        supabase.from('clients').select('*').eq('id', id).single(),
        supabase.from('bilans').select('*').eq('client_id', id).order('date', { ascending: false }),
        supabase.from('body_scans').select('*').eq('client_id', id).order('date', { ascending: false }),
        supabase.from('suivis').select('*').eq('client_id', id).order('date', { ascending: false }),
      ])
      setClient(c.data); setForm(c.data ?? {})
      setBilans(b.data || []); setScans(s.data || []); setSuivis(sv.data || [])
      setLoading(false)
    }
    load()
  }, [id])

  async function handleSave() {
    if (!id) return
    setSaving(true)
    await supabase.from('clients').update({ ...form, updated_at: new Date().toISOString() }).eq('id', id)
    setSaving(false)
  }

  const set = (k: keyof Client) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const inputStyle = { background: '#1A1E27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', color: '#F0EDE8', fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: 11, fontWeight: 600 as const, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#7A8099', display: 'block', marginBottom: 6 }
  const tabs: { key: Tab; label: string }[] = [{ key: 'profil', label: 'Profil' }, { key: 'bilans', label: 'Bilans' }, { key: 'scan', label: 'Body Scan' }, { key: 'suivis', label: 'Suivis' }]

  if (loading) return <div style={{ padding: 40, color: '#7A8099', fontFamily: 'DM Sans' }}>Chargement…</div>
  if (!client) return <div style={{ padding: 40, color: '#FB7185', fontFamily: 'DM Sans' }}>Client introuvable.</div>

  return (
    <div style={{ padding: '32px 36px', fontFamily: 'DM Sans, sans-serif', maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <button onClick={() => navigate('/v2/clients')} style={{ background: 'none', border: 'none', color: '#7A8099', cursor: 'pointer', fontSize: 13 }}>← Clients</button>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(201,168,76,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C9A84C', fontWeight: 700, fontSize: 16 }}>
          {client.first_name.charAt(0)}{client.last_name.charAt(0)}
        </div>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 22, color: '#F0EDE8' }}>{client.first_name} {client.last_name}</h1>
          <LorBadge variant={client.status === 'actif' ? 'success' : 'default'}>{client.status}</LorBadge>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <LorButton variant="secondary" size="sm" onClick={() => navigate(`/v2/clients/${id}/scan/new`)}>Body Scan</LorButton>
          <LorButton size="sm" onClick={() => navigate(`/v2/clients/${id}/bilan/new`)}>+ Nouveau bilan</LorButton>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 0 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '10px 18px', background: 'none', border: 'none', borderBottom: tab === t.key ? '2px solid #C9A84C' : '2px solid transparent', color: tab === t.key ? '#F0EDE8' : '#7A8099', fontSize: 13, fontWeight: tab === t.key ? 600 : 400, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', marginBottom: -1 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'profil' && (
        <div style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 28 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div><label style={labelStyle}>Prénom</label><input style={inputStyle} value={form.first_name ?? ''} onChange={set('first_name')} /></div>
            <div><label style={labelStyle}>Nom</label><input style={inputStyle} value={form.last_name ?? ''} onChange={set('last_name')} /></div>
            <div><label style={labelStyle}>Email</label><input style={inputStyle} value={form.email ?? ''} onChange={set('email')} /></div>
            <div><label style={labelStyle}>Téléphone</label><input style={inputStyle} value={form.phone ?? ''} onChange={set('phone')} /></div>
            <div>
              <label style={labelStyle}>Statut</label>
              <select style={inputStyle} value={form.status ?? 'actif'} onChange={set('status')}>
                <option value="actif">Actif</option>
                <option value="pause">Pause</option>
                <option value="inactif">Inactif</option>
              </select>
            </div>
            <div><label style={labelStyle}>Taille (cm)</label><input style={inputStyle} type="number" value={form.height_cm ?? ''} onChange={set('height_cm')} /></div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Objectif</label>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={form.objective ?? ''} onChange={set('objective')} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Notes coach</label>
            <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.notes ?? ''} onChange={set('notes')} />
          </div>
          <LorButton loading={saving} onClick={handleSave}>Sauvegarder</LorButton>
        </div>
      )}

      {tab === 'bilans' && (
        <div>
          {bilans.length === 0 ? <LorEmptyState icon="📋" title="Aucun bilan" subtitle="Commence le premier bilan de ce client." action={<LorButton onClick={() => navigate(`/v2/clients/${id}/bilan/new`)}>Nouveau bilan</LorButton>} /> : bilans.map(b => (
            <div key={b.id} style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 20, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <p style={{ color: '#F0EDE8', fontWeight: 600, fontSize: 14 }}>{new Date(b.date).toLocaleDateString('fr-FR')}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {b.energy_level != null && <LorScoreBar value={b.energy_level} max={5} color="#C9A84C" label="Énergie" unit="/5" />}
                {b.sleep_quality != null && <LorScoreBar value={b.sleep_quality} max={5} color="#A78BFA" label="Sommeil" unit="/5" />}
                {b.water_liters != null && <LorScoreBar value={b.water_liters} max={3} color="#2DD4BF" label="Hydratation" unit="L" />}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'scan' && (
        <div>
          {scans.length === 0 ? <LorEmptyState icon="⚖️" title="Aucun body scan" subtitle="Enregistre le premier scan de ce client." action={<LorButton onClick={() => navigate(`/v2/clients/${id}/scan/new`)}>Nouveau scan</LorButton>} /> : (
            <>
              <div style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 24, marginBottom: 16 }}>
                <p style={{ color: '#C9A84C', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Dernier scan — {new Date(scans[0].date).toLocaleDateString('fr-FR')}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                  {scans[0].weight_kg != null && <LorScoreBar value={scans[0].weight_kg} max={150} color="#F0EDE8" label="Poids" unit=" kg" />}
                  {scans[0].fat_mass_percent != null && <LorScoreBar value={scans[0].fat_mass_percent} max={50} color="#FB7185" label="Masse grasse" unit="%" />}
                  {scans[0].muscle_mass_kg != null && <LorScoreBar value={scans[0].muscle_mass_kg} max={80} color="#2DD4BF" label="Masse musculaire" unit=" kg" />}
                  {scans[0].water_percent != null && <LorScoreBar value={scans[0].water_percent} max={100} color="#A78BFA" label="Hydratation" unit="%" />}
                  {scans[0].visceral_fat_level != null && <LorScoreBar value={scans[0].visceral_fat_level} max={59} color={scans[0].visceral_fat_level >= 15 ? '#FB7185' : scans[0].visceral_fat_level >= 10 ? '#C9A84C' : '#2DD4BF'} label="Graisse viscérale" unit="" />}
                  {scans[0].bmi != null && <LorScoreBar value={scans[0].bmi} max={40} color="#C9A84C" label="IMC" unit="" />}
                </div>
              </div>
              {scans.length > 1 && (
                <div style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
                    <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Date', 'Poids', 'MG%', 'MM kg', 'Eau%', 'VF'].map(h => <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#4A5068', fontSize: 11, fontWeight: 600 }}>{h}</th>)}
                    </tr></thead>
                    <tbody>{scans.slice(1).map(s => (
                      <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 16px', color: '#7A8099' }}>{new Date(s.date).toLocaleDateString('fr-FR')}</td>
                        <td style={{ padding: '10px 16px', color: '#F0EDE8' }}>{s.weight_kg ?? '—'}</td>
                        <td style={{ padding: '10px 16px', color: '#FB7185' }}>{s.fat_mass_percent ?? '—'}</td>
                        <td style={{ padding: '10px 16px', color: '#2DD4BF' }}>{s.muscle_mass_kg ?? '—'}</td>
                        <td style={{ padding: '10px 16px', color: '#A78BFA' }}>{s.water_percent ?? '—'}</td>
                        <td style={{ padding: '10px 16px', color: (s.visceral_fat_level ?? 0) >= 15 ? '#FB7185' : '#7A8099' }}>{s.visceral_fat_level ?? '—'}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'suivis' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <LorButton size="sm" onClick={() => navigate(`/v2/clients/${id}/suivi/new`)}>+ Nouveau suivi</LorButton>
          </div>
          {suivis.length === 0 ? <LorEmptyState icon="📅" title="Aucun suivi" subtitle="Enregistre le premier check-in hebdomadaire." /> : suivis.map(s => (
            <div key={s.id} style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 20, marginBottom: 12 }}>
              <p style={{ color: '#F0EDE8', fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Semaine {s.week_number ?? '?'} — {new Date(s.date).toLocaleDateString('fr-FR')}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {s.energy_level != null && <LorScoreBar value={s.energy_level} max={5} color="#C9A84C" label="Énergie" unit="/5" />}
                {s.sleep_quality != null && <LorScoreBar value={s.sleep_quality} max={5} color="#A78BFA" label="Sommeil" unit="/5" />}
                {s.water_liters != null && <LorScoreBar value={s.water_liters} max={3} color="#2DD4BF" label="Eau" unit="L" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
