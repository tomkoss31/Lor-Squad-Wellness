// ============================================================================
// PWA v2 — Onglet Recommander / Club VIP (chantier refonte identité 2026-07)
// ----------------------------------------------------------------------------
// Paliers, barre vers palier suivant, simulateur « X proches » (projection
// pure — mêmes formules que le design), comment ça marche, exemple Sarah,
// modale « Club VIP en 30 s ». CTA « partager un proche » → messagerie.
// ============================================================================
import { useState, type CSSProperties } from 'react'
import { getSupabaseClient } from '../../../services/supabaseClient'
import { recordClientXp } from '../../../features/client-xp/useClientXp'

const ANTON = "'Anton', sans-serif"
const SORA = "'Sora', sans-serif"
const MONO = "'JetBrains Mono', monospace"

export interface RecommanderTabProps {
  coachName: string
  token: string
  clientId: string
  coachId?: string
  clientName: string
}

const REF = 200
const MONTHS = 3
const BASE = 80
const FRIEND = 130
const TIERS = [
  { pct: 15, min: 0, name: 'Bronze', sub: 'Dès ta 1ère commande', accent: 'var(--bronze)' },
  { pct: 25, min: 100, name: 'Silver', sub: '100 points cumulés', accent: '#B8BEC9' },
  { pct: 35, min: 500, name: 'Gold', sub: '500 points — top client', accent: 'var(--lime)' },
  { pct: 42, min: 1000, name: 'Ambassadeur', sub: '1 000 pts / 3 mois · à vie', accent: 'var(--violet)' },
]
function tierForPts(p: number) { let c = TIERS[0]; for (const t of TIERS) if (p >= t.min) c = t; return c }
function nextTier(p: number) { return TIERS.find((t) => t.min > p) || null }

