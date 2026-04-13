import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const STEPS = [
  { number: 1, label: 'Rythme de vie',    icon: '◑' },
  { number: 2, label: 'Alimentation',     icon: '◐' },
  { number: 3, label: 'Hydratation',      icon: '◓' },
  { number: 4, label: 'Santé',            icon: '◒' },
  { number: 5, label: 'Objectifs',        icon: '✦' },
]

interface BilanForm {
  wake_time: string
  sleep_time: string
  sleep_quality: number
  energy_level: number
  stress_level: number
  breakfast: string
  breakfast_time: string
  lunch: string
  dinner: string
  snacking: string
  snacking_frequency: string
  water_liters: number
  other_drinks: string
  sport_type: string
  sport_frequency: string
  sport_duration: string
  health_issues: string
  medications: string
  digestion_quality: number
  transit: string
  main_objective: string
  secondary_objective: string
  blockers: string
  motivation_level: number
  notes: string
}

const INITIAL: BilanForm = {
  wake_time: '', sleep_time: '', sleep_quality: 0, energy_level: 0, stress_level: 0,
  breakfast: '', breakfast_time: '', lunch: '', dinner: '', snacking: 'non', snacking_frequency: '',
  water_liters: 1.5, other_drinks: '',
  sport_type: '', sport_frequency: '', sport_duration: '',
  health_issues: '', medications: '', digestion_quality: 0, transit: '',
  main_objective: '', secondary_objective: '', blockers: '', motivation_level: 0, notes: '',
}

function StarRating({ value, onChange, color = '#C9A84C' }: { value: number; onChange: (v: number) => void; color?: string }) {
  return (
    <div style={{ display:'flex', gap:6 }}>
      {[1,2,3,4,5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          style={{
            width:36, height:36, borderRadius:8, border:`1px solid ${n <= value ? color : 'rgba(255,255,255,0.1)'}`,
            background: n <= value ? `${color}20` : 'transparent',
            color: n <= value ? color : '#4A5068',
            fontSize:18, cursor:'pointer', transition:'all .15s', display:'flex', alignItems:'center', justifyContent:'center',
          }}
        >
          {n <= value ? '★' : '☆'}
        </button>
      ))}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ fontSize:11, color:'#7A8099', letterSpacing:'1px', textTransform:'uppercase', display:'block', marginBottom:8, fontFamily:'DM Sans,sans-serif' }}>{children}</label>
}

function LorInput({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width:'100%', background:'#1A1E27', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'12px 14px', fontSize:14, color:'#F0EDE8', fontFamily:'DM Sans,sans-serif', outline:'none' }}
      onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.5)'}
      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
    />
  )
}

function LorSelect({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ width:'100%', background:'#1A1E27', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'12px 14px', fontSize:14, color: value ? '#F0EDE8' : '#4A5068', fontFamily:'DM Sans,sans-serif', outline:'none', appearance:'none' }}
      onFocus={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)'}
      onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
    >
      {children}
    </select>
  )
}

function LorTextarea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{ width:'100%', background:'#1A1E27', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'12px 14px', fontSize:14, color:'#F0EDE8', fontFamily:'DM Sans,sans-serif', outline:'none', resize:'vertical' }}
      onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.5)'}
      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
    />
  )
}

function WaterSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
        <span style={{ fontSize:13, color:'#7A8099' }}>Litres par jour</span>
        <span style={{ fontSize:20, fontFamily:'Syne,sans-serif', fontWeight:700, color:'#2DD4BF' }}>{value.toFixed(1)}L</span>
      </div>
      <input
        type="range" min="0" max="4" step="0.25" value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width:'100%', accentColor:'#2DD4BF', height:6, cursor:'pointer' }}
      />
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
        <span style={{ fontSize:10, color:'#4A5068' }}>0L</span>
        <span style={{ fontSize:10, color: value < 1.5 ? '#FB7185' : '#4A5068' }}>
          {value < 1.5 ? '⚠ Hydratation insuffisante' : value >= 2 ? '✓ Bonne hydratation' : 'Correct'}
        </span>
        <span style={{ fontSize:10, color:'#4A5068' }}>4L</span>
      </div>
    </div>
  )
}

