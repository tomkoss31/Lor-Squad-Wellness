import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Client {
  id: string; first_name: string; last_name: string
  gender?: string; height_cm?: number
}

interface ScanForm {
  weight_kg: string; fat_mass_percent: string; fat_mass_kg: string
  muscle_mass_kg: string; bone_mass_kg: string; water_percent: string
  visceral_fat_level: string; bmr: string; metabolic_age: string
  waist_cm: string; hip_cm: string; chest_cm: string; notes: string
}

const INITIAL_FORM: ScanForm = {
  weight_kg: '', fat_mass_percent: '', fat_mass_kg: '',
  muscle_mass_kg: '', bone_mass_kg: '', water_percent: '',
  visceral_fat_level: '', bmr: '', metabolic_age: '',
  waist_cm: '', hip_cm: '', chest_cm: '', notes: '',
}

interface Zone { label: string; color: string; min: number; max: number }

function getStatus(value: number, zones: Zone[]): Zone {
  for (const zone of zones) {
    if (value >= zone.min && value <= zone.max) return zone
  }
  return zones[zones.length - 1]
}

const FAT_ZONES_HOMME: Zone[] = [
  { label: 'Optimal', color: '#2DD4BF', min: 10, max: 20 },
  { label: 'Attention', color: '#C9A84C', min: 20, max: 25 },
  { label: 'Élevé', color: '#FB7185', min: 25, max: 100 },
]
const FAT_ZONES_FEMME: Zone[] = [
  { label: 'Optimal', color: '#2DD4BF', min: 18, max: 28 },
  { label: 'Attention', color: '#C9A84C', min: 28, max: 35 },
  { label: 'Élevé', color: '#FB7185', min: 35, max: 100 },
]
const VISCERAL_ZONES: Zone[] = [
  { label: 'Optimal', color: '#2DD4BF', min: 1, max: 9 },
  { label: 'Attention', color: '#C9A84C', min: 10, max: 14 },
  { label: 'Élevé', color: '#FB7185', min: 15, max: 59 },
]
const WATER_ZONES: Zone[] = [
  { label: 'Élevé', color: '#FB7185', min: 0, max: 49 },
  { label: 'Attention', color: '#C9A84C', min: 50, max: 55 },
  { label: 'Optimal', color: '#2DD4BF', min: 55, max: 100 },
]
const MUSCLE_ZONES_HOMME: Zone[] = [
  { label: 'Faible', color: '#FB7185', min: 0, max: 38 },
  { label: 'Normal', color: '#C9A84C', min: 38, max: 44 },
  { label: 'Élevé', color: '#2DD4BF', min: 44, max: 100 },
]
const MUSCLE_ZONES_FEMME: Zone[] = [
  { label: 'Faible', color: '#FB7185', min: 0, max: 28 },
  { label: 'Normal', color: '#C9A84C', min: 28, max: 34 },
  { label: 'Élevé', color: '#2DD4BF', min: 34, max: 100 },
]

