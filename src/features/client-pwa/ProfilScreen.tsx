// ============================================================================
// PWA v2 — Profil / Réglages (chantier refonte identité PWA client 2026-07)
// ----------------------------------------------------------------------------
// Overlay plein écran depuis l'avatar du header. Identité, mes infos, réglages
// (notif push/email, apparence/thème), compte (aide, confidentialité,
// déconnexion). Les toggles de notif sont en état local pour l'instant
// (persistance sur les préférences client dans une passe ultérieure).
// ============================================================================
import { useState } from 'react'

const ANTON = "'Anton', sans-serif"
const SORA = "'Sora', sans-serif"
const MONO = "'JetBrains Mono', monospace"

export interface ProfilScreenProps {
  initials: string
  clientName: string
  email?: string | null
  ageYears: number | null
  heightCm?: number | null
  objective?: string | null
  startDate?: string | null
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  onBack: () => void
  onOpenTour: () => void
  onLogout: () => void
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ width: 44, height: 26, borderRadius: 999, background: on ? 'var(--teal)' : 'var(--surface2)', border: on ? 'none' : '1px solid var(--border2)', cursor: 'pointer', position: 'relative', transition: 'background .25s', flex: 'none' }}>
      <span style={{ position: 'absolute', top: 3, left: 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transform: on ? 'translateX(18px)' : 'translateX(0)', transition: 'transform .25s' }} />
    </button>
  )
}

export function ProfilScreen({ initials, clientName, email, ageYears, heightCm, objective, startDate, theme, onToggleTheme, onBack, onOpenTour, onLogout }: ProfilScreenProps) {
  const [notifPush, setNotifPush] = useState(true)
  const [notifEmail, setNotifEmail] = useState(false)

  const sectionLabel = { fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: 'var(--muted)', fontWeight: 600, margin: '0 2px 9px' }
  const listCard = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' as const }
  const row = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 15px', borderBottom: '1px solid var(--border)' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'var(--bg)', overflowY: 'auto' }} className="lb-scroll pwa2-overlay">
      <div style={{ position: 'relative', minHeight: '100%', padding: 'calc(env(safe-area-inset-top,0px) + 20px) 18px 34px', display: 'flex', flexDirection: 'column', gap: 16, animation: 'lbRise .4s ease both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ width: 36, height: 36, flex: 'none', borderRadius: 11, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg></button>
          <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 17, color: 'var(--text)' }}>Mon profil</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '6px 0 2px', textAlign: 'center' }}>
          <div style={{ width: 74, height: 74, borderRadius: '50%', background: 'linear-gradient(140deg,var(--teal),var(--teal-d))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: ANTON, fontSize: 26, color: '#04201b' }}>{initials}</div>
          <div><div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 19, color: 'var(--text)' }}>{clientName}</div>{email && <div style={{ fontFamily: MONO, fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{email}</div>}</div>
        </div>

        <div>
          <div style={sectionLabel}>Mes infos</div>
          <div style={listCard}>
            {ageYears != null && <div style={row}><span style={{ fontSize: 13, color: 'var(--muted)' }}>Âge</span><span style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 600 }}>{ageYears} ans</span></div>}
            {heightCm != null && <div style={row}><span style={{ fontSize: 13, color: 'var(--muted)' }}>Taille</span><span style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 600 }}>{heightCm} cm</span></div>}
            {objective && <div style={row}><span style={{ fontSize: 13, color: 'var(--muted)' }}>Objectif</span><span style={{ fontSize: 13.5, color: 'var(--teal)', fontWeight: 700 }}>{objective}</span></div>}
            <div style={{ ...row, borderBottom: 'none' }}><span style={{ fontSize: 13, color: 'var(--muted)' }}>Départ du suivi</span><span style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 600 }}>{startDate || '—'}</span></div>
          </div>
        </div>

        <div>
          <div style={sectionLabel}>Réglages</div>
          <div style={listCard}>
            <div style={row}><div><div style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 600 }}>Notifications push</div><div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>Rappels, RDV, niveaux</div></div><Toggle on={notifPush} onClick={() => setNotifPush((v) => !v)} /></div>
            <div style={row}><div><div style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 600 }}>Emails & résumés</div><div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>Bilan mensuel par email</div></div><Toggle on={notifEmail} onClick={() => setNotifEmail((v) => !v)} /></div>
            <button onClick={onToggleTheme} style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 15px', background: 'none', border: 'none', cursor: 'pointer' }}><span style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 600 }}>Apparence</span><span style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 600 }}>{theme === 'dark' ? '☾ Sombre' : '☀ Clair'}</span></button>
          </div>
        </div>

        <div>
          <div style={sectionLabel}>Compte</div>
          <div style={listCard}>
            <button onClick={onOpenTour} style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 15px', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}><span style={{ fontSize: 13.5, color: 'var(--text)' }}>Aide & tour de l'app</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg></button>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 15px', borderBottom: '1px solid var(--border)' }}><span style={{ fontSize: 13.5, color: 'var(--text)' }}>Confidentialité & données</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg></div>
            <button onClick={onLogout} style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, padding: '13px 15px', background: 'none', border: 'none', cursor: 'pointer' }}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--coral)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg><span style={{ fontSize: 13.5, color: 'var(--coral)', fontWeight: 600 }}>Déconnexion</span></button>
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--dim)', marginTop: 'auto', paddingTop: 8 }}>La Base 360 · v2 · Verdun · France</div>
      </div>
    </div>
  )
}