function generateRecommendations(form: BilanForm) {
  const recs: { category: string; priority: string; product?: string; reason: string }[] = []
  if (form.sleep_quality > 0 && form.sleep_quality <= 2)
    recs.push({ category:'Sommeil', priority:'haute', product:'Herbalife24 Rebuild Strength', reason:'Qualité du sommeil insuffisante détectée' })
  if (form.water_liters < 1.5)
    recs.push({ category:'Hydratation', priority:'haute', product:'Herbal Aloe Concentrate', reason:'Apport hydrique en dessous des besoins journaliers' })
  if (form.stress_level >= 4)
    recs.push({ category:'Stress', priority:'haute', reason:'Niveau de stress élevé — gestion du stress recommandée' })
  if (form.snacking === 'oui' && form.snacking_frequency.toLowerCase().includes('souvent'))
    recs.push({ category:'Grignotage', priority:'moyenne', product:'Formula 1 shake', reason:'Grignotage fréquent — structurer les apports caloriques' })
  if (form.digestion_quality > 0 && form.digestion_quality <= 2)
    recs.push({ category:'Digestion', priority:'haute', product:'Herbal Aloe', reason:'Digestion difficile détectée' })
  if (form.energy_level > 0 && form.energy_level <= 2)
    recs.push({ category:'Énergie', priority:'haute', product:'Liftoff', reason:'Niveau d\'énergie bas — soutien énergétique conseillé' })
  return recs
}

