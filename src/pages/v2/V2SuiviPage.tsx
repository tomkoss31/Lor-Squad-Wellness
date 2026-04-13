import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSuivis } from '../../hooks/useSuivis'
import { Suivi } from '../../lib/types'
import { LorButton } from '../../components/ui/LorButton'

export function V2SuiviPage() {
  const { id: clientId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { createSuivi } = useSuivis(clientId)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<Partial<Suivi>>({})

  const set = (k: keyof Suivi, v: string | number | boolean) => setData(d => ({ ...d, [k]: v }))
  const inputStyle = { background: '#1A1E27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', color: '#F0EDE8', fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: 11, fontWeight: 600 as const, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#7A8099', display: 'block', marginBottom: 6 }

  function StarField({ field, value }: { field: keyof Suivi; value?: number }) {
    return <div style={{ display: 'flex', gap: 6 }}>{[1,2,3,4,5].map(n => <button key={n} type="button" onClick={() => set(field, n)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: (value ?? 0) >= n ? '#C9A84C' : '#2A2E3A' }}>★</button>)}</div>
  }

  async function handleSubmit() {
    if (!clientId) return
    setSaving(true)
    try {
      await createSuivi({ ...data, client_id: clientId, date: new Date().toISOString().split('T')[0] })
      navigate(`/v2/clients/${clientId}`)
    } finally { setSaving(false) }
  }

  return (
    <div style={{ padding: '32px 36px', fontFamily: 'DM Sans, sans-serif', maxWidth: 700 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#7A8099', cursor: 'pointer', fontSize: 13 }}>← Retour</button>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 22, color: '#F0EDE8' }}>Suivi hebdomadaire</h1>
      </div>
      <div style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div><label style={labelStyle}>Semaine n°</label><input style={inputStyle} type="number" value={data.week_number ?? ''} onChange={e => set('week_number', Number(e.target.value))} /></div>
        </div>
        <div><label style={labelStyle}>Niveau d'énergie</label><StarField field="energy_level" value={data.energy_level} /></div>
        <div><label style={labelStyle}>Niveau de faim</label><StarField field="hunger_level" value={data.hunger_level} /></div>
        <div><label style={labelStyle}>Qualité digestion</label><StarField field="digestion_quality" value={data.digestion_quality} /></div>
        <div><label style={labelStyle}>Ballonnements</label><StarField field="bloating" value={data.bloating} /></div>
        <div><label style={labelStyle}>Qualité du sommeil</label><StarField field="sleep_quality" value={data.sleep_quality} /></div>
        <div>
          <label style={labelStyle}>Litres d'eau — {data.water_liters ?? 1.5}L</label>
          <input type="range" min={0} max={3.5} step={0.25} value={data.water_liters ?? 1.5} onChange={e => set('water_liters', Number(e.target.value))} style={{ width: '100%', accentColor: '#C9A84C' }} />
        </div>
        <div>
          <label style={labelStyle}>Repas respectés</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['oui', true], ['non', false]].map(([label, val]) => (
              <button key={String(label)} type="button" onClick={() => set('meals_respected', val as boolean)} style={{ padding: '8px 20px', borderRadius: 20, border: '1px solid', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', background: data.meals_respected === val ? 'rgba(201,168,76,0.1)' : 'transparent', borderColor: data.meals_respected === val ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.07)', color: data.meals_respected === val ? '#C9A84C' : '#7A8099' }}>
                {label as string}
              </button>
            ))}
          </div>
        </div>
        <div><label style={labelStyle}>Difficultés de préparation</label><textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={data.prep_difficulty ?? ''} onChange={e => set('prep_difficulty', e.target.value)} /></div>
        <div><label style={labelStyle}>Petites victoires</label><textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={data.small_victories ?? ''} onChange={e => set('small_victories', e.target.value)} /></div>
        <div><label style={labelStyle}>Points qui bloquent encore</label><textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={data.remaining_blockers ?? ''} onChange={e => set('remaining_blockers', e.target.value)} /></div>
        <div><label style={labelStyle}>Notes coach</label><textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={data.notes ?? ''} onChange={e => set('notes', e.target.value)} /></div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <LorButton loading={saving} onClick={handleSubmit}>Enregistrer le suivi</LorButton>
      </div>
    </div>
  )
}