function ScoreBar({ label, value, max, zones, unit }: { label: string; value: number; max: number; zones: Zone[]; unit: string; gender?: string }) {
  const status = getStatus(value, zones)
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: '#7A8099' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: `${status.color}18`, color: status.color, fontWeight: 500 }}>{status.label}</span>
          <span style={{ fontSize: 15, fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#F0EDE8' }}>{value}{unit}</span>
        </div>
      </div>
      <div style={{ height: 6, background: '#1A1E27', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: status.color, borderRadius: 3, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 11, color: '#7A8099', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>{label}</label>
      {children}
    </div>
  )
}

function NumInput({ value, onChange, placeholder, unit }: { value: string; onChange: (v: string) => void; placeholder?: string; unit?: string }) {
  return (
    <div style={{ position: 'relative' }}>
      <input type="number" step="0.1" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', background: '#1A1E27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: unit ? '11px 40px 11px 14px' : '11px 14px', fontSize: 14, color: '#F0EDE8', fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' }}
        onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.5)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
      {unit && <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#4A5068' }}>{unit}</span>}
    </div>
  )
}

export default function BodyScanPage() {
  const { id: clientId } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [client, setClient] = useState<Client | null>(null)
  const [form, setForm] = useState<ScanForm>(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('clients').select('id,first_name,last_name,gender,height_cm').eq('id', clientId!).single()
      .then(({ data }) => { if (data) setClient(data) })
  }, [clientId])

  const set = (field: keyof ScanForm) => (v: string) => setForm(f => ({ ...f, [field]: v }))

  const bmi = () => {
    const w = parseFloat(form.weight_kg); const h = client?.height_cm
    if (w > 0 && h && h > 0) return (w / ((h / 100) ** 2)).toFixed(1)
    return null
  }

  const hasPreview = () => parseFloat(form.fat_mass_percent) > 0 || parseFloat(form.muscle_mass_kg) > 0 || parseFloat(form.water_percent) > 0 || parseFloat(form.visceral_fat_level) > 0

  const handleSave = async () => {
    if (!form.weight_kg) { setError('Le poids est obligatoire.'); return }
    try {
      setSaving(true); setError(null)
      const { error } = await supabase.from('body_scans').insert({
        client_id: clientId, coach_id: user!.id, date: new Date().toISOString().split('T')[0],
        weight_kg: parseFloat(form.weight_kg) || null, fat_mass_percent: parseFloat(form.fat_mass_percent) || null,
        fat_mass_kg: parseFloat(form.fat_mass_kg) || null, muscle_mass_kg: parseFloat(form.muscle_mass_kg) || null,
        bone_mass_kg: parseFloat(form.bone_mass_kg) || null, water_percent: parseFloat(form.water_percent) || null,
        visceral_fat_level: parseInt(form.visceral_fat_level) || null, bmr: parseInt(form.bmr) || null,
        metabolic_age: parseInt(form.metabolic_age) || null, bmi: parseFloat(bmi() || '0') || null,
        waist_cm: parseFloat(form.waist_cm) || null, hip_cm: parseFloat(form.hip_cm) || null,
        chest_cm: parseFloat(form.chest_cm) || null, notes: form.notes || null,
      })
      if (error) throw error
      navigate(`/clients/${clientId}`)
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde') } finally { setSaving(false) }
  }

  const gender = client?.gender || 'femme'
  const fatZones = gender === 'homme' ? FAT_ZONES_HOMME : FAT_ZONES_FEMME
  const muscleZones = gender === 'homme' ? MUSCLE_ZONES_HOMME : MUSCLE_ZONES_FEMME

  return (
    <div style={{ padding: 32, maxWidth: 900, margin: '0 auto' }}>
      <button onClick={() => navigate(`/clients/${clientId}`)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#7A8099', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 13, marginBottom: 24, padding: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="15 18 9 12 15 6"/></svg>
        Retour à la fiche client
      </button>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: '#F0EDE8', margin: '0 0 4px', letterSpacing: '-0.3px' }}>Body Scan</h1>
        {client && <p style={{ fontSize: 13, color: '#7A8099', margin: 0 }}>{client.first_name} {client.last_name} · {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
      </div>
      {error && <div style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.2)', borderRadius: 10, padding: '12px 16px', color: '#FB7185', fontSize: 13, marginBottom: 20 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: hasPreview() ? '1fr 1fr' : '1fr', gap: 24 }}>
        {/* SAISIE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 22 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, color: '#C9A84C', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#C9A84C', display: 'inline-block' }} />Poids & Composition</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Poids *"><NumInput value={form.weight_kg} onChange={set('weight_kg')} placeholder="70.5" unit="kg" /></Field>
              <Field label="IMC (auto)"><div style={{ background: '#1A1E27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: bmi() ? '#C9A84C' : '#4A5068', fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>{bmi() || '—'}</div></Field>
              <Field label="Masse grasse %"><NumInput value={form.fat_mass_percent} onChange={set('fat_mass_percent')} placeholder="25.0" unit="%" /></Field>
              <Field label="Masse grasse kg"><NumInput value={form.fat_mass_kg} onChange={set('fat_mass_kg')} placeholder="17.5" unit="kg" /></Field>
              <Field label="Masse musculaire"><NumInput value={form.muscle_mass_kg} onChange={set('muscle_mass_kg')} placeholder="45.0" unit="kg" /></Field>
              <Field label="Masse osseuse"><NumInput value={form.bone_mass_kg} onChange={set('bone_mass_kg')} placeholder="2.8" unit="kg" /></Field>
            </div>
          </div>
          <div style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 22 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, color: '#2DD4BF', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2DD4BF', display: 'inline-block' }} />Hydratation & Viscéral</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Hydratation"><NumInput value={form.water_percent} onChange={set('water_percent')} placeholder="56.0" unit="%" /></Field>
              <Field label="Graisse viscérale"><NumInput value={form.visceral_fat_level} onChange={set('visceral_fat_level')} placeholder="5" unit="niv." /></Field>
            </div>
          </div>
          <div style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 22 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, color: '#A78BFA', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#A78BFA', display: 'inline-block' }} />Métabolisme</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="BMR (kcal/j)"><NumInput value={form.bmr} onChange={set('bmr')} placeholder="1450" unit="kcal" /></Field>
              <Field label="Âge métabolique"><NumInput value={form.metabolic_age} onChange={set('metabolic_age')} placeholder="34" unit="ans" /></Field>
            </div>
          </div>
          <div style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 22 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, color: '#F0EDE8', marginBottom: 4 }}>Mensurations</div>
            <div style={{ fontSize: 11, color: '#4A5068', marginBottom: 16 }}>Optionnel</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <Field label="Tour de taille"><NumInput value={form.waist_cm} onChange={set('waist_cm')} placeholder="72" unit="cm" /></Field>
              <Field label="Tour de hanches"><NumInput value={form.hip_cm} onChange={set('hip_cm')} placeholder="95" unit="cm" /></Field>
              <Field label="Tour de poitrine"><NumInput value={form.chest_cm} onChange={set('chest_cm')} placeholder="88" unit="cm" /></Field>
            </div>
          </div>
          <div style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 22 }}>
            <Field label="Notes du coach">
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observations, contexte, points à surveiller..." rows={3}
                style={{ width: '100%', background: '#1A1E27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px', fontSize: 14, color: '#F0EDE8', fontFamily: 'DM Sans, sans-serif', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.5)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
            </Field>
          </div>
          <button onClick={handleSave} disabled={saving}
            style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: saving ? 'rgba(201,168,76,0.5)' : '#C9A84C', color: '#0B0D11', fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {saving ? 'Enregistrement...' : '✦ Enregistrer le body scan'}
          </button>
        </div>

        {/* LECTURE IMMÉDIATE */}
        {hasPreview() && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 22, position: 'sticky', top: 24 }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, color: '#F0EDE8', marginBottom: 4 }}>Lecture immédiate</div>
              <div style={{ fontSize: 12, color: '#4A5068', marginBottom: 20 }}>Mis à jour en temps réel</div>
              {parseFloat(form.weight_kg) > 0 && (
                <div style={{ textAlign: 'center', padding: '16px 0', marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: 42, fontFamily: 'Syne, sans-serif', fontWeight: 800, color: '#C9A84C', lineHeight: 1 }}>{parseFloat(form.weight_kg).toFixed(1)}</div>
                  <div style={{ fontSize: 14, color: '#7A8099', marginTop: 4 }}>kg</div>
                  {bmi() && (
                    <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center' }}>
                      <span style={{ fontSize: 13, padding: '4px 14px', borderRadius: 20, fontWeight: 600,
                        background: parseFloat(bmi()!) < 18.5 || parseFloat(bmi()!) > 25 ? 'rgba(251,113,133,0.12)' : 'rgba(45,212,191,0.12)',
                        color: parseFloat(bmi()!) < 18.5 || parseFloat(bmi()!) > 25 ? '#FB7185' : '#2DD4BF',
                      }}>IMC {bmi()} — {parseFloat(bmi()!) < 18.5 ? 'Insuffisant' : parseFloat(bmi()!) <= 25 ? 'Normal' : parseFloat(bmi()!) <= 30 ? 'Surpoids' : 'Obésité'}</span>
                    </div>
                  )}
                </div>
              )}
              {parseFloat(form.fat_mass_percent) > 0 && <ScoreBar label="Masse grasse" value={parseFloat(form.fat_mass_percent)} max={50} zones={fatZones} unit="%" gender={gender} />}
              {parseFloat(form.muscle_mass_kg) > 0 && <ScoreBar label="Masse musculaire" value={parseFloat(form.muscle_mass_kg)} max={80} zones={muscleZones} unit=" kg" gender={gender} />}
              {parseFloat(form.water_percent) > 0 && <ScoreBar label="Hydratation" value={parseFloat(form.water_percent)} max={100} zones={WATER_ZONES} unit="%" />}
              {parseFloat(form.visceral_fat_level) > 0 && <ScoreBar label="Graisse viscérale" value={parseFloat(form.visceral_fat_level)} max={30} zones={VISCERAL_ZONES} unit="" />}
              {(parseFloat(form.bmr) > 0 || parseFloat(form.metabolic_age) > 0) && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {parseFloat(form.bmr) > 0 && <div style={{ background: '#1A1E27', borderRadius: 10, padding: '12px', textAlign: 'center' }}><div style={{ fontSize: 18, fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#A78BFA' }}>{form.bmr}</div><div style={{ fontSize: 10, color: '#4A5068', marginTop: 2 }}>kcal/jour</div></div>}
                  {parseFloat(form.metabolic_age) > 0 && <div style={{ background: '#1A1E27', borderRadius: 10, padding: '12px', textAlign: 'center' }}><div style={{ fontSize: 18, fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#A78BFA' }}>{form.metabolic_age} ans</div><div style={{ fontSize: 10, color: '#4A5068', marginTop: 2 }}>âge métabolique</div></div>}
                </div>
              )}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 10, color: '#4A5068', marginBottom: 8, letterSpacing: '1px', textTransform: 'uppercase' }}>Légende</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[{ color: '#2DD4BF', label: 'Zone optimale' }, { color: '#C9A84C', label: "Zone d'attention" }, { color: '#FB7185', label: 'Hors norme' }].map(z => (
                    <div key={z.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: z.color, flexShrink: 0 }} /><span style={{ fontSize: 11, color: '#7A8099' }}>{z.label}</span></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
