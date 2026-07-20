// ============================================================================
// PWA v2 — Écrans d'entrée (chantier refonte identité PWA client 2026-07)
// ----------------------------------------------------------------------------
// Landing (choix de rôle), Login (email/mot de passe visuel), Onboarding
// (4 slides). Dans le flux réel, le client entre par lien magique (token) →
// direct dans l'app ; ces écrans sont atteints via « Déconnexion ». Le Login
// est visuel pour l'instant (auth réelle = passe ultérieure) : « valider »
// rouvre simplement l'espace (le token de l'URL reste valide).
// ============================================================================
import { useState } from 'react'

const ANTON = "'Anton', sans-serif"
const SORA = "'Sora', sans-serif"
const MONO = "'JetBrains Mono', monospace"

// ─── Landing ───────────────────────────────────────────────────────────────
export function LandingScreen({ onChooseClient, onChooseDistrib }: { onChooseClient: () => void; onChooseDistrib: () => void }) {
  const roles = [
    { title: 'Client suivi par un coach', sub: 'Accès à mon programme perso', accent: 'var(--teal)', onClick: onChooseClient, icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg> },
    { title: "Distributeur de l'équipe", sub: 'Accès à ma tour de contrôle', accent: 'var(--lime)', onClick: onChooseDistrib, icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" /></svg> },
    { title: "Je veux rejoindre l'aventure", sub: 'Découvrir le business La Base 360', accent: 'var(--violet)', onClick: onChooseClient, icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--violet)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z" /></svg> },
  ]
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 95, background: 'var(--bg)', overflowY: 'auto' }} className="lb-scroll">
      <div style={{ position: 'relative', minHeight: '100%', padding: 'calc(env(safe-area-inset-top,0px) + 60px) 24px 30px', display: 'flex', flexDirection: 'column', gap: 26, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-8%', left: '-16%', width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle,var(--lime),transparent 70%)', opacity: 0.14, filter: 'blur(70px)', animation: 'lbFloat 22s ease-in-out infinite alternate', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '24%', right: '-20%', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle,var(--teal),transparent 70%)', opacity: 0.13, filter: 'blur(70px)', animation: 'lbFloat2 26s ease-in-out infinite alternate', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 15, animation: 'lbRise .7s cubic-bezier(.16,1,.3,1) both' }}>
          <div style={{ position: 'relative', width: 108, height: 108 }}>
            <div style={{ position: 'absolute', inset: -7, borderRadius: '50%', background: 'conic-gradient(from 0deg,transparent,rgba(197,248,42,0.5) 25%,rgba(45,212,191,0.6) 50%,rgba(167,139,250,0.5) 75%,transparent)', animation: 'lbSpin 6s linear infinite', opacity: 0.75 }} />
            <div style={{ position: 'absolute', inset: -3, borderRadius: '50%', background: 'var(--bg)' }} />
            <div style={{ position: 'relative', width: 108, height: 108, borderRadius: 30, background: 'radial-gradient(circle at 50% 38%,#12160f,#0a0c0a)', border: '1px solid rgba(197,248,42,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 34px -6px rgba(197,248,42,0.4)' }}>
              <svg width="60" height="60" viewBox="0 0 60 60" fill="none"><circle cx="30" cy="30" r="21" stroke="var(--teal)" strokeWidth="2.4" opacity="0.9" /><ellipse cx="30" cy="30" rx="21" ry="8" stroke="var(--lime)" strokeWidth="2.4" /><circle cx="30" cy="9" r="3.4" fill="var(--lime)" /></svg>
            </div>
          </div>
          <span style={{ padding: '6px 18px', borderRadius: 100, background: 'rgba(197,248,42,0.06)', border: '.5px solid rgba(197,248,42,0.2)', fontFamily: MONO, fontSize: 9.5, fontWeight: 600, letterSpacing: '.3em', textTransform: 'uppercase', color: 'var(--muted)', whiteSpace: 'nowrap' }}>★ Since 2022 ★</span>
        </div>

        <div style={{ position: 'relative', textAlign: 'center', animation: 'lbRise .8s cubic-bezier(.16,1,.3,1) .15s both' }}>
          <div style={{ fontFamily: MONO, textTransform: 'uppercase', fontWeight: 600, color: 'var(--muted)', fontSize: 11, letterSpacing: '.18em', marginBottom: 12 }}>Bienvenue sur</div>
          <h1 style={{ fontFamily: ANTON, textTransform: 'uppercase', fontSize: 52, lineHeight: 0.92, margin: 0, color: 'var(--text)' }}>La Base <span style={{ background: 'linear-gradient(120deg,var(--teal),var(--lime))', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>360</span></h1>
          <p style={{ margin: '16px 0 0', fontSize: 16, lineHeight: 1.5, color: 'var(--muted)' }}>Ta transformation commence ici.</p>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--dim)', letterSpacing: '.02em' }}>The wellness nutrition club</p>
        </div>

        <div style={{ position: 'relative', textAlign: 'center', animation: 'lbRise .8s ease .3s both' }}>
          <span style={{ fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--dim)', fontWeight: 700, display: 'block', marginBottom: 11 }}>Tu es ?</span>
          <div style={{ width: 38, height: 2, borderRadius: 999, margin: '0 auto', background: 'linear-gradient(90deg,transparent,var(--lime) 30%,var(--teal) 50%,var(--violet) 70%,transparent)' }} />
        </div>

        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 11, animation: 'lbRise .8s ease .4s both' }}>
          {roles.map((r) => (
            <button key={r.title} onClick={r.onClick} style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 16, cursor: 'pointer' }}>
              <div style={{ width: 44, height: 44, flex: 'none', borderRadius: 13, background: `color-mix(in srgb,${r.accent} 14%,transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{r.icon}</div>
              <div style={{ flex: 1 }}><div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{r.title}</div><div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{r.sub}</div></div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={r.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', textAlign: 'center', fontSize: 11, color: 'var(--dim)', marginTop: 'auto', paddingTop: 8 }}>Propulsé par <span style={{ fontWeight: 600, background: 'linear-gradient(120deg,var(--teal),var(--lime))', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>La Base 360</span> · Verdun · France</div>
      </div>
    </div>
  )
}

// ─── Login ───────────────────────────────────────────────────────────────
export function LoginScreen({ role, defaultEmail, onBack, onSubmit }: { role: 'client' | 'distributeur'; defaultEmail?: string | null; onBack: () => void; onSubmit: () => void }) {
  const [showPw, setShowPw] = useState(false)
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 95, background: 'var(--bg)', overflowY: 'auto' }} className="lb-scroll">
      <div style={{ position: 'relative', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'relative', overflow: 'hidden', padding: 'calc(env(safe-area-inset-top,0px) + 54px) 24px 30px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
          <div style={{ position: 'absolute', top: '-30%', left: '-14%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle,var(--lime),transparent 70%)', opacity: 0.16, filter: 'blur(70px)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-40%', right: '-12%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle,var(--teal),transparent 70%)', opacity: 0.14, filter: 'blur(70px)', pointerEvents: 'none' }} />
          <button onClick={onBack} style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top,0px) + 46px)', left: 20, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 13px', borderRadius: 999, border: '1px solid var(--border)', background: 'color-mix(in srgb,var(--surface) 70%,transparent)', color: 'var(--muted)', fontFamily: MONO, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>← Accueil</button>
          <div style={{ position: 'relative', fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--lime)', display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 18 }}><span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--lime)', boxShadow: '0 0 8px var(--lime)' }} />Depuis 2022</div>
          <h1 style={{ position: 'relative', fontFamily: ANTON, textTransform: 'uppercase', fontSize: 44, lineHeight: 0.92, margin: 0, color: 'var(--text)' }}>La Base<br /><span style={{ color: 'var(--lime)' }}>360</span></h1>
        </div>
        <div style={{ flex: 1, padding: '30px 24px 26px' }}>
          <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>Connexion · {role === 'distributeur' ? 'DISTRIBUTEUR' : 'CLIENT'}</div>
          <h2 style={{ fontFamily: ANTON, textTransform: 'uppercase', fontSize: 27, lineHeight: 1.02, margin: '0 0 8px', color: 'var(--text)' }}>Ton espace t'attend</h2>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--muted)' }}>Identifie-toi pour ouvrir ton espace.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <input type="email" defaultValue={defaultEmail ?? ''} placeholder="ton.email@exemple.com" style={{ width: '100%', padding: '19px 14px 8px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 15, fontFamily: "'Inter'", outline: 'none' }} />
              <label style={{ position: 'absolute', left: 14, top: 7, fontFamily: MONO, fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--lime)', pointerEvents: 'none' }}>Adresse email</label>
            </div>
            <div style={{ position: 'relative' }}>
              <input type={showPw ? 'text' : 'password'} defaultValue="" style={{ width: '100%', padding: '19px 76px 8px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 15, fontFamily: "'Inter'", outline: 'none' }} />
              <label style={{ position: 'absolute', left: 14, top: 7, fontFamily: MONO, fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--lime)', pointerEvents: 'none' }}>Mot de passe</label>
              <button onClick={() => setShowPw((v) => !v)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dim)', fontFamily: MONO, fontSize: 9.5, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', padding: '6px 8px' }}>{showPw ? 'Masquer' : 'Afficher'}</button>
            </div>
          </div>
          <button onClick={onSubmit} style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, width: '100%', minHeight: 52, borderRadius: 12, border: 'none', cursor: 'pointer', background: 'var(--lime)', color: '#0a0c0a', fontFamily: ANTON, textTransform: 'uppercase', letterSpacing: '.02em', fontSize: 16, boxShadow: '0 4px 18px rgba(197,248,42,0.28)' }}>Ouvrir mon espace<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg></button>
          <button onClick={onSubmit} style={{ display: 'block', width: '100%', marginTop: 15, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontFamily: MONO, fontSize: 11, letterSpacing: '.04em', textAlign: 'center' }}>Mot de passe oublié ? <strong style={{ color: 'var(--text)', fontWeight: 600 }}>Recevoir un lien</strong></button>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 22, fontFamily: MONO, fontSize: 11, color: 'var(--dim)', letterSpacing: '.03em' }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>Connexion sécurisée · données chiffrées</div>
        </div>
      </div>
    </div>
  )
}

// ─── Onboarding (4 slides) ─────────────────────────────────────────────────
const ONB = [
  { eyebrow: 'Ton espace', title: 'Tout ton suivi, au même endroit', text: 'Bilans, mensurations, courbe de poids et messages avec ton coach — ta transformation en un coup d’œil.', accent: 'var(--teal)', icon: 'chart' },
  { eyebrow: 'Ta régularité', title: 'Avance, et gagne des surprises', text: 'Chaque bilan, mensuration ou humeur te fait progresser. À chaque palier, une surprise de ton coach t’attend. Aucun achat requis.', accent: 'var(--lime)', icon: 'zap' },
  { eyebrow: 'Club VIP', title: 'Tes courses, jusqu’à −42 % à vie', text: 'Tu ne vends rien : tu partages ce qui marche pour toi, et ta remise Herbalife grimpe. Un volet à part, séparé de ta progression.', accent: 'var(--gold)', icon: 'gem' },
  { eyebrow: 'Ton assistante', title: 'Noaly répond, jour et nuit', text: 'Une recette, une info produit, une fringale, décaler un RDV… demande à Noaly, à tout moment.', accent: 'var(--teal)', icon: 'spark' },
]
function onbIcon(icon: string, accent: string) {
  if (icon === 'chart') return <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l2-7 4 14 2-7h6" /></svg>
  if (icon === 'zap') return <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h7l-1 8 10-12h-7z" /></svg>
  if (icon === 'gem') return <svg width="50" height="50" viewBox="0 0 24 24" fill={accent}><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" /></svg>
  return <svg width="52" height="52" viewBox="0 0 24 24" fill={accent}><path d="M12 2l1.9 5.1L19 9l-5.1 1.9L12 16l-1.9-5.1L5 9l5.1-1.9z" /></svg>
}
export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const o = ONB[step]
  const last = step === ONB.length - 1
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 95, background: 'var(--bg)' }}>
      <div style={{ position: 'relative', minHeight: '100%', display: 'flex', flexDirection: 'column', padding: 'calc(env(safe-area-inset-top,0px) + 52px) 26px 30px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-6%', left: '-18%', width: 320, height: 320, borderRadius: '50%', background: `radial-gradient(circle,${o.accent},transparent 70%)`, opacity: 0.14, filter: 'blur(70px)', pointerEvents: 'none', transition: 'background .5s' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {ONB.map((_, i) => <span key={i} style={{ height: 7, width: i === step ? 24 : 7, borderRadius: 999, background: i === step ? o.accent : 'var(--border2)', transition: 'width .3s cubic-bezier(.16,1,.3,1),background .3s' }} />)}
          </div>
          <button onClick={onDone} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.04em', padding: 6 }}>Passer</button>
        </div>
        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 24 }}>
          <div style={{ position: 'relative', width: 112, height: 112 }}>
            <div style={{ position: 'absolute', inset: -7, borderRadius: 34, background: `conic-gradient(from 0deg,transparent,${o.accent} 40%,transparent)`, animation: 'lbSpin 7s linear infinite', opacity: 0.5 }} />
            <div style={{ position: 'absolute', inset: -2, borderRadius: 30, background: 'var(--bg)' }} />
            <div style={{ position: 'relative', width: 112, height: 112, borderRadius: 30, background: `color-mix(in srgb,${o.accent} 12%,var(--surface))`, border: `1px solid color-mix(in srgb,${o.accent} 30%,transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .4s,border-color .4s' }}>{onbIcon(o.icon, o.accent)}</div>
          </div>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: o.accent, marginBottom: 14, transition: 'color .4s' }}>{o.eyebrow}</div>
            <h1 style={{ fontFamily: ANTON, textTransform: 'uppercase', fontSize: 32, lineHeight: 1.04, margin: 0, color: 'var(--text)' }}>{o.title}</h1>
            <p style={{ margin: '16px auto 0', maxWidth: 300, fontSize: 14.5, lineHeight: 1.6, color: 'var(--muted)' }}>{o.text}</p>
          </div>
        </div>
        <button onClick={() => (last ? onDone() : setStep((s) => s + 1))} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, width: '100%', minHeight: 54, borderRadius: 14, border: 'none', cursor: 'pointer', background: 'var(--lime)', color: '#0a0c0a', fontFamily: ANTON, textTransform: 'uppercase', letterSpacing: '.02em', fontSize: 16, boxShadow: '0 6px 22px -6px rgba(197,248,42,0.4)' }}>{last ? "C'est parti" : 'Continuer'}<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg></button>
      </div>
    </div>
  )
}
