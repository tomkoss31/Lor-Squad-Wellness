import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useBodyScans } from '../../hooks/useBodyScans'
import { BodyScan } from '../../lib/types'
import { LorButton } from '../../components/ui/LorButton'
import { LorScoreBar } from '../../components/ui/LorScoreBar'

function getColor(v: number, [ok, warn]: [number, number]) {
  return v <= ok ? '#2DD4BF' : v <= warn ? '#C9A84C' : '#FB7185'
}

export function V2BodyScanPage() {
  const { id: clientId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { createScan } = useBodyScans(clientId)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<Partial<BodyScan>>({})

  const n = (k: keyof BodyScan) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setData(d => ({ ...d, [k]: e.target.value === '' ? undefined : Number(e.target.value) }))

  const inp = { background: '#1A1E27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', color: '#F0EDE8', fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' as const }
  const lbl = { fontSize: 11, fontWeight: 600 as const, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#7A8099', display: 'block', marginBottom: 6 }

  async function handleSubmit() {
    if (!clientId) return
    setSaving(true)
    try { await createScan({ ...data, client_id: clientId, date: new Date().toISOString().split('T')[0] }); navigate(`/v2/clients/${clientId}`) }
    finally { setSaving(false) }
  }

  const hasData = data.fat_mass_percent != null || data.muscle_mass_kg != null || data.water_percent != null

  return (
    <div style={{ padding: '32px 36px', fontFamily: 'DM Sans, sans-serif', maxWidth: 800 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#7A8099', cursor: 'pointer', fontSize: 13 }}>← Retour</button>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 22, color: '#F0EDE8' }}>Body Scan</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 24 }}>
          <p style={{ color: '#C9A84C', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>Mesures</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={lbl}>Poids (kg)</label><input style={inp} type="number" step="0.1" onChange={n('weight_kg')} /></div>
              <div><label style={lbl}>IMC</label><input style={inp} type="number" step="0.1" onChange={n('bmi')} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={lbl}>Masse grasse %</label><input style={inp} type="number" step="0.1" onChange={n('fat_mass_percent')} /></div>
              <div><label style={lbl}>Masse grasse kg</label><input style={inp} type="number" step="0.1" onChange={n('fat_mass_kg')} /></div>
            </div>
            <div><label style={lbl}>Masse musculaire (kg)</label><input style={inp} type="number" step="0.1" onChange={n('muscle_mass_kg')} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={lbl}>Hydratation %</label><input style={inp} type="number" step="0.1" onChange={n('water_percent')} /></div>
              <div><label style={lbl}>Graisse viscérale</label><input style={inp} type="number" min="1" max="59" onChange={n('visceral_fat_level')} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={lbl}>BMR (kcal)</label><input style={inp} type="number" onChange={n('bmr')} /></div>
              <div><label style={lbl}>Âge métabolique</label><input style={inp} type="number" onChange={n('metabolic_age')} /></div>
            </div>
            <p style={{ color: '#4A5068', fontSize: 11 }}>Mensurations optionnelles</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div><label style={lbl}>Taille</label><input style={inp} type="number" step="0.1" onChange={n('waist_cm')} /></div>
              <div><label style={lbl}>Hanches</label><input style={inp} type="number" step="0.1" onChange={n('hip_cm')} /></div>
              <div><label style={lbl}>Poitrine</label><input style={inp} type="number" step="0.1" onChange={n('chest_cm')} /></div>
            </div>
          </div>
        </div>

        <div style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 24 }}>
          <p style={{ color: '#C9A84C', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>Lecture en temps réel</p>
          {!hasData ? <p style={{ color: '#4A5068', fontSize: 13, textAlign: 'center', paddingTop: 40 }}>Commence la saisie…</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {data.weight_kg != null && <LorScoreBar value={data.weight_kg} max={150} color="#F0EDE8" label="Poids" unit=" kg" />}
              {data.fat_mass_percent != null && <div>
                <LorScoreBar value={data.fat_mass_percent} max={50} color={getColor(data.fat_mass_percent, [28, 35])} label="Masse grasse" unit="%" />
                <p style={{ fontSize: 11, color: '#4A5068', marginTop: 4 }}>Normal femme : 18–28% · Homme : 10–20%</p>
              </div>}
              {data.muscle_mass_kg != null && <LorScoreBar value={data.muscle_mass_kg} max={80} color="#2DD4BF" label="Masse musculaire" unit=" kg" />}
              {data.water_percent != null && <div>
                <LorScoreBar value={data.water_percent} max={100} color={data.water_percent < 50 ? '#FB7185' : data.water_percent < 55 ? '#C9A84C' : '#A78BFA'} label="Hydratation" unit="%" />
                <p style={{ fontSize: 11, color: '#4A5068', marginTop: 4 }}>Optimal : &gt;55%</p>
              </div>}
              {data.visceral_fat_level != null && <div>
                <LorScoreBar value={data.visceral_fat_level} max={59} color={getColor(data.visceral_fat_level, [9, 14])} label="Graisse viscérale" />
                <p style={{ fontSize: 11, color: '#4A5068', marginTop: 4 }}>Normal : 1–9 · Attention : 10–14 · Danger : ≥15</p>
              </div>}
              {data.bmi != null && <LorScoreBar value={data.bmi} max={40} color={getColor(data.bmi, [24.9, 29.9])} label="IMC" />}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <LorButton loading={saving} onClick={handleSubmit}>Enregistrer le scan</LorButton>
      </div>
    </div>
  )
}