export default function NewBilanPage() {
  const { id: clientId } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<BilanForm>(INITIAL)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: keyof BilanForm) => (value: string | number) =>
    setForm(f => ({ ...f, [field]: value }))

  const handleSubmit = async () => {
    try {
      setSaving(true)
      setError(null)
      const recommendations = generateRecommendations(form)
      const { error } = await supabase.from('bilans').insert({
        ...form,
        client_id: clientId,
        coach_id: user!.id,
        recommendations,
        date: new Date().toISOString().split('T')[0],
      })
      if (error) throw error
      navigate(`/clients/${clientId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const progress = ((step - 1) / (STEPS.length - 1)) * 100

  return (
    <div style={{ padding:32, maxWidth:700, margin:'0 auto' }}>

      {/* Header */}
      <button
        onClick={() => step > 1 ? setStep(s => s-1) : navigate(-1)}
        style={{ display:'flex', alignItems:'center', gap:8, background:'none', border:'none', color:'#7A8099', cursor:'pointer', fontFamily:'DM Sans,sans-serif', fontSize:13, marginBottom:28, padding:0 }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="15 18 9 12 15 6"/></svg>
        {step > 1 ? 'Étape précédente' : 'Retour au client'}
      </button>

      <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:24, fontWeight:800, color:'#F0EDE8', margin:'0 0 4px', letterSpacing:'-0.3px' }}>
        Nouveau bilan bien-être
      </h1>
      <p style={{ fontSize:13, color:'#7A8099', margin:'0 0 28px' }}>Étape {step} sur {STEPS.length} — {STEPS[step-1].label}</p>

      {/* Barre de progression */}
      <div style={{ marginBottom:32 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
          {STEPS.map(s => (
            <div key={s.number} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
              <div style={{
                width:36, height:36, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, transition:'all .3s',
                background: s.number < step ? '#C9A84C' : s.number === step ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.05)',
                border: s.number <= step ? '2px solid #C9A84C' : '2px solid rgba(255,255,255,0.1)',
                color: s.number <= step ? '#C9A84C' : '#4A5068',
              }}>
                {s.number < step ? '✓' : s.number}
              </div>
              <span style={{ fontSize:10, color: s.number === step ? '#C9A84C' : '#4A5068', fontWeight: s.number === step ? 500 : 400, whiteSpace:'nowrap' }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
        <div style={{ height:2, background:'rgba(255,255,255,0.06)', borderRadius:2, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${progress}%`, background:'#C9A84C', borderRadius:2, transition:'width .4s ease' }} />
        </div>
      </div>

      {error && (
        <div style={{ background:'rgba(251,113,133,0.08)', border:'1px solid rgba(251,113,133,0.2)', borderRadius:10, padding:'12px 16px', color:'#FB7185', fontSize:13, marginBottom:20 }}>
          {error}
        </div>
      )}

      {/* Card étape */}
      <div style={{ background:'#13161C', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:28 }}>

        {/* ÉTAPE 1 — Rythme de vie */}
        {step === 1 && (
          <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div>
                <FieldLabel>Heure de réveil</FieldLabel>
                <LorInput type="time" value={form.wake_time} onChange={set('wake_time')} />
              </div>
              <div>
                <FieldLabel>Heure de coucher</FieldLabel>
                <LorInput type="time" value={form.sleep_time} onChange={set('sleep_time')} />
              </div>
            </div>
            <div>
              <FieldLabel>Qualité du sommeil</FieldLabel>
              <StarRating value={form.sleep_quality} onChange={set('sleep_quality')} color="#A78BFA" />
              <p style={{ fontSize:11, color:'#4A5068', marginTop:6 }}>1 = Très mauvais · 5 = Excellent</p>
            </div>
            <div>
              <FieldLabel>Niveau d'énergie dans la journée</FieldLabel>
              <StarRating value={form.energy_level} onChange={set('energy_level')} color="#C9A84C" />
            </div>
            <div>
              <FieldLabel>Niveau de stress</FieldLabel>
              <StarRating value={form.stress_level} onChange={set('stress_level')} color="#FB7185" />
            </div>
          </div>
        )}

        {/* ÉTAPE 2 — Alimentation */}
        {step === 2 && (
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:12 }}>
              <div>
                <FieldLabel>Petit-déjeuner habituel</FieldLabel>
                <LorInput value={form.breakfast} onChange={set('breakfast')} placeholder="Café, tartines..." />
              </div>
              <div>
                <FieldLabel>Heure</FieldLabel>
                <LorInput type="time" value={form.breakfast_time} onChange={set('breakfast_time')} />
              </div>
            </div>
            <div>
              <FieldLabel>Déjeuner typique</FieldLabel>
              <LorTextarea value={form.lunch} onChange={set('lunch')} placeholder="Plat principal, accompagnements..." />
            </div>
            <div>
              <FieldLabel>Dîner typique</FieldLabel>
              <LorTextarea value={form.dinner} onChange={set('dinner')} placeholder="Plat principal, accompagnements..." />
            </div>
            <div>
              <FieldLabel>Grignotage</FieldLabel>
              <div style={{ display:'flex', gap:10 }}>
                {['oui','non'].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => set('snacking')(v)}
                    style={{
                      flex:1, padding:'10px', borderRadius:10, cursor:'pointer', fontSize:14, fontFamily:'DM Sans,sans-serif', transition:'all .15s',
                      border: form.snacking === v ? '1px solid #C9A84C' : '1px solid rgba(255,255,255,0.08)',
                      background: form.snacking === v ? 'rgba(201,168,76,0.1)' : '#1A1E27',
                      color: form.snacking === v ? '#C9A84C' : '#7A8099',
                    }}
                  >
                    {v === 'oui' ? 'Oui' : 'Non'}
                  </button>
                ))}
              </div>
            </div>
            {form.snacking === 'oui' && (
              <div>
                <FieldLabel>Fréquence du grignotage</FieldLabel>
                <LorSelect value={form.snacking_frequency} onChange={set('snacking_frequency')}>
                  <option value="">Choisir</option>
                  <option value="rarement">Rarement</option>
                  <option value="parfois">Parfois (2-3x/semaine)</option>
                  <option value="souvent">Souvent (tous les jours)</option>
                  <option value="très souvent">Très souvent (plusieurs fois/jour)</option>
                </LorSelect>
              </div>
            )}
          </div>
        )}

        {/* ÉTAPE 3 — Hydratation & Sport */}
        {step === 3 && (
          <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
            <WaterSlider value={form.water_liters} onChange={v => set('water_liters')(v)} />
            <div>
              <FieldLabel>Autres boissons</FieldLabel>
              <LorInput value={form.other_drinks} onChange={set('other_drinks')} placeholder="Café, sodas, jus, alcool..." />
            </div>
            <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:20 }}>
              <FieldLabel>Type d'activité physique</FieldLabel>
              <LorSelect value={form.sport_type} onChange={set('sport_type')}>
                <option value="">Aucune activité</option>
                <option value="marche">Marche</option>
                <option value="course">Course à pied</option>
                <option value="musculation">Musculation</option>
                <option value="natation">Natation</option>
                <option value="vélo">Vélo</option>
                <option value="yoga">Yoga / Pilates</option>
                <option value="sport-collectif">Sport collectif</option>
                <option value="autre">Autre</option>
              </LorSelect>
            </div>
            {form.sport_type && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <FieldLabel>Fréquence</FieldLabel>
                  <LorSelect value={form.sport_frequency} onChange={set('sport_frequency')}>
                    <option value="">Choisir</option>
                    <option value="1x/semaine">1x par semaine</option>
                    <option value="2-3x/semaine">2-3x par semaine</option>
                    <option value="4-5x/semaine">4-5x par semaine</option>
                    <option value="quotidien">Tous les jours</option>
                  </LorSelect>
                </div>
                <div>
                  <FieldLabel>Durée par séance</FieldLabel>
                  <LorSelect value={form.sport_duration} onChange={set('sport_duration')}>
                    <option value="">Choisir</option>
                    <option value="< 30min">Moins de 30 min</option>
                    <option value="30-45min">30 à 45 min</option>
                    <option value="45-60min">45 à 60 min</option>
                    <option value="> 1h">Plus d'1 heure</option>
                  </LorSelect>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ÉTAPE 4 — Santé */}
        {step === 4 && (
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <div>
              <FieldLabel>Problèmes de santé connus</FieldLabel>
              <LorTextarea value={form.health_issues} onChange={set('health_issues')} placeholder="Diabète, hypertension, allergies..." />
            </div>
            <div>
              <FieldLabel>Médicaments en cours</FieldLabel>
              <LorInput value={form.medications} onChange={set('medications')} placeholder="Nom des médicaments ou Aucun" />
            </div>
            <div>
              <FieldLabel>Qualité de la digestion</FieldLabel>
              <StarRating value={form.digestion_quality} onChange={set('digestion_quality')} color="#2DD4BF" />
              <p style={{ fontSize:11, color:'#4A5068', marginTop:6 }}>1 = Très difficile · 5 = Excellent</p>
            </div>
            <div>
              <FieldLabel>Transit intestinal</FieldLabel>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {['régulier','irrégulier','constipation','accéléré'].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => set('transit')(v)}
                    style={{
                      padding:'10px', borderRadius:10, cursor:'pointer', fontSize:13, fontFamily:'DM Sans,sans-serif', transition:'all .15s', textTransform:'capitalize',
                      border: form.transit === v ? '1px solid #2DD4BF' : '1px solid rgba(255,255,255,0.08)',
                      background: form.transit === v ? 'rgba(45,212,191,0.1)' : '#1A1E27',
                      color: form.transit === v ? '#2DD4BF' : '#7A8099',
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ÉTAPE 5 — Objectifs */}
        {step === 5 && (
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <div>
              <FieldLabel>Objectif principal</FieldLabel>
              <LorSelect value={form.main_objective} onChange={set('main_objective')}>
                <option value="">Choisir un objectif</option>
                <option value="perte-de-poids">Perte de poids</option>
                <option value="prise-de-muscle">Prise de muscle</option>
                <option value="energie">Boost d'énergie</option>
                <option value="bien-etre">Bien-être général</option>
                <option value="sport">Performance sportive</option>
                <option value="digestion">Améliorer la digestion</option>
                <option value="sommeil">Améliorer le sommeil</option>
                <option value="autre">Autre</option>
              </LorSelect>
            </div>
            <div>
              <FieldLabel>Objectif secondaire</FieldLabel>
              <LorInput value={form.secondary_objective} onChange={set('secondary_objective')} placeholder="Ex : Avoir plus d'énergie le matin..." />
            </div>
            <div>
              <FieldLabel>Principaux freins</FieldLabel>
              <LorTextarea value={form.blockers} onChange={set('blockers')} placeholder="Manque de temps, budget limité, motivation en baisse..." />
            </div>
            <div>
              <FieldLabel>Niveau de motivation</FieldLabel>
              <StarRating value={form.motivation_level} onChange={set('motivation_level')} color="#C9A84C" />
            </div>
            <div>
              <FieldLabel>Notes du coach</FieldLabel>
              <LorTextarea value={form.notes} onChange={set('notes')} placeholder="Observations, points importants à retenir..." rows={4} />
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ display:'flex', gap:12, marginTop:20 }}>
        {step < STEPS.length ? (
          <button
            onClick={() => setStep(s => s + 1)}
            style={{ flex:1, padding:'14px', borderRadius:10, border:'none', background:'#C9A84C', color:'#0B0D11', fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}
          >
            Étape suivante
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{ flex:1, padding:'14px', borderRadius:10, border:'none', background: saving ? 'rgba(201,168,76,0.5)' : '#C9A84C', color:'#0B0D11', fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, cursor: saving ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}
          >
            {saving ? 'Enregistrement...' : '✦ Enregistrer le bilan'}
          </button>
        )}
      </div>
    </div>
  )
}
