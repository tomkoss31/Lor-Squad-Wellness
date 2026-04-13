import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Client { id: string; first_name: string; last_name: string }

function StarRating({ value, onChange, color = '#C9A84C', label }: { value: number; onChange: (v: number) => void; color?: string; label: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, color: '#7A8099', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 10 }}>{label}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        {[1,2,3,4,5].map(n => (
          <button key={n} type="button" onClick={() => onChange(n)} style={{
            width: 44, height: 44, borderRadius: 10, border: `1px solid ${n <= value ? color : 'rgba(255,255,255,0.08)'}`,
            background: n <= value ? `${color}18` : '#1A1E27', color: n <= value ? color : '#4A5068',
            fontSize: 20, cursor: 'pointer', transition: 'all .15s', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{n <= value ? '★' : '☆'}</button>
        ))}
        <span style={{ fontSize: 12, color: '#4A5068', marginLeft: 8, alignSelf: 'center' }}>
          {value > 0 ? ['','Très mauvais','Mauvais','Correct','Bien','Excellent'][value] : 'Non renseigné'}
        </span>
      </div>
    </div>
  )
}

export default function SuiviPage() {
  const { id: clientId } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [client, setClient] = useState<Client | null>(null)
  const [weekNum, setWeekNum] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    energy_level: 0, hunger_level: 0, digestion_quality: 0, bloating: 0, sleep_quality: 0,
    water_liters: 1.5, meals_respected: null as boolean | null,
    prep_difficulty: '', small_victories: '', remaining_blockers: '', notes: '',
  })

  useEffect(() => {
    supabase.from('clients').select('id,first_name,last_name').eq('id', clientId!).single().then(({ data }) => { if (data) setClient(data) })
    supabase.from('suivis').select('id').eq('client_id', clientId!).then(({ data }) => setWeekNum((data?.length || 0) + 1))
  }, [clientId])

  const set = (field: string) => (value: number | string | boolean) => setForm(f => ({ ...f, [field]: value }))

  const handleSave = async () => {
    try {
      setSaving(true); setError(null)
      const { error } = await supabase.from('suivis').insert({ client_id: clientId, coach_id: user!.id, date: new Date().toISOString().split('T')[0], week_number: weekNum, ...form })
      if (error) throw error
      navigate(`/clients/${clientId}`)
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde') } finally { setSaving(false) }
  }

  const inputStyle: React.CSSProperties = { width: '100%', background: '#1A1E27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px', fontSize: 14, color: '#F0EDE8', fontFamily: 'DM Sans, sans-serif', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }

  return (
    <div style={{ padding: 32, maxWidth: 720, margin: '0 auto' }}>
      <button onClick={() => navigate(`/clients/${clientId}`)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#7A8099', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 13, marginBottom: 24, padding: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="15 18 9 12 15 6"/></svg>
        Retour à la fiche client
      </button>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: '#F0EDE8', margin: 0, letterSpacing: '-0.3px' }}>Suivi hebdomadaire</h1>
          <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: 'rgba(201,168,76,0.12)', color: '#C9A84C', fontWeight: 600 }}>Semaine {weekNum}</span>
        </div>
        {client && <p style={{ fontSize: 13, color: '#7A8099', margin: 0 }}>{client.first_name} {client.last_name}</p>}
      </div>
      {error && <div style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.2)', borderRadius: 10, padding: '12px 16px', color: '#FB7185', fontSize: 13, marginBottom: 20 }}>{error}</div>}

      {/* Ressenti */}
      <div style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: '#C9A84C', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#C9A84C', display: 'inline-block' }} />Ressenti de la semaine</div>
        <StarRating label="Niveau d'énergie" value={form.energy_level} onChange={set('energy_level')} color="#C9A84C" />
        <StarRating label="Gestion de la faim" value={form.hunger_level} onChange={set('hunger_level')} color="#F0C96A" />
        <StarRating label="Qualité du sommeil" value={form.sleep_quality} onChange={set('sleep_quality')} color="#A78BFA" />
        <StarRating label="Qualité de la digestion" value={form.digestion_quality} onChange={set('digestion_quality')} color="#2DD4BF" />
        <StarRating label="Ballonnements (1=aucun, 5=fort)" value={form.bloating} onChange={set('bloating')} color="#FB7185" />
      </div>

      {/* Hydratation */}
      <div style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: '#2DD4BF', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2DD4BF', display: 'inline-block' }} />Hydratation moyenne</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: '#7A8099' }}>Litres d'eau par jour</span>
          <span style={{ fontSize: 22, fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#2DD4BF' }}>{form.water_liters.toFixed(1)}L</span>
        </div>
        <input type="range" min="0" max="4" step="0.25" value={form.water_liters} onChange={e => set('water_liters')(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#2DD4BF', cursor: 'pointer' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 10, color: '#4A5068' }}>0L</span>
          <span style={{ fontSize: 11, color: form.water_liters < 1.5 ? '#FB7185' : '#2DD4BF' }}>{form.water_liters < 1.5 ? '⚠ Insuffisant' : form.water_liters >= 2 ? '✓ Optimal' : 'Correct'}</span>
          <span style={{ fontSize: 10, color: '#4A5068' }}>4L</span>
        </div>
      </div>

      {/* Programme */}
      <div style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: '#F0EDE8', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F0EDE8', display: 'inline-block' }} />Programme & Quotidien</div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#7A8099', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 10 }}>Repas respectés cette semaine ?</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[{ v: true, label: 'Oui', color: '#2DD4BF' }, { v: false, label: 'Non', color: '#FB7185' }].map(opt => (
              <button key={String(opt.v)} type="button" onClick={() => set('meals_respected')(opt.v)} style={{
                flex: 1, padding: '11px', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontFamily: 'DM Sans, sans-serif', transition: 'all .15s',
                border: form.meals_respected === opt.v ? `1px solid ${opt.color}` : '1px solid rgba(255,255,255,0.08)',
                background: form.meals_respected === opt.v ? `${opt.color}15` : '#1A1E27',
                color: form.meals_respected === opt.v ? opt.color : '#7A8099',
              }}>{opt.label}</button>
            ))}
          </div>
        </div>
        {[
          { key: 'prep_difficulty', label: 'Difficultés de préparation', placeholder: 'Manque de temps, ingrédients difficiles à trouver...' },
          { key: 'small_victories', label: 'Petites victoires de la semaine ✦', placeholder: "J'ai tenu mes repas, j'ai bu plus d'eau, je me sens mieux..." },
          { key: 'remaining_blockers', label: 'Points qui bloquent encore', placeholder: 'Grignotage le soir, stress au travail...' },
          { key: 'notes', label: 'Notes du coach', placeholder: 'Observations, ajustements à faire, prochaines étapes...' },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: '#7A8099', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>{f.label}</label>
            <textarea value={(form as Record<string, unknown>)[f.key] as string} onChange={e => set(f.key)(e.target.value)} placeholder={f.placeholder} rows={2} style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.5)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
          </div>
        ))}
      </div>

      <button onClick={handleSave} disabled={saving}
        style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: saving ? 'rgba(201,168,76,0.5)' : '#C9A84C', color: '#0B0D11', fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {saving ? 'Enregistrement...' : '✦ Enregistrer le suivi semaine ' + weekNum}
      </button>
    </div>
  )
}
