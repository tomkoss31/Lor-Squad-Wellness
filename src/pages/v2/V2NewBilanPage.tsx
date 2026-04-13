import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useBilans } from '../../hooks/useBilans'
import { Bilan, Recommendation } from '../../lib/types'
import { LorButton } from '../../components/ui/LorButton'

const STEPS = ['Rythme de vie', 'Alimentation', 'Hydratation & Sport', 'Santé & Transit', 'Objectifs & Freins']

function generateRecommendations(data: Partial<Bilan>): Recommendation[] {
  const recs: Recommendation[] = []
  if ((data.sleep_quality ?? 5) <= 2) recs.push({ category: 'Sommeil', priority: 'haute', product: 'Herbalife24 Rebuild Strength', reason: 'Qualité du sommeil insuffisante' })
  if ((data.water_liters ?? 2) < 1.5) recs.push({ category: 'Hydratation', priority: 'haute', product: 'Herbal Aloe Concentrate', reason: 'Hydratation en dessous des besoins' })
  if ((data.stress_level ?? 0) >= 4) recs.push({ category: 'Stress', priority: 'haute', reason: 'Niveau de stress élevé détecté' })
  if (data.snacking === 'oui' && data.snacking_frequency?.toLowerCase().includes('souvent')) recs.push({ category: 'Grignotage', priority: 'moyenne', product: 'Formula 1 shake', reason: 'Grignotage fréquent' })
  if ((data.digestion_quality ?? 5) <= 2) recs.push({ category: 'Digestion', priority: 'haute', product: 'Herbal Aloe', reason: 'Digestion difficile' })
  return recs
}

