import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getSupabaseClient } from '../services/supabaseClient'

const GOOGLE_URL = 'https://www.google.com/maps/place/LA+BASE+Shakes%26Drinks/@49.1619589,5.3840559,17z/data=!4m6!3m5!1s0x47eb1d44e38c23ab:0x685b5b72dd6c5ae2!8m2!3d49.1619589!4d5.3840559!16s%2Fg%2F11khfdclgn?entry=ttu&g_ep=EgoyMDI2MDQwOC4wIKXMDSoASAFQAw%3D%3D'

interface RecapData {
  token: string
  client_first_name: string
  client_last_name: string
  coach_name: string
  assessment_date: string
  program_title?: string
  objective?: string
  body_scan?: { weight?: number; bodyFat?: number; muscleMass?: number; hydration?: number; visceralFat?: number; metabolicAge?: number }
  recommendations?: Array<{ name: string; shortBenefit: string }>
  referrals?: Array<{ name: string; contact: string }>
}

export function RecapPage() {
  const { token } = useParams<{ token: string }>()
  const [recap, setRecap] = useState<RecapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [refs, setRefs] = useState([{ name: '', contact: '' }, { name: '', contact: '' }, { name: '', contact: '' }])
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!token) return
    ;(async () => {
      const sb = await getSupabaseClient()
      if (!sb) { setNotFound(true); setLoading(false); return }
      const { data, error } = await sb.from('client_recaps').select('*').eq('token', token).single()
      if (error || !data) setNotFound(true)
      else setRecap(data as RecapData)
      setLoading(false)
    })()
  }, [token])

  const recapUrl = `${window.location.origin}/recap/${token}`
  const copyLink = async () => { await navigator.clipboard.writeText(recapUrl); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  const shareWA = () => window.open(`https://wa.me/?text=${encodeURIComponent(`Mon bilan Lor'Squad Wellness ✦\n${recapUrl}`)}`, '_blank')
  const shareTG = () => window.open(`https://t.me/share/url?url=${encodeURIComponent(recapUrl)}`, '_blank')
  const shareSMS = () => window.open(`sms:?body=${encodeURIComponent(`Mon bilan Lor'Squad : ${recapUrl}`)}`, '_blank')

  const sendRefs = async () => {
    const filled = refs.filter(r => r.name.trim() || r.contact.trim())
    if (!filled.length) return
    setSending(true)
    const sb = await getSupabaseClient()
    if (sb) await sb.from('client_recaps').update({ referrals: filled }).eq('token', token)
    setSending(false); setSent(true)
  }

  if (loading) return (
    <div style={{ background: 'var(--ls-bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '2px solid rgba(201,168,76,0.2)', borderTop: '2px solid #C9A84C', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box;margin:0;padding:0}`}</style>
    </div>
  )

  if (notFound) return (
    <div style={{ background: 'var(--ls-bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', fontFamily: 'DM Sans, sans-serif', color: 'var(--ls-text)' }}>
      <div>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 48, fontWeight: 800, color: 'rgba(201,168,76,0.15)', marginBottom: 16 }}>404</div>
        <div style={{ fontSize: 16, marginBottom: 8 }}>Récap introuvable ou expiré</div>
        <div style={{ fontSize: 13, color: 'var(--ls-text-muted)' }}>Ce lien est valable 90 jours après le bilan.</div>
      </div>
    </div>
  )

  if (!recap) return null

  const scan = recap.body_scan || {}
  const initials = `${recap.client_first_name[0]}${recap.client_last_name[0]}`.toUpperCase()
  const fDate = new Date(recap.assessment_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const inp: React.CSSProperties = { flex: 1, background: 'var(--ls-surface2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'var(--ls-text)', fontFamily: 'DM Sans, sans-serif', outline: 'none' }

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');*{box-sizing:border-box;margin:0;padding:0}body{background:#0B0D11}input::placeholder{color:#4A5068}a{text-decoration:none}`}</style>
      <div style={{ background: 'var(--ls-bg)', minHeight: '100vh', color: 'var(--ls-text)', fontFamily: 'DM Sans, sans-serif', maxWidth: 480, margin: '0 auto' }}>

        {/* Hero */}
        <div style={{ background: 'linear-gradient(135deg,#13161C 0%,#1A1E27 100%)', padding: '28px 20px 24px', position: 'relative', overflow: 'hidden', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(201,168,76,0.08)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -30, left: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(45,212,191,0.06)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18, position: 'relative', zIndex: 1 }}>
            <div style={{ width: 30, height: 30, background: '#C9A84C', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#0B0D11"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14, color: 'var(--ls-text)' }}>Lor&apos;<span style={{ color: '#C9A84C' }}>Squad</span> Wellness</div>
          </div>

          <a href={GOOGLE_URL} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 20, padding: '8px 16px', marginBottom: 22, position: 'relative', zIndex: 1 }}>
            <span style={{ color: '#F0C96A', fontSize: 13, letterSpacing: 1 }}>★★★★★</span>
            <span style={{ fontSize: 12, color: '#C9A84C', fontWeight: 500 }}>Laisser un avis Google — La Base</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5" style={{ marginLeft: 'auto', flexShrink: 0 }}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', color: '#C9A84C', border: '2px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, marginBottom: 10 }}>{initials}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--ls-text)', marginBottom: 3 }}>{recap.client_first_name} {recap.client_last_name}</div>
            <div style={{ fontSize: 12, color: 'var(--ls-text-muted)', marginBottom: 12 }}>Bilan du {fDate} · Coach {recap.coach_name}</div>
            {recap.program_title && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.2)', borderRadius: 20, padding: '5px 14px', fontSize: 11, color: '#2DD4BF', fontWeight: 500 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                {recap.program_title}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '20px 20px 48px' }}>
          {/* Métriques */}
          <div style={{ fontSize: 10, color: 'var(--ls-text-hint)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#C9A84C' }} />Ton bilan du jour
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            {[
              { label: 'Poids', val: scan.weight ? `${scan.weight} kg` : '—', color: '#C9A84C', sub: 'Point de départ' },
              { label: 'Objectif', val: recap.objective || '—', color: '#2DD4BF', sub: 'Cap du programme' },
              { label: 'Masse grasse', val: scan.bodyFat ? `${scan.bodyFat}%` : '—', color: '#FB7185', sub: scan.bodyFat && scan.weight ? `≈ ${((scan.bodyFat/100)*scan.weight).toFixed(1)} kg` : '' },
              { label: 'Âge métabo.', val: scan.metabolicAge ? `${scan.metabolicAge} ans` : '—', color: '#A78BFA', sub: '' },
            ].map(m => (
              <div key={m.label} style={{ background: 'var(--ls-surface)', border: '1px solid rgba(255,255,255,0.07)', borderTop: `2px solid ${m.color}`, borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 9, color: 'var(--ls-text-hint)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{m.label}</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: m.color, lineHeight: 1 }}>{m.val}</div>
                {m.sub && <div style={{ fontSize: 10, color: 'var(--ls-text-hint)', marginTop: 3 }}>{m.sub}</div>}
              </div>
            ))}
          </div>

          {/* Barres */}
          {(scan.muscleMass || scan.hydration || scan.visceralFat) && (
            <div style={{ background: 'var(--ls-surface)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 14, marginBottom: 20 }}>
              {[
                { label: 'Masse musc.', v: scan.muscleMass, unit: 'kg', max: 80, c: '#2DD4BF' },
                { label: 'Hydratation', v: scan.hydration, unit: '%', max: 100, c: '#A78BFA' },
                { label: 'Graisse visc.', v: scan.visceralFat, unit: '', max: 30, c: (scan.visceralFat ?? 0) > 9 ? '#FB7185' : '#2DD4BF' },
              ].filter(m => m.v).map((m, i, arr) => (
                <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < arr.length-1 ? '1px solid rgba(128,128,128,0.08)' : 'none' }}>
                  <div style={{ fontSize: 11, color: 'var(--ls-text-muted)', width: 90, flexShrink: 0 }}>{m.label}</div>
                  <div style={{ flex: 1, height: 4, background: 'var(--ls-border)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, ((m.v||0)/m.max)*100)}%`, background: m.c, borderRadius: 2 }} />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: m.c, width: 55, textAlign: 'right' }}>{m.v}{m.unit}</div>
                </div>
              ))}
            </div>
          )}

          {/* Recommandations */}
          {recap.recommendations && recap.recommendations.length > 0 && (
            <>
              <div style={{ fontSize: 10, color: 'var(--ls-text-hint)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#2DD4BF' }} />Recommandations personnalisées
              </div>
              {recap.recommendations.map((r, i) => (
                <div key={i} style={{ background: 'var(--ls-surface)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 12, marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: i%2===0 ? 'rgba(45,212,191,0.1)' : 'rgba(201,168,76,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={i%2===0?'#2DD4BF':'#C9A84C'} strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  </div>
                  <div><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ls-text)', marginBottom: 2 }}>{r.name}</div><div style={{ fontSize: 11, color: 'var(--ls-text-muted)', lineHeight: 1.5 }}>{r.shortBenefit}</div></div>
                </div>
              ))}
              <div style={{ marginBottom: 20 }} />
            </>
          )}

          {/* Partage */}
          <div style={{ fontSize: 10, color: 'var(--ls-text-hint)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#A78BFA' }} />Partager ce récap
          </div>
          <div style={{ background: 'var(--ls-surface)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
              <div style={{ width: 82, height: 82, background: 'var(--ls-text)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=${encodeURIComponent(recapUrl)}&color=0B0D11&bgcolor=F0EDE8`} width="70" height="70" alt="QR" style={{ borderRadius: 6, display: 'block' }} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, color: 'var(--ls-text)', marginBottom: 4 }}>Ton récap personnel</div>
                <div style={{ fontSize: 11, color: 'var(--ls-text-muted)', lineHeight: 1.5, marginBottom: 8 }}>Scanne ou partage pour retrouver tes résultats.</div>
                <div onClick={copyLink} style={{ fontSize: 10, background: 'var(--ls-surface2)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ flex: 1, color: 'var(--ls-text-hint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{recapUrl.replace('https://','')}</span>
                  <span style={{ color: copied ? '#2DD4BF' : '#C9A84C', fontWeight: 600, flexShrink: 0 }}>{copied ? '✓ Copié' : 'Copier'}</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { l: 'WhatsApp', bg: 'rgba(37,211,102,0.12)', c: '#25D366', fn: shareWA },
                { l: 'Telegram', bg: 'rgba(42,171,238,0.1)', c: '#2AABEE', fn: shareTG },
                { l: 'SMS', bg: 'var(--ls-border)', c: 'var(--ls-text-muted)', fn: shareSMS },
              ].map(b => (
                <button key={b.l} onClick={b.fn} style={{ flex: 1, padding: '10px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, background: b.bg, color: b.c }}>{b.l}</button>
              ))}
            </div>
          </div>

          {/* Formulaire recommandations */}
          <div style={{ fontSize: 10, color: 'var(--ls-text-hint)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#C9A84C' }} />Tu connais quelqu&apos;un ?
          </div>
          <div style={{ background: 'var(--ls-surface)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 12, padding: 16, marginBottom: 24 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--ls-text)', marginBottom: 4 }}>Partage ce moment bien-être</div>
            <div style={{ fontSize: 11, color: 'var(--ls-text-muted)', marginBottom: 16, lineHeight: 1.6 }}>Note un prénom et un contact — ton coach s&apos;occupe du reste.</div>
            {sent ? (
              <div style={{ background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.2)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>✦</div>
                <div style={{ fontSize: 13, color: '#2DD4BF', fontWeight: 500 }}>Merci ! Tes recommandations ont été envoyées.</div>
              </div>
            ) : (
              <>
                {refs.map((ref, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input placeholder={`Prénom ${i+1}`} value={ref.name} onChange={e => setRefs(r => r.map((x,j) => j===i ? {...x, name: e.target.value} : x))} style={inp} />
                    <input placeholder="Tél. ou @" value={ref.contact} onChange={e => setRefs(r => r.map((x,j) => j===i ? {...x, contact: e.target.value} : x))} style={{...inp, flex: 1.3}} />
                  </div>
                ))}
                <button onClick={sendRefs} disabled={sending} style={{ width: '100%', background: sending ? 'rgba(201,168,76,0.4)' : '#C9A84C', color: 'var(--ls-bg)', border: 'none', borderRadius: 9, padding: 13, fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer', marginTop: 4 }}>
                  {sending ? 'Envoi...' : 'Envoyer mes recommandations ✦'}
                </button>
              </>
            )}
          </div>
          <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--ls-text-hint)' }}>Lor&apos;Squad Wellness · Récap confidentiel · Valable 90 jours</div>
        </div>
      </div>
    </>
  )
}
