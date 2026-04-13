import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { blasonLogo } from '../data/visualContent'

const inp: React.CSSProperties = {
  background: '#1A1E27',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  padding: '13px 16px',
  color: '#F0EDE8',
  fontSize: 14,
  fontFamily: 'DM Sans, sans-serif',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password.trim(),
      })
      if (error) { setError(error.message); return }
      navigate('/dashboard')
    } catch {
      setError('Connexion impossible. Vérifie tes identifiants.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0B0D11', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'DM Sans, sans-serif' }}>
      {/* Ambient glow */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: '8%', top: '-8%', width: 520, height: 520, borderRadius: '50%', background: 'rgba(201,168,76,0.07)', filter: 'blur(130px)' }} />
        <div style={{ position: 'absolute', bottom: '-12%', left: '3%', width: 440, height: 440, borderRadius: '50%', background: 'rgba(45,212,191,0.05)', filter: 'blur(110px)' }} />
        <div style={{ position: 'absolute', top: '40%', left: '50%', width: 300, height: 300, borderRadius: '50%', background: 'rgba(167,139,250,0.03)', filter: 'blur(100px)', transform: 'translateX(-50%)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 24, maxWidth: 1020, width: '100%' }}>

        {/* ═══════════ PANEL GAUCHE — BRANDING ═══════════ */}
        <div style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '48px 44px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>

            {/* Logo + nom */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <img src={blasonLogo} alt="Lor'Squad" style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 17, color: '#F0EDE8', letterSpacing: '-0.3px' }}>
                  Lor'<span style={{ color: '#C9A84C' }}>Squad</span> Wellness
                </div>
              </div>
            </div>

            {/* Eyebrow */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 32, height: 2, background: '#C9A84C', borderRadius: 1 }} />
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#2DD4BF' }}>
                Outil coach professionnel
              </span>
            </div>

            {/* Headline */}
            <div>
              <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 38, color: '#F0EDE8', lineHeight: 1.08, letterSpacing: '-0.03em', margin: '0 0 20px' }}>
                L'accompagnement<br />nutrition <span style={{ color: '#2DD4BF' }}>réinventé</span>
              </h1>
              <p style={{ color: '#7A8099', fontSize: 15, lineHeight: 1.75, margin: 0, maxWidth: 400 }}>
                Bilan bien-être, body scan, suivi client et recommandations personnalisées — tout en un seul cockpit.
              </p>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 32, paddingTop: 8 }}>
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 32, fontWeight: 800, color: '#C9A84C', lineHeight: 1 }}>24+</div>
                <div style={{ fontSize: 12, color: '#7A8099', marginTop: 4 }}>Clients suivis</div>
              </div>
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 32, fontWeight: 800, color: '#2DD4BF', lineHeight: 1 }}>87</div>
                <div style={{ fontSize: 12, color: '#7A8099', marginTop: 4 }}>Bilans réalisés</div>
              </div>
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 32, fontWeight: 800, color: '#C9A84C', lineHeight: 1 }}>91%</div>
                <div style={{ fontSize: 12, color: '#7A8099', marginTop: 4 }}>Taux de suivi</div>
              </div>
            </div>
          </div>

          {/* Footer — avatars équipe */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 28, marginTop: 40 }}>
            <div style={{ display: 'flex' }}>
              {[
                { initials: 'LC', bg: '#C9A84C' },
                { initials: 'SC', bg: '#2DD4BF' },
                { initials: 'MR', bg: '#A78BFA' },
              ].map((a, i) => (
                <div key={a.initials} style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: a.bg, color: '#0B0D11',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                  border: '2px solid #13161C',
                  marginLeft: i > 0 ? -8 : 0,
                  zIndex: 3 - i,
                  position: 'relative',
                }}>
                  {a.initials}
                </div>
              ))}
            </div>
            <p style={{ fontSize: 13, color: '#7A8099', margin: 0 }}>
              Utilisé par <span style={{ color: '#F0EDE8', fontWeight: 600 }}>votre équipe</span> au quotidien
            </p>
          </div>
        </div>

        {/* ═══════════ PANEL DROIT — FORMULAIRE ═══════════ */}
        <div style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 28, color: '#F0EDE8', letterSpacing: '-0.02em', margin: '0 0 8px', lineHeight: 1.15 }}>
              Connexion<br />coach
            </h2>
            <p style={{ color: '#7A8099', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              Accédez à votre espace professionnel
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7A8099' }}>Adresse email</label>
              <input
                type="email"
                placeholder="coach@lorsquad.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="username"
                style={inp}
                onFocus={e => (e.target.style.borderColor = 'rgba(201,168,76,0.5)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7A8099' }}>Mot de passe</label>
              <input
                type="password"
                placeholder="Votre mot de passe"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                style={inp}
                onFocus={e => (e.target.style.borderColor = 'rgba(201,168,76,0.5)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
              <button type="button" style={{ alignSelf: 'flex-end', background: 'none', border: 'none', color: '#2DD4BF', fontSize: 12, cursor: 'pointer', fontWeight: 500, padding: 0 }}>
                Mot de passe oublié ?
              </button>
            </div>

            {/* Error */}
            {error && (
              <div style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.2)', borderRadius: 10, padding: '10px 14px', color: '#FB7185', fontSize: 13 }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: loading ? 'rgba(201,168,76,0.7)' : '#C9A84C',
                color: '#0B0D11',
                border: 'none',
                borderRadius: 10,
                padding: '14px 20px',
                fontFamily: 'Syne, sans-serif',
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.15s',
              }}
            >
              {loading && (
                <span style={{ width: 16, height: 16, border: '2px solid rgba(11,13,17,0.3)', borderTop: '2px solid #0B0D11', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
              )}
              Accéder à mon espace
            </button>

            {/* Separator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '4px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
              <span style={{ fontSize: 11, color: '#4A5068', fontWeight: 500, letterSpacing: '0.1em' }}>OU</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
            </div>

            {/* Google button */}
            <button
              type="button"
              style={{
                width: '100%',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10,
                padding: '12px 20px',
                color: '#7A8099',
                fontSize: 13,
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#F0EDE8' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#7A8099' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continuer avec Google
            </button>
          </form>

          {/* Footer */}
          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <p style={{ fontSize: 13, color: '#7A8099', margin: 0 }}>
              Pas encore de compte ? <span style={{ color: '#C9A84C', fontWeight: 600, cursor: 'pointer' }}>Contacter l'admin</span>
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2DD4BF' }} />
              <span style={{ fontSize: 11, color: '#4A5068' }}>Connexion sécurisée — données chiffrées</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