export function V2NewBilanPage() {
  const { id: clientId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { createBilan } = useBilans(clientId)
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<Partial<Bilan>>({})

  const set = (k: keyof Bilan, v: string | number) => {
    const updated = { ...data, [k]: v }
    setData(updated)
    if (clientId) localStorage.setItem(`bilan_draft_${clientId}`, JSON.stringify(updated))
  }

  const inp = { background: '#1A1E27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', color: '#F0EDE8', fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' as const }
  const lbl = { fontSize: 11, fontWeight: 600 as const, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#7A8099', display: 'block', marginBottom: 6 }

  function Stars({ field, value }: { field: keyof Bilan; value?: number }) {
    return <div style={{ display: 'flex', gap: 6 }}>{[1,2,3,4,5].map(n => <button key={n} type="button" onClick={() => set(field, n)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: (value ?? 0) >= n ? '#C9A84C' : '#2A2E3A' }}>★</button>)}</div>
  }

  async function handleSubmit() {
    if (!clientId) return
    setSaving(true)
    try {
      await createBilan({ ...data, client_id: clientId, date: new Date().toISOString().split('T')[0], recommendations: generateRecommendations(data) })
      localStorage.removeItem(`bilan_draft_${clientId}`)
      navigate(`/v2/clients/${clientId}`)
    } finally { setSaving(false) }
  }

  return (
    <div style={{ padding: '32px 36px', fontFamily: 'DM Sans, sans-serif', maxWidth: 700 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#7A8099', cursor: 'pointer', fontSize: 13 }}>← Retour</button>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 22, color: '#F0EDE8' }}>Nouveau bilan</h1>
      </div>

      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          {STEPS.map((s, i) => <span key={s} style={{ fontSize: 11, color: i <= step ? '#C9A84C' : '#4A5068', fontWeight: i === step ? 600 : 400, maxWidth: 90, textAlign: 'center' }}>{s}</span>)}
        </div>
        <div style={{ height: 3, background: '#1A1E27', borderRadius: 2 }}>
          <div style={{ height: '100%', background: '#C9A84C', borderRadius: 2, width: `${((step + 1) / STEPS.length) * 100}%`, transition: 'width 0.3s' }} />
        </div>
      </div>

      <div style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 28, marginBottom: 20 }}>
        {step === 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div><label style={lbl}>Heure de réveil</label><input style={inp} type="time" value={data.wake_time ?? ''} onChange={e => set('wake_time', e.target.value)} /></div>
            <div><label style={lbl}>Heure de coucher</label><input style={inp} type="time" value={data.sleep_time ?? ''} onChange={e => set('sleep_time', e.target.value)} /></div>
          </div>
          <div><label style={lbl}>Qualité du sommeil</label><Stars field="sleep_quality" value={data.sleep_quality} /></div>
          <div><label style={lbl}>Niveau d'énergie</label><Stars field="energy_level" value={data.energy_level} /></div>
          <div><label style={lbl}>Niveau de stress</label><Stars field="stress_level" value={data.stress_level} /></div>
        </div>}

        {step === 1 && <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={lbl}>Petit-déjeuner</label><input style={inp} value={data.breakfast ?? ''} onChange={e => set('breakfast', e.target.value)} /></div>
            <div><label style={lbl}>Heure</label><input style={inp} type="time" value={data.breakfast_time ?? ''} onChange={e => set('breakfast_time', e.target.value)} /></div>
          </div>
          <div><label style={lbl}>Déjeuner</label><input style={inp} value={data.lunch ?? ''} onChange={e => set('lunch', e.target.value)} /></div>
          <div><label style={lbl}>Dîner</label><input style={inp} value={data.dinner ?? ''} onChange={e => set('dinner', e.target.value)} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={lbl}>Grignotage</label>
              <select style={inp} value={data.snacking ?? ''} onChange={e => set('snacking', e.target.value)}><option value="">—</option><option value="non">Non</option><option value="oui">Oui</option></select>
            </div>
            {data.snacking === 'oui' && <div><label style={lbl}>Fréquence</label><input style={inp} value={data.snacking_frequency ?? ''} onChange={e => set('snacking_frequency', e.target.value)} /></div>}
          </div>
          <div><label style={lbl}>Autres boissons</label><input style={inp} value={data.other_drinks ?? ''} onChange={e => set('other_drinks', e.target.value)} /></div>
        </div>}

        {step === 2 && <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={lbl}>Litres d'eau par jour — {data.water_liters ?? 1.5}L</label>
            <input type="range" min={0} max={3.5} step={0.25} value={data.water_liters ?? 1.5} onChange={e => set('water_liters', Number(e.target.value))} style={{ width: '100%', accentColor: '#C9A84C' }} />
          </div>
          <div><label style={lbl}>Type de sport</label><input style={inp} value={data.sport_type ?? ''} onChange={e => set('sport_type', e.target.value)} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={lbl}>Fréquence</label><input style={inp} value={data.sport_frequency ?? ''} onChange={e => set('sport_frequency', e.target.value)} /></div>
            <div><label style={lbl}>Durée</label><input style={inp} value={data.sport_duration ?? ''} onChange={e => set('sport_duration', e.target.value)} /></div>
          </div>
        </div>}

        {step === 3 && <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div><label style={lbl}>Problèmes de santé</label><textarea style={{ ...inp, minHeight: 60, resize: 'vertical' }} value={data.health_issues ?? ''} onChange={e => set('health_issues', e.target.value)} /></div>
          <div><label style={lbl}>Médicaments</label><input style={inp} value={data.medications ?? ''} onChange={e => set('medications', e.target.value)} /></div>
          <div><label style={lbl}>Qualité de la digestion</label><Stars field="digestion_quality" value={data.digestion_quality} /></div>
          <div><label style={lbl}>Transit</label>
            <select style={inp} value={data.transit ?? ''} onChange={e => set('transit', e.target.value)}><option value="">—</option><option>Régulier</option><option>Irrégulier</option><option>Constipation</option><option>Accéléré</option></select>
          </div>
        </div>}

        {step === 4 && <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div><label style={lbl}>Objectif principal</label>
            <select style={inp} value={data.main_objective ?? ''} onChange={e => set('main_objective', e.target.value)}><option value="">—</option><option>Perte de poids</option><option>Prise de muscle</option><option>Regain d'énergie</option><option>Bien-être général</option><option>Autre</option></select>
          </div>
          <div><label style={lbl}>Objectif secondaire</label><input style={inp} value={data.secondary_objective ?? ''} onChange={e => set('secondary_objective', e.target.value)} /></div>
          <div><label style={lbl}>Principaux freins</label><input style={inp} value={data.blockers ?? ''} onChange={e => set('blockers', e.target.value)} /></div>
          <div><label style={lbl}>Niveau de motivation</label><Stars field="motivation_level" value={data.motivation_level} /></div>
          <div><label style={lbl}>Notes coach</label><textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }} value={data.notes ?? ''} onChange={e => set('notes', e.target.value)} /></div>
        </div>}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <LorButton variant="secondary" disabled={step === 0} onClick={() => setStep(s => s - 1)}>← Précédent</LorButton>
        {step < STEPS.length - 1 ? <LorButton onClick={() => setStep(s => s + 1)}>Suivant →</LorButton> : <LorButton loading={saving} onClick={handleSubmit}>Enregistrer le bilan</LorButton>}
      </div>
    </div>
  )
}