export function RecommanderTab({ coachName, token, clientId, coachId, clientName }: RecommanderTabProps) {
  const [friends, setFriends] = useState(3)
  const [showHow, setShowHow] = useState(false)
  const [referOpen, setReferOpen] = useState(false)
  const [referName, setReferName] = useState('')
  const [referContact, setReferContact] = useState('')
  const [referSending, setReferSending] = useState(false)
  const [referSent, setReferSent] = useState(false)

  async function submitReferral() {
    const name = referName.trim()
    const contact = referContact.trim()
    if (!name || !contact || referSending) return
    setReferSending(true)
    try {
      const sb = await getSupabaseClient()
      if (!sb) throw new Error('indispo')
      const isPhone = contact.replace(/\D/g, '').length >= 6 && !contact.includes('@')
      let routed = false
      if (isPhone) {
        try {
          const { error } = await sb.functions.invoke('submit-prospect-lead', {
            body: {
              first_name: name,
              phone: contact,
              source: 'reco-client',
              referrer_user_id: coachId ?? undefined,
              metadata: { from_client_id: clientId, from_client_name: clientName, source_page: 'pwa-recommander-v2' },
            },
          })
          routed = !error
        } catch { /* fallback ci-dessous */ }
      }
      if (!routed) {
        await sb.from('client_referrals').insert({
          from_client_id: clientId,
          from_client_name: clientName,
          coach_id: coachId ?? '',
          referred_name: name,
          referred_contact: contact,
        })
      }
      void recordClientXp(token, 'vip_intentions_filled')
      setReferSent(true)
      setReferName('')
      setReferContact('')
    } catch {
      /* silencieux */
    } finally {
      setReferSending(false)
    }
  }
  const openRefer = () => { setShowHow(false); setReferSent(false); setReferOpen(true) }

  const cumPts = (m: number) => Math.round(BASE * m + friends * FRIEND * Math.max(0, m - 1))
  const timeline = Array.from({ length: MONTHS }, (_, i) => {
    const m = i + 1, pv = cumPts(m), tier = tierForPts(pv), lastM = i === MONTHS - 1
    return { month: m, pv, pct: tier.pct, sub: m === 1 ? 'toi' : m === 2 ? '+ tes proches' : 'tout le monde', lastM }
  })
  const finalPts = timeline[MONTHS - 1].pv
  const finalTier = tierForPts(finalPts)
  const nt = nextTier(finalPts)
  const saving = Math.round((finalTier.pct / 100) * REF)
  const progPct = nt ? Math.max(5, Math.min(100, Math.round(((finalPts - finalTier.min) / (nt.min - finalTier.min)) * 100))) : 100
  const nextTxt = finalTier.pct >= 42 ? 'Niveau Ambassadeur — le sommet client, à vie.' : nt ? `≈ ${nt.min - finalPts} pts pour passer à −${nt.pct}%` : ''

  const card: CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'lbRise .4s ease both' }}>
      <div style={{ textAlign: 'center', padding: '6px 0 2px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 14px', borderRadius: 999, background: 'color-mix(in srgb,var(--gold) 16%,transparent)', border: '1px solid color-mix(in srgb,var(--gold) 40%,transparent)', color: 'var(--gold)', fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 12 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" /></svg>Club VIP
        </div>
        <h2 style={{ fontFamily: ANTON, textTransform: 'uppercase', fontSize: 30, lineHeight: 1.02, margin: 0, color: 'var(--text)' }}>Quelle remise <span style={{ background: 'linear-gradient(120deg,var(--teal),var(--lime))', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>veux-tu</span> ?</h2>
        <p style={{ margin: '12px auto 0', maxWidth: 300, fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>Tu ne vends rien. Tu en parles, comme d'un bon resto. Sauf que là… <strong style={{ color: 'var(--text)' }}>tu empoches la remise sur ta nutrition.</strong></p>
        <button onClick={() => setShowHow(true)} style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 999, padding: '8px 15px', color: 'var(--teal)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>Le récap en 30 secondes
        </button>
      </div>

      <div style={{ textAlign: 'center', borderRadius: 16, padding: 16, background: 'linear-gradient(135deg,color-mix(in srgb,var(--gold) 16%,var(--surface)),var(--surface))', border: '1px solid color-mix(in srgb,var(--gold) 30%,var(--border))' }}>
        <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 700 }}>Tes courses Herbalife</div>
        <div style={{ fontFamily: ANTON, fontSize: 34, lineHeight: 1, color: 'var(--text)', margin: '6px 0 4px' }}>jusqu'à <span style={{ color: 'var(--gold)' }}>−42 %</span> à vie</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>4 paliers. Plus tu fais découvrir, plus ta remise grimpe — et tu ne la perds jamais.</div>
      </div>

      {/* Barre vers palier suivant */}
      {nt && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h7l-1 8 10-12h-7z" /></svg>
            <div style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.4 }}>Plus que <span style={{ fontFamily: ANTON, fontSize: 16, color: 'var(--lime)' }}>{nt.min - finalPts}</span> pts pour <span style={{ fontWeight: 700, color: nt.accent }}>{nt.name} −{nt.pct}%</span></div>
          </div>
          <div style={{ height: 9, borderRadius: 999, background: 'var(--surface2)', overflow: 'hidden' }}><div style={{ width: `${progPct}%`, height: '100%', borderRadius: 999, background: 'linear-gradient(90deg,var(--teal),var(--lime))', transition: 'width .55s cubic-bezier(.16,1,.3,1)' }} /></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 9.5, color: 'var(--muted)', marginTop: 7 }}><span>{finalTier.name} · −{finalTier.pct}%</span><span>{nt.name} · −{nt.pct}%</span></div>
        </div>
      )}

      {/* 4 paliers */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {TIERS.map((t) => {
          const active = t.pct === finalTier.pct
          return (
            <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px', borderRadius: 14, background: active ? 'linear-gradient(135deg,color-mix(in srgb,var(--teal) 18%,var(--surface)),color-mix(in srgb,var(--lime) 10%,var(--surface)))' : 'var(--surface)', border: `1px solid ${active ? 'color-mix(in srgb,var(--teal) 50%,transparent)' : 'var(--border)'}` }}>
              <div style={{ width: 34, height: 34, flex: 'none', borderRadius: 10, background: `color-mix(in srgb,${t.accent} 18%,transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="9" r="6" /><path d="M9 14l-2 8 5-3 5 3-2-8" /></svg></div>
              <div style={{ fontFamily: ANTON, fontSize: 22, color: active ? 'var(--text)' : 'var(--gold)', minWidth: 62 }}>−{t.pct}%</div>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontFamily: SORA, fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{t.name}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>{t.sub}</div></div>
              {active && <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: 'var(--teal)', whiteSpace: 'nowrap' }}>TOI ICI</span>}
            </div>
          )
        })}
      </div>

      {/* Encart distributeur */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 13, background: 'color-mix(in srgb,var(--violet) 10%,var(--surface))', border: '1px dashed color-mix(in srgb,var(--violet) 40%,transparent)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--violet)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5L3 21l4.5-1.5M9 15l6-6M12 3l9 9-6 6-9-9z" /></svg>
        <div style={{ flex: 1 }}><div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--violet)' }}>Tu veux aller plus loin ? −42 % à −50 %</div><div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>C'est possible en passant distributeur — {coachName} t'explique tout.</div></div>
      </div>

      {/* Comment ça marche */}
      <div style={card}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--teal)', fontWeight: 600, marginBottom: 14 }}>Comment ça marche</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { n: 1, c: 'var(--teal)', t: 'Tu commandes', d: 'Chaque produit Herbalife = des points. Plus tu commandes, plus tu cumules.' },
            { n: 2, c: 'var(--lime)', t: 'Tu fais découvrir', d: "Ton entourage s'inscrit avec ton ID sponsor. Leurs commandes te rapportent aussi des points — illimité, même les amis de tes amis." },
            { n: 3, c: 'var(--violet)', t: 'Ta remise grimpe', d: 'Plus de points = palier supérieur = plus de remise. Automatique, et à vie : tu ne perds jamais ce que tu as gagné.' },
          ].map((s) => (
            <div key={s.n} style={{ display: 'flex', gap: 13 }}>
              <div style={{ width: 28, height: 28, flex: 'none', borderRadius: '50%', background: `color-mix(in srgb,${s.c} 16%,transparent)`, border: `1px solid color-mix(in srgb,${s.c} 40%,transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: ANTON, fontSize: 14, color: s.c }}>{s.n}</div>
              <div><div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{s.t}</div><div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, marginTop: 2 }}>{s.d}</div></div>
            </div>
          ))}
        </div>
      </div>

      {/* Simulateur */}
      <div style={card}>
        <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>L'effet cumulé, mois après mois</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 14 }}>Toi ce mois-ci. Tes proches qui rejoignent le mois prochain. Chaque proche ≈ <strong style={{ color: 'var(--text)' }}>+{FRIEND} pts</strong>.</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 14 }}>
          <button onClick={() => setFriends((f) => Math.max(0, f - 1))} style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border2)', color: 'var(--text)', fontSize: 22, fontWeight: 700, cursor: 'pointer', lineHeight: 1 }}>−</button>
          <div style={{ textAlign: 'center', minWidth: 120 }}><div style={{ fontFamily: ANTON, fontSize: 26, color: 'var(--lime)', lineHeight: 1 }}>{friends}</div><div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{friends === 0 ? 'juste toi' : friends === 1 ? '1 proche qui en parle' : `${friends} proches qui en parlent`}</div></div>
          <button onClick={() => setFriends((f) => Math.min(12, f + 1))} style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--lime)', border: 'none', color: '#04201b', fontSize: 22, fontWeight: 700, cursor: 'pointer', lineHeight: 1 }}>+</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {timeline.map((m) => (
            <div key={m.month} style={{ flex: 1, padding: '12px 6px', borderRadius: 12, textAlign: 'center', background: m.lastM ? 'linear-gradient(135deg,color-mix(in srgb,var(--teal) 20%,var(--surface)),color-mix(in srgb,var(--lime) 14%,var(--surface)))' : 'var(--surface2)', border: `1px solid ${m.lastM ? 'color-mix(in srgb,var(--teal) 45%,transparent)' : 'var(--border)'}` }}>
              <div style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.04em' }}>MOIS {m.month}</div>
              <div style={{ fontSize: 10, color: 'var(--dim)', margin: '1px 0 6px' }}>{m.sub}</div>
              <div style={{ fontFamily: ANTON, fontSize: 20, color: 'var(--text)', lineHeight: 1 }}>−{m.pct}%</div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: 'var(--gold)', marginTop: 4 }}>{m.pv} pts</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderRadius: 12, background: 'linear-gradient(135deg,color-mix(in srgb,var(--teal) 18%,transparent),color-mix(in srgb,var(--lime) 12%,transparent))', border: '1px solid color-mix(in srgb,var(--teal) 40%,transparent)' }}>
          <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Ta remise après 3 mois</div><div style={{ fontFamily: ANTON, fontSize: 30, color: 'var(--text)', lineHeight: 1 }}>−{finalTier.pct}%</div></div>
          <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11, color: 'var(--muted)' }}>économie</div><div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 15, color: 'var(--lime)' }}>~{saving} € / 200 €</div></div>
        </div>
        <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 8, textAlign: 'center', lineHeight: 1.5 }}>{nextTxt}</div>
      </div>

      {/* Exemple Sarah */}
      <div style={{ background: 'color-mix(in srgb,var(--gold) 8%,var(--surface))', border: '1px solid color-mix(in srgb,var(--gold) 24%,var(--border))', borderRadius: 16, padding: 16 }}>
        <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 700, marginBottom: 10 }}>Exemple · Sarah</div>
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.7 }}>Sarah démarre à <strong style={{ color: 'var(--text)' }}>Bronze −15 %</strong>. Elle parle d'Herbalife à 3 personnes (sa maman, une collègue, sa pote de running). En 1 mois → <strong style={{ color: 'var(--lime)' }}>Gold −35 %</strong>. 3 mois plus tard, son groupe est passionné → <strong style={{ color: 'var(--violet)' }}>Ambassadrice −42 % à vie</strong>.</p>
      </div>

      <button onClick={openRefer} style={{ width: '100%', minHeight: 52, borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(120deg,var(--teal),var(--lime))', color: '#04201b', fontFamily: ANTON, textTransform: 'uppercase', letterSpacing: '.02em', fontSize: 15, boxShadow: '0 10px 26px -12px var(--teal)' }}>Partager un proche à {coachName} →</button>
      <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>Donne juste un prénom + un contact. {coachName} s'occupe du reste.</div>

      {/* Modale Club VIP en 30s */}
      {showHow && (
        <div onClick={() => setShowHow(false)} style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="lb-scroll" style={{ width: '100%', maxHeight: '86%', overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 24, padding: 22, animation: 'lbRise .32s cubic-bezier(.16,1,.3,1)', boxShadow: '0 30px 70px -20px rgba(0,0,0,0.8)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: 999, background: 'color-mix(in srgb,var(--gold) 16%,transparent)', border: '1px solid color-mix(in srgb,var(--gold) 40%,transparent)', color: 'var(--gold)', fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" /></svg>Club VIP</span>
              <button onClick={() => setShowHow(false)} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer', fontSize: 15, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <h3 style={{ fontFamily: ANTON, textTransform: 'uppercase', fontSize: 25, lineHeight: 1.04, margin: '0 0 7px', color: 'var(--text)' }}>Le Club VIP en 30 secondes</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>Tu ne vends rien. Tu partages ce qui marche pour toi — et ta remise grimpe, <strong style={{ color: 'var(--gold)' }}>à vie</strong>.</p>
            <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
              {[{ p: '−15%', n: 'BRONZE', c: 'var(--bronze)' }, { p: '−25%', n: 'SILVER', c: '#B8BEC9' }, { p: '−35%', n: 'GOLD', c: 'var(--lime)' }, { p: '−42%', n: 'AMBASS.', c: 'var(--violet)' }].map((x) => (
                <div key={x.n} style={{ flex: 1, textAlign: 'center', padding: '10px 4px', borderRadius: 11, background: 'var(--surface2)', border: '1px solid var(--border)' }}><div style={{ fontFamily: ANTON, fontSize: 16, color: x.c }}>{x.p}</div><div style={{ fontFamily: MONO, fontSize: 8.5, color: 'var(--muted)', marginTop: 2 }}>{x.n}</div></div>
              ))}
            </div>
            <button onClick={openRefer} style={{ width: '100%', minHeight: 50, borderRadius: 13, border: 'none', cursor: 'pointer', background: 'linear-gradient(120deg,var(--teal),var(--lime))', color: '#04201b', fontFamily: ANTON, textTransform: 'uppercase', letterSpacing: '.02em', fontSize: 15 }}>Partager un proche →</button>
          </div>
        </div>
      )}

      {/* Feuille de parrainage — soumission réelle (submit-prospect-lead) */}
      {referOpen && (
        <div onClick={() => setReferOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 75, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, margin: '0 auto', background: 'var(--surface)', borderTop: '1px solid var(--border2)', borderRadius: '26px 26px 0 0', padding: '22px 22px calc(26px + env(safe-area-inset-bottom, 0px))', animation: 'lbSheet .3s cubic-bezier(.16,1,.3,1)' }}>
            <div style={{ width: 40, height: 4, borderRadius: 999, background: 'var(--border2)', margin: '0 auto 18px' }} />
            {referSent ? (
              <div style={{ textAlign: 'center', padding: '10px 0 6px' }}>
                <div style={{ width: 54, height: 54, margin: '0 auto 12px', borderRadius: 16, background: 'color-mix(in srgb,var(--teal) 16%,transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg></div>
                <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 17, color: 'var(--text)' }}>C'est envoyé !</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 5, lineHeight: 1.5 }}>{coachName} a reçu le contact et s'en occupe. Merci pour la confiance 🙌</div>
                <button onClick={() => setReferOpen(false)} style={{ marginTop: 18, width: '100%', minHeight: 50, borderRadius: 13, border: 'none', cursor: 'pointer', background: 'var(--surface2)', color: 'var(--text)', fontFamily: SORA, fontWeight: 700, fontSize: 14 }}>Fermer</button>
              </div>
            ) : (
              <>
                <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--teal)', fontWeight: 600 }}>Partager un proche</div>
                <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 19, color: 'var(--text)', margin: '4px 0 4px' }}>À qui penses-tu ?</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 18 }}>Un prénom + un contact (téléphone de préférence). {coachName} prend le relais, en douceur.</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
                  <input value={referName} onChange={(e) => setReferName(e.target.value)} placeholder="Prénom" style={{ width: '100%', padding: '14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 15, fontFamily: "'Inter'", outline: 'none' }} />
                  <input value={referContact} onChange={(e) => setReferContact(e.target.value)} placeholder="Téléphone ou email" style={{ width: '100%', padding: '14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 15, fontFamily: "'Inter'", outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setReferOpen(false)} style={{ flex: 'none', padding: '0 20px', minHeight: 50, borderRadius: 13, background: 'var(--surface2)', border: '1px solid var(--border2)', color: 'var(--muted)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                  <button onClick={() => void submitReferral()} disabled={referSending || !referName.trim() || !referContact.trim()} style={{ flex: 1, minHeight: 50, borderRadius: 13, border: 'none', cursor: referSending || !referName.trim() || !referContact.trim() ? 'default' : 'pointer', background: referSending || !referName.trim() || !referContact.trim() ? 'var(--surface2)' : 'linear-gradient(120deg,var(--teal),var(--lime))', color: referSending || !referName.trim() || !referContact.trim() ? 'var(--muted)' : '#04201b', fontFamily: SORA, fontWeight: 700, fontSize: 15 }}>{referSending ? 'Envoi…' : `Envoyer à ${coachName}`}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
